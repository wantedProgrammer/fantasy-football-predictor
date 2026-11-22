import { Position } from '../Players/models/position.enum';
import {
  FixtureView,
  ModelContext,
  PlayerProjection,
  fixturesFor,
  teamRating,
} from './projection';

export type TipCategory =
  | 'CAPTAIN'
  | 'FIXTURES'
  | 'INJURY'
  | 'DIFFERENTIAL'
  | 'VALUE'
  | 'TRANSFERS'
  | 'SCHEDULE';

export type Tip = {
  category: TipCategory;
  title: string;
  body: string;
};

export type TeamRun = {
  teamId: string;
  team: string;
  teamShort: string;
  averageDifficulty: number;
  attackRating: number;
  defenceRating: number;
  fixtures: FixtureView[];
};

export type Insights = {
  gameweek: number;
  captainPicks: PlayerProjection[];
  differentials: PlayerProjection[];
  valuePicks: PlayerProjection[];
  inForm: PlayerProjection[];
  injuryWatch: PlayerProjection[];
  mostTransferredIn: PlayerProjection[];
  mostTransferredOut: PlayerProjection[];
  fixtureTicker: TeamRun[];
  tips: Tip[];
};

const TICKER_LENGTH = 5;
const DIFFERENTIAL_OWNERSHIP = 10;

const round = (value: number, places = 1) =>
  Math.round(value * 10 ** places) / 10 ** places;

function byPoints(first: PlayerProjection, second: PlayerProjection) {
  return second.points - first.points;
}

function buildFixtureTicker(context: ModelContext, gameweek: number): TeamRun[] {
  const { snapshot } = context;
  const lastGameweek = Math.max(...snapshot.gameweeks.map((item) => item.id));
  const weeks: number[] = [];

  for (
    let week = gameweek;
    week <= lastGameweek && weeks.length < TICKER_LENGTH;
    week += 1
  ) {
    weeks.push(week);
  }

  return [...snapshot.teams.values()]
    .map((team) => {
      const fixtures = weeks.flatMap((week) =>
        fixturesFor(context, team.id, week),
      );
      const rating = teamRating(context, team.id);

      return {
        teamId: team.id,
        team: team.name,
        teamShort: team.shortName,
        averageDifficulty:
          fixtures.length > 0
            ? round(
                fixtures.reduce((total, view) => total + view.difficulty, 0) /
                  fixtures.length,
                2,
              )
            : 5,
        attackRating: round(rating.attack, 2),
        defenceRating: round(rating.defence, 2),
        fixtures,
      };
    })
    .filter((run) => run.fixtures.length > 0)
    .sort(
      (first, second) =>
        first.averageDifficulty - second.averageDifficulty ||
        second.fixtures.length - first.fixtures.length,
    );
}

function formatPrice(currency: string, price: number) {
  return `${currency}${price.toFixed(1)}m`;
}

function describeFixtures(fixtures: FixtureView[]) {
  return fixtures
    .map((view) => `${view.opponent} (${view.home ? 'H' : 'A'})`)
    .join(' and ');
}

