import { League } from '../Players/models/league.enum';
import { Position } from '../Players/models/position.enum';
import {
  FixtureInfo,
  LeagueSnapshot,
  PlayerRecord,
} from '../Players/domain';

/**
 * Expected-points model.
 *
 * For every fixture in a gameweek a player's points are estimated from two
 * independent views and blended:
 *
 *  1. An event model: appearance points + expected goal/assist points
 *     (xG/xA per 90 where available, shrunk actual output otherwise) scaled by
 *     the opponent's defence, plus clean-sheet points from a Poisson estimate
 *     of goals conceded, plus saves and bonus.
 *  2. A track-record model: points per appearance blended with recent form,
 *     scaled by fixture difficulty.
 *
 * The result is multiplied by the probability that the player is available
 * and starts. Team attack/defence ratings come from finished fixtures and are
 * shrunk towards the league average so small samples do not dominate.
 */

export type FixtureView = {
  fixture: FixtureInfo;
  gameweek: number;
  opponentId: string;
  opponent: string;
  home: boolean;
  /** 1 (easiest) to 5 (hardest). */
  difficulty: number;
};

export type PlayerProjection = {
  player: PlayerRecord;
  /** Weighted expected points across the horizon. */
  points: number;
  /** Fixtures in the target gameweek. */
  fixtures: FixtureView[];
  playProbability: number;
  reasons: string[];
};

type TeamRating = {
  attack: number;
  defence: number;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
};

export type ModelContext = {
  snapshot: LeagueSnapshot;
  ratings: Map<string, TeamRating>;
  averageGoals: number;
  fixturesByTeamAndGameweek: Map<string, FixtureView[]>;
};

const SHRINKAGE_GAMES = 5;
const DEFAULT_AVERAGE_GOALS = 1.4;
const HORIZON_DECAY = 0.9;
const HOME_ATTACK_BOOST = 1.1;
const AWAY_ATTACK_PENALTY = 0.9;

const GOAL_POINTS: Record<Position, number> = {
  [Position.GK]: 6,
  [Position.DEF]: 6,
  [Position.MID]: 5,
  [Position.FWD]: 4,
};

const CLEAN_SHEET_POINTS: Record<Position, number> = {
  [Position.GK]: 4,
  [Position.DEF]: 4,
  [Position.MID]: 1,
  [Position.FWD]: 0,
};

/** Priors (per 90) used to stabilise goal and assist rates for low-minute players. */
const GOAL_PRIOR: Record<Position, number> = {
  [Position.GK]: 0,
  [Position.DEF]: 0.04,
  [Position.MID]: 0.12,
  [Position.FWD]: 0.3,
};

const ASSIST_PRIOR: Record<Position, number> = {
  [Position.GK]: 0.01,
  [Position.DEF]: 0.06,
  [Position.MID]: 0.12,
  [Position.FWD]: 0.1,
};

