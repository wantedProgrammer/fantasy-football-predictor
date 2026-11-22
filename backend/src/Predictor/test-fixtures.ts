import { League } from '../Players/models/league.enum';
import { Position } from '../Players/models/position.enum';
import {
  FixtureInfo,
  LeagueSnapshot,
  PlayerRecord,
  STANDARD_POSITION_RULES,
  TeamInfo,
} from '../Players/domain';

/** Builders for small, deterministic league snapshots used in unit tests. */

export function makePlayer(overrides: Partial<PlayerRecord> = {}): PlayerRecord {
  return {
    id: 'p1',
    firstName: 'Test',
    secondName: 'Player',
    displayName: 'Player',
    teamId: 't1',
    position: Position.MID,
    price: 5,
    totalPoints: 40,
    goals: 3,
    assists: 2,
    cleanSheets: 2,
    minutes: 900,
    starts: 10,
    pointsPerGame: 4,
    form: 4,
    expectedGoalsPer90: 0.2,
    expectedAssistsPer90: 0.15,
    bonus: 5,
    saves: 0,
    selectedBy: 5,
    availability: 1,
    startLikelihood: null,
    news: null,
    providerExpectedPoints: null,
    transfersIn: 0,
    transfersOut: 0,
    ...overrides,
  };
}

export function makeFixture(overrides: Partial<FixtureInfo> = {}): FixtureInfo {
  return {
    id: 'f1',
    gameweek: 2,
    homeTeamId: 't1',
    awayTeamId: 't2',
    kickoff: null,
    finished: false,
    homeScore: null,
    awayScore: null,
    homeDifficulty: 3,
    awayDifficulty: 3,
    ...overrides,
  };
}

export function makeSnapshot(
  overrides: Partial<LeagueSnapshot> = {},
): LeagueSnapshot {
  const teams = new Map<string, TeamInfo>();
  // Six clubs, so a 15-man squad is possible with at most three per club.
  for (let index = 1; index <= 6; index += 1) {
    teams.set(`t${index}`, {
      id: `t${index}`,
      name: `Team ${index}`,
      shortName: `T${index}`,
    });
  }

  return {
    league: League.PREMIER_LEAGUE,
    rules: {
      budget: 100,
      squadSize: 15,
      startingSize: 11,
      maxPerTeam: 3,
      currency: '£',
      positions: STANDARD_POSITION_RULES,
    },
    teams,
    players: [],
    fixtures: [
      makeFixture({
        id: 'done',
        gameweek: 1,
        finished: true,
        homeScore: 1,
        awayScore: 1,
      }),
      makeFixture({ id: 'next', gameweek: 2 }),
    ],
    gameweeks: [
      {
        id: 1,
        name: 'Gameweek 1',
        deadline: null,
        isCurrent: true,
        isNext: false,
        finished: true,
      },
      {
        id: 2,
        name: 'Gameweek 2',
        deadline: null,
        isCurrent: false,
        isNext: true,
        finished: false,
      },
    ],
    defaultGameweek: 2,
    fetchedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}
