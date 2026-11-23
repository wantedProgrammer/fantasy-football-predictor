import { League } from '../models/league.enum';
import { Position } from '../models/position.enum';
import {
  FixtureInfo,
  GameweekInfo,
  LeagueSnapshot,
  PlayerRecord,
  STANDARD_POSITION_RULES,
  TeamInfo,
} from '../domain';
import { getJson, toNullableNumber, toNumber } from './http';

const BOOTSTRAP_URL = 'https://fantasy.premierleague.com/api/bootstrap-static/';
const FIXTURES_URL = 'https://fantasy.premierleague.com/api/fixtures/';
const ELEMENT_SUMMARY_URL =
  'https://fantasy.premierleague.com/api/element-summary/';

type FplTeam = {
  id: number;
  name: string;
  short_name: string;
};

type FplEvent = {
  id: number;
  name: string;
  deadline_time: string | null;
  is_current: boolean;
  is_next: boolean;
  finished: boolean;
};

type FplElement = {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  total_points: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  minutes: number;
  starts?: number;
  points_per_game: string;
  form: string;
  expected_goals_per_90?: number | string;
  expected_assists_per_90?: number | string;
  bonus: number;
  saves: number;
  selected_by_percent: string;
  status: string;
  chance_of_playing_next_round: number | null;
  news: string;
  ep_next: string | null;
  transfers_in_event: number;
  transfers_out_event: number;
  removed?: boolean;
};

type FplBootstrap = {
  teams: FplTeam[];
  events: FplEvent[];
  elements: FplElement[];
  game_settings?: {
    squad_total_spend?: number;
    squad_team_limit?: number;
    squad_squadsize?: number;
  };
};

type FplFixture = {
  id: number;
  event: number | null;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  team_h_difficulty: number;
  team_a_difficulty: number;
  kickoff_time: string | null;
  finished: boolean;
};

const POSITIONS: Record<number, Position> = {
  1: Position.GK,
  2: Position.DEF,
  3: Position.MID,
  4: Position.FWD,
};

/** Availability for players whose status is set but chance of playing is not. */
const STATUS_AVAILABILITY: Record<string, number> = {
  a: 1,
  d: 0.5,
  i: 0,
  s: 0,
  u: 0,
  n: 0,
};

export async function fetchPremierLeagueSnapshot(): Promise<LeagueSnapshot> {
  const [bootstrap, rawFixtures] = await Promise.all([
    getJson<FplBootstrap>(BOOTSTRAP_URL),
    getJson<FplFixture[]>(FIXTURES_URL),
  ]);

  if (!Array.isArray(bootstrap?.elements) || !Array.isArray(rawFixtures)) {
    throw new Error('Unexpected Fantasy Premier League API response structure');
  }

  const teams = new Map<string, TeamInfo>(
    bootstrap.teams.map((team) => [
      String(team.id),
      { id: String(team.id), name: team.name, shortName: team.short_name },
    ]),
  );

  const players: PlayerRecord[] = bootstrap.elements
    .filter((element) => !element.removed && POSITIONS[element.element_type])
    .map((element) => {
      const nameParts = [element.first_name, element.second_name];

      return {
        id: String(element.id),
        firstName: nameParts[0],
        secondName: nameParts[1],
        displayName: element.web_name,
        teamId: String(element.team),
        position: POSITIONS[element.element_type],
        price: element.now_cost / 10,
        totalPoints: element.total_points,
        goals: element.goals_scored,
        assists: element.assists,
        cleanSheets: element.clean_sheets,
        minutes: element.minutes,
        starts: element.starts ?? null,
        pointsPerGame: toNumber(element.points_per_game),
        form: toNumber(element.form),
        expectedGoalsPer90: toNullableNumber(element.expected_goals_per_90),
        expectedAssistsPer90: toNullableNumber(element.expected_assists_per_90),
        bonus: element.bonus,
        saves: element.saves,
        selectedBy: toNumber(element.selected_by_percent),
        availability:
          element.chance_of_playing_next_round !== null
            ? element.chance_of_playing_next_round / 100
            : (STATUS_AVAILABILITY[element.status] ?? 1),
        startLikelihood: null,
        news: element.news?.trim() || null,
        providerExpectedPoints: toNullableNumber(element.ep_next),
        transfersIn: element.transfers_in_event,
        transfersOut: element.transfers_out_event,
      };
    });

  const fixtures: FixtureInfo[] = rawFixtures
    .filter((fixture) => fixture.event !== null)
    .map((fixture) => ({
      id: String(fixture.id),
      gameweek: fixture.event as number,
      homeTeamId: String(fixture.team_h),
      awayTeamId: String(fixture.team_a),
      kickoff: fixture.kickoff_time,
      finished: fixture.finished,
      homeScore: fixture.team_h_score,
      awayScore: fixture.team_a_score,
      homeDifficulty: fixture.team_h_difficulty,
      awayDifficulty: fixture.team_a_difficulty,
    }));

  const gameweeks: GameweekInfo[] = bootstrap.events.map((event) => ({
    id: event.id,
    name: event.name,
    deadline: event.deadline_time,
    isCurrent: event.is_current,
    isNext: event.is_next,
    finished: event.finished,
  }));

  const nextGameweek =
    gameweeks.find((gameweek) => gameweek.isNext) ??
    gameweeks.find((gameweek) => gameweek.isCurrent) ??
    gameweeks[gameweeks.length - 1];

  const settings = bootstrap.game_settings ?? {};

  return {
    league: League.PREMIER_LEAGUE,
    rules: {
      budget: (settings.squad_total_spend ?? 1000) / 10,
      squadSize: settings.squad_squadsize ?? 15,
      startingSize: 11,
      maxPerTeam: settings.squad_team_limit ?? 3,
      currency: '£',
      positions: STANDARD_POSITION_RULES,
    },
    teams,
    players,
    fixtures,
    gameweeks,
    defaultGameweek: nextGameweek?.id ?? 1,
    fetchedAt: new Date(),
  };
}

type FplHistoryRow = {
  round: number;
  total_points: number;
};

/** Per-fixture points history for one FPL player (finished gameweeks only). */
export async function fetchPremierLeagueHistory(
  playerId: string,
): Promise<{ gameweek: number; points: number }[]> {
  const summary = await getJson<{ history?: FplHistoryRow[] }>(
    `${ELEMENT_SUMMARY_URL}${encodeURIComponent(playerId)}/`,
  );

  return (summary?.history ?? []).map((row) => ({
    gameweek: toNumber(row.round),
    points: toNumber(row.total_points),
  }));
}