const round = (value: number, places = 2) =>
  Math.round(value * 10 ** places) / 10 ** places;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? '' : 's'}`;

function keyFor(teamId: string, gameweek: number) {
  return `${teamId}:${gameweek}`;
}

function strengthToDifficulty(strength: number): number {
  if (strength < 0.7) return 1;
  if (strength < 0.9) return 2;
  if (strength < 1.15) return 3;
  if (strength < 1.45) return 4;
  return 5;
}

export function buildModelContext(snapshot: LeagueSnapshot): ModelContext {
  const totals = new Map<string, { gf: number; ga: number; played: number }>();
  let goals = 0;
  let matches = 0;

  for (const fixture of snapshot.fixtures) {
    if (
      !fixture.finished ||
      fixture.homeScore === null ||
      fixture.awayScore === null
    ) {
      continue;
    }

    matches += 1;
    goals += fixture.homeScore + fixture.awayScore;

    const home = totals.get(fixture.homeTeamId) ?? { gf: 0, ga: 0, played: 0 };
    home.gf += fixture.homeScore;
    home.ga += fixture.awayScore;
    home.played += 1;
    totals.set(fixture.homeTeamId, home);

    const away = totals.get(fixture.awayTeamId) ?? { gf: 0, ga: 0, played: 0 };
    away.gf += fixture.awayScore;
    away.ga += fixture.homeScore;
    away.played += 1;
    totals.set(fixture.awayTeamId, away);
  }

  const averageGoals =
    matches > 0 ? goals / (2 * matches) : DEFAULT_AVERAGE_GOALS;

  const ratings = new Map<string, TeamRating>();

  for (const teamId of snapshot.teams.keys()) {
    const total = totals.get(teamId) ?? { gf: 0, ga: 0, played: 0 };
    const prior = SHRINKAGE_GAMES * averageGoals;

    ratings.set(teamId, {
      attack:
        (total.gf + prior) / (total.played + SHRINKAGE_GAMES) / averageGoals,
      defence:
        (total.ga + prior) / (total.played + SHRINKAGE_GAMES) / averageGoals,
      played: total.played,
      goalsFor: total.gf,
      goalsAgainst: total.ga,
    });
  }

  const fixturesByTeamAndGameweek = new Map<string, FixtureView[]>();

  const addView = (
    teamId: string,
    opponentId: string,
    home: boolean,
    fixture: FixtureInfo,
    officialDifficulty: number | null,
  ) => {
    const opponent = ratings.get(opponentId);
    const difficulty =
      officialDifficulty ??
      strengthToDifficulty(
        opponent ? opponent.attack / opponent.defence : 1,
      );

    const view: FixtureView = {
      fixture,
      gameweek: fixture.gameweek,
      opponentId,
      opponent: snapshot.teams.get(opponentId)?.shortName ?? 'TBC',
      home,
      difficulty,
    };

    const key = keyFor(teamId, fixture.gameweek);
    fixturesByTeamAndGameweek.set(key, [
      ...(fixturesByTeamAndGameweek.get(key) ?? []),
      view,
    ]);
  };

  for (const fixture of snapshot.fixtures) {
    addView(
      fixture.homeTeamId,
      fixture.awayTeamId,
      true,
      fixture,
      fixture.homeDifficulty,
    );
    addView(
      fixture.awayTeamId,
      fixture.homeTeamId,
      false,
      fixture,
      fixture.awayDifficulty,
    );
  }

  return { snapshot, ratings, averageGoals, fixturesByTeamAndGameweek };
}

export function fixturesFor(
  context: ModelContext,
  teamId: string,
  gameweek: number,
): FixtureView[] {
  return context.fixturesByTeamAndGameweek.get(keyFor(teamId, gameweek)) ?? [];
}

export function teamRating(context: ModelContext, teamId: string): TeamRating {
  return (
    context.ratings.get(teamId) ?? {
      attack: 1,
      defence: 1,
      played: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    }
  );
}

/** Probability that the player starts a match, given they are available. */
function startRate(context: ModelContext, player: PlayerRecord): number {
  const played = teamRating(context, player.teamId).played;

  let rate: number;

  if (played === 0) {
    rate = 0.6;
  } else if (player.starts !== null) {
    rate = player.starts / played;
  } else {
    rate = player.minutes / (85 * played);
  }

  rate = clamp(rate, 0, 1);

  if (player.startLikelihood !== null) {
    rate = Math.min(rate, player.startLikelihood);
  }

  return rate;
}

function appearances(context: ModelContext, player: PlayerRecord): number {
  if (player.starts !== null && player.starts > 0) {
    return player.starts;
  }

  return Math.max(player.minutes / 75, 0);
}

function perStartPoints(
  context: ModelContext,
  player: PlayerRecord,
  view: FixtureView,
): number {
  const own = teamRating(context, player.teamId);
  const opponent = teamRating(context, view.opponentId);
  const nineties = player.minutes / 90;
  const position = player.position;

  const actualGoals90 =
    (player.goals + GOAL_PRIOR[position] * 3) / (nineties + 3);
  const actualAssists90 =
    (player.assists + ASSIST_PRIOR[position] * 3) / (nineties + 3);

  const goals90 =
    player.expectedGoalsPer90 !== null && nineties >= 3
      ? 0.7 * player.expectedGoalsPer90 + 0.3 * actualGoals90
      : actualGoals90;

  const assists90 =
    player.expectedAssistsPer90 !== null && nineties >= 3
      ? 0.7 * player.expectedAssistsPer90 + 0.3 * actualAssists90
      : actualAssists90;

  const homeAttack = view.home ? HOME_ATTACK_BOOST : AWAY_ATTACK_PENALTY;
  const homeDefence = view.home ? AWAY_ATTACK_PENALTY : HOME_ATTACK_BOOST;

  const expectedMinutesShare = 82 / 90;

  const attackPoints =
    (goals90 * GOAL_POINTS[position] + assists90 * 3) *
    expectedMinutesShare *
    opponent.defence *
    homeAttack;

  const goalsAgainst =
    context.averageGoals * opponent.attack * own.defence * homeDefence;
  const cleanSheetProbability = Math.exp(-goalsAgainst);

  let defencePoints = cleanSheetProbability * CLEAN_SHEET_POINTS[position];

  if (position === Position.GK || position === Position.DEF) {
    defencePoints -= goalsAgainst / 2;
  }

  const games = Math.max(appearances(context, player), 1);
  const savePoints =
    position === Position.GK && nineties > 0 ? player.saves / nineties / 3 : 0;
  const bonusPoints = player.bonus / games;

  const eventModel = 2 + attackPoints + defencePoints + savePoints + bonusPoints;

  const baseline =
    player.form > 0
      ? 0.5 * player.pointsPerGame + 0.5 * player.form
      : player.pointsPerGame;

  const fixtureMultiplier = clamp(
    1 + (3 - view.difficulty) * 0.08 + (view.home ? 0.04 : -0.04),
    0.65,
    1.35,
  );

  const trackRecord = baseline * fixtureMultiplier;

  // UEFA scoring rewards many extra actions the event model does not see, so
  // the track record gets more weight there.
  const eventWeight =
    context.snapshot.league === League.CHAMPIONS_LEAGUE ? 0.4 : 0.6;

  // Players with very little playing time have unreliable averages.
  const sampleWeight = clamp(nineties / 4, 0.25, 1);
  const blendedTrack = trackRecord * sampleWeight + eventModel * (1 - sampleWeight);

  return Math.max(
    0,
    eventWeight * eventModel + (1 - eventWeight) * blendedTrack,
  );
}

function expectedForGameweek(
  context: ModelContext,
  player: PlayerRecord,
  gameweek: number,
  isNextRound: boolean,
): { points: number; fixtures: FixtureView[]; playProbability: number } {
  const fixtures = fixturesFor(context, player.teamId, gameweek);
  const starts = startRate(context, player);

  // Injury news is about the next round; further ahead, assume partial recovery.
  const availability = isNextRound
    ? player.availability
    : player.availability + (1 - player.availability) * 0.5;

  const playProbability = availability * starts;
  const cameoProbability = availability * (1 - starts) * 0.5;

  let points = 0;

  for (const view of fixtures) {
    points +=
      playProbability * perStartPoints(context, player, view) +
      cameoProbability * 1;
  }

  return { points, fixtures, playProbability };
}

function buildReasons(
  context: ModelContext,
  player: PlayerRecord,
  fixtures: FixtureView[],
  playProbability: number,
): string[] {
  const reasons: string[] = [];

  if (fixtures.length === 0) {
    reasons.push('No fixture this gameweek');
  } else if (fixtures.length > 1) {
    reasons.push(`Double gameweek: ${fixtures.length} fixtures`);
  }

  for (const view of fixtures) {
    reasons.push(
      `${view.home ? 'Home' : 'Away'} vs ${view.opponent} (difficulty ${view.difficulty}/5)`,
    );
  }

  if (player.form > 0) {
    reasons.push(`Form ${player.form.toFixed(1)}, ${player.pointsPerGame.toFixed(1)} pts per game`);
  }

  if (player.expectedGoalsPer90 !== null && player.expectedAssistsPer90 !== null) {
    const xgi = player.expectedGoalsPer90 + player.expectedAssistsPer90;
    if (xgi >= 0.3) {
      reasons.push(`xGI ${xgi.toFixed(2)} per 90`);
    }
  } else if (player.goals + player.assists > 0) {
    reasons.push(
      `${plural(player.goals, 'goal')}, ${plural(player.assists, 'assist')} this season`,
    );
  }

  if (
    (player.position === Position.GK || player.position === Position.DEF) &&
    fixtures.length > 0
  ) {
    const own = teamRating(context, player.teamId);
    const opponent = teamRating(context, fixtures[0].opponentId);
    const homeDefence = fixtures[0].home ? AWAY_ATTACK_PENALTY : HOME_ATTACK_BOOST;
    const probability = Math.exp(
      -context.averageGoals * opponent.attack * own.defence * homeDefence,
    );
    reasons.push(`${Math.round(probability * 100)}% clean sheet chance`);
  }

  if (player.availability < 1) {
    reasons.push(
      `${Math.round(player.availability * 100)}% chance of playing${player.news ? `: ${player.news}` : ''}`,
    );
  } else if (playProbability < 0.5 && fixtures.length > 0) {
    reasons.push('Rotation risk: starts less than half of matches');
  }

  return reasons;
}

/**
 * Projects expected points for every player for the target gameweek, summing
 * over `horizon` gameweeks (decayed) when planning further ahead.
 */
export function projectPlayers(
  context: ModelContext,
  gameweek: number,
  horizon = 1,
): PlayerProjection[] {
  const { snapshot } = context;
  const maxGameweek = Math.max(...snapshot.gameweeks.map((item) => item.id));
  const nextRound = snapshot.defaultGameweek;

  return snapshot.players.map((player) => {
    let points = 0;
    let targetFixtures: FixtureView[] = [];
    let targetPlayProbability = 0;

    for (let offset = 0; offset < horizon; offset += 1) {
      const week = gameweek + offset;
      if (week > maxGameweek) break;

      const result = expectedForGameweek(
        context,
        player,
        week,
        week === nextRound,
      );

      points += result.points * HORIZON_DECAY ** offset;

      if (offset === 0) {
        targetFixtures = result.fixtures;
        targetPlayProbability = result.playProbability;
      }
    }

    // Lean slightly on the provider's own estimate for the immediate round.
    if (
      horizon === 1 &&
      gameweek === nextRound &&
      player.providerExpectedPoints !== null
    ) {
      points = 0.8 * points + 0.2 * player.providerExpectedPoints;
    }

    return {
      player,
      points: round(points),
      fixtures: targetFixtures,
      playProbability: round(targetPlayProbability),
      reasons: buildReasons(
        context,
        player,
        targetFixtures,
        targetPlayProbability,
      ),
    };
  });
}