export function buildInsights(
  context: ModelContext,
  projections: PlayerProjection[],
  gameweek: number,
): Insights {
  const { snapshot } = context;
  const currency = snapshot.rules.currency;
  const playing = projections.filter(
    (projection) => projection.fixtures.length > 0,
  );

  const captainPicks = playing
    .filter((projection) => projection.playProbability >= 0.6)
    .sort(byPoints)
    .slice(0, 5);

  const differentials = playing
    .filter(
      (projection) =>
        projection.player.selectedBy < DIFFERENTIAL_OWNERSHIP &&
        projection.playProbability >= 0.5,
    )
    .sort(byPoints)
    .slice(0, 6);

  const valuePicks = playing
    .filter(
      (projection) =>
        projection.playProbability >= 0.6 &&
        projection.points >= 3 &&
        projection.player.price > 0,
    )
    .sort(
      (first, second) =>
        second.points / second.player.price - first.points / first.player.price,
    )
    .slice(0, 6);

  const inForm = projections
    .filter((projection) => projection.player.availability > 0)
    .sort((first, second) => second.player.form - first.player.form)
    .slice(0, 6);

  const injuryWatch = projections
    .filter(
      (projection) =>
        projection.player.availability < 1 && projection.player.selectedBy >= 3,
    )
    .sort((first, second) => second.player.selectedBy - first.player.selectedBy)
    .slice(0, 8);

  const hasTransferData = projections.some(
    (projection) =>
      projection.player.transfersIn > 0 || projection.player.transfersOut > 0,
  );

  const mostTransferredIn = hasTransferData
    ? [...projections]
        .sort(
          (first, second) =>
            second.player.transfersIn - first.player.transfersIn,
        )
        .slice(0, 5)
    : [];

  const mostTransferredOut = hasTransferData
    ? [...projections]
        .sort(
          (first, second) =>
            second.player.transfersOut - first.player.transfersOut,
        )
        .slice(0, 5)
    : [];

  const fixtureTicker = buildFixtureTicker(context, gameweek);
  const tips: Tip[] = [];

  const gameweekInfo = snapshot.gameweeks.find((item) => item.id === gameweek);
  if (gameweekInfo?.deadline) {
    const deadline = new Date(gameweekInfo.deadline);
    tips.push({
      category: 'SCHEDULE',
      title: `${gameweekInfo.name} deadline`,
      body: `Make your changes before ${deadline.toUTCString().replace(':00 GMT', ' UTC')}.`,
    });
  }

  const [captain, vice] = captainPicks;
  if (captain) {
    tips.push({
      category: 'CAPTAIN',
      title: `Captain ${captain.player.displayName}`,
      body: `Projected ${captain.points.toFixed(1)} pts${
        captain.fixtures.length ? ` against ${describeFixtures(captain.fixtures)}` : ''
      }, the highest of any likely starter.${
        vice
          ? ` ${vice.player.displayName} (${vice.points.toFixed(1)}) is the best vice-captain.`
          : ''
      }`,
    });
  }

  const teamCounts = new Map<string, number>();
  for (const team of snapshot.teams.values()) {
    teamCounts.set(team.id, fixturesFor(context, team.id, gameweek).length);
  }

  const doubles = [...teamCounts.entries()].filter(([, count]) => count > 1);
  const blanks = [...teamCounts.entries()].filter(([, count]) => count === 0);
  const teamName = (id: string) => snapshot.teams.get(id)?.name ?? id;

  if (doubles.length > 0) {
    tips.push({
      category: 'SCHEDULE',
      title: 'Double gameweek',
      body: `${doubles.map(([id]) => teamName(id)).join(', ')} play twice. Their regular starters are worth extra.`,
    });
  }

  if (blanks.length > 0 && blanks.length < snapshot.teams.size / 2) {
    tips.push({
      category: 'SCHEDULE',
      title: 'Blank gameweek',
      body: `${blanks.map(([id]) => teamName(id)).join(', ')} have no fixture. Bench or transfer out their players.`,
    });
  }

  const easiest = fixtureTicker[0];
  if (easiest) {
    const targets = playing
      .filter((projection) => projection.player.teamId === easiest.teamId)
      .sort(byPoints)
      .slice(0, 3)
      .map((projection) => projection.player.displayName);

    tips.push({
      category: 'FIXTURES',
      title: `${easiest.team} have the best run`,
      body: `Average difficulty ${easiest.averageDifficulty.toFixed(1)} over the next ${easiest.fixtures.length} fixtures${
        targets.length ? `. Assets to target: ${targets.join(', ')}` : ''
      }.`,
    });
  }

  const hardest = fixtureTicker[fixtureTicker.length - 1];
  if (hardest && hardest !== easiest) {
    const popular = projections
      .filter(
        (projection) =>
          projection.player.teamId === hardest.teamId &&
          projection.player.selectedBy >= 10,
      )
      .sort((first, second) => second.player.selectedBy - first.player.selectedBy)
      .slice(0, 2)
      .map((projection) => projection.player.displayName);

    tips.push({
      category: 'FIXTURES',
      title: `Tough run for ${hardest.team}`,
      body: `Average difficulty ${hardest.averageDifficulty.toFixed(1)} over the next ${hardest.fixtures.length} fixtures.${
        popular.length
          ? ` Popular picks affected: ${popular.join(', ')}. Weigh their form against the fixtures before keeping them long term.`
          : ''
      }`,
    });
  }

  for (const injured of injuryWatch.slice(0, 2)) {
    tips.push({
      category: 'INJURY',
      title: `${injured.player.displayName}: ${Math.round(injured.player.availability * 100)}% chance of playing`,
      body: `Owned by ${injured.player.selectedBy.toFixed(1)}% of managers.${
        injured.player.news ? ` ${injured.player.news}.` : ''
      } Have a replacement ready.`.replace('..', '.'),
    });
  }

  const differential = differentials[0];
  if (differential) {
    tips.push({
      category: 'DIFFERENTIAL',
      title: `Differential: ${differential.player.displayName}`,
      body: `Only ${differential.player.selectedBy.toFixed(1)}% owned but projected ${differential.points.toFixed(1)} pts. A good way to gain ground on rivals.`,
    });
  }

  const value = valuePicks[0];
  if (value) {
    tips.push({
      category: 'VALUE',
      title: `Best value: ${value.player.displayName}`,
      body: `${formatPrice(currency, value.player.price)} for a projected ${value.points.toFixed(1)} pts (${(value.points / value.player.price).toFixed(2)} pts per million).`,
    });
  }

  const cheapDefender = playing
    .filter(
      (projection) =>
        projection.player.position === Position.DEF &&
        projection.playProbability >= 0.7 &&
        projection.player.price <= 4.5,
    )
    .sort(byPoints)[0];

  if (cheapDefender) {
    tips.push({
      category: 'VALUE',
      title: `Budget defender: ${cheapDefender.player.displayName}`,
      body: `${formatPrice(currency, cheapDefender.player.price)}, nailed on, projected ${cheapDefender.points.toFixed(1)} pts. It frees up money for premium attackers.`,
    });
  }

  const riser = mostTransferredIn[0];
  if (riser && riser.player.transfersIn > 0) {
    tips.push({
      category: 'TRANSFERS',
      title: `Most bought: ${riser.player.displayName}`,
      body: `${riser.player.transfersIn.toLocaleString('en-GB')} transfers in this round. Buy early if you want them before a price rise.`,
    });
  }

  return {
    gameweek,
    captainPicks,
    differentials,
    valuePicks,
    inForm,
    injuryWatch,
    mostTransferredIn,
    mostTransferredOut,
    fixtureTicker,
    tips,
  };
}
