import { League } from './models/league.enum';
import { Position } from './models/position.enum';

/**
 * Normalised, league-agnostic view of the data pulled from the external
 * fantasy APIs. Both the FPL and UEFA feeds are mapped into this shape so the
 * projection, optimisation and insight code never deals with raw API payloads.
 */

export type PositionRules = {
  /** Players of this position required in a 15-man squad. */
  squad: number;
  /** Minimum number that must start in the XI. */
  minStarters: number;
  /** Maximum number that may start in the XI. */
  maxStarters: number;
};

export type SquadRules = {
  budget: number;
  squadSize: number;
  startingSize: number;
  maxPerTeam: number;
  currency: string;
  positions: Record<Position, PositionRules>;
};

export type TeamInfo = {
  id: string;
  name: string;
  shortName: string;
};

export type FixtureInfo = {
  id: string;
  gameweek: number;
  homeTeamId: string;
  awayTeamId: string;
  kickoff: string | null;
  finished: boolean;
  homeScore: number | null;
  awayScore: number | null;
  /** Official difficulty rating (1-5) for the home side, when the API provides one. */
  homeDifficulty: number | null;
  /** Official difficulty rating (1-5) for the away side, when the API provides one. */
  awayDifficulty: number | null;
};

export type GameweekInfo = {
  id: number;
  name: string;
  deadline: string | null;
  isCurrent: boolean;
  isNext: boolean;
  finished: boolean;
};

export type PlayerRecord = {
  id: string;
  firstName: string;
  secondName: string;
  displayName: string;
  teamId: string;
  position: Position;
  price: number;
  totalPoints: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  minutes: number;
  /** Starts this season, or null when the API does not report them. */
  starts: number | null;
  /** Average points per appearance. */
  pointsPerGame: number;
  /** Recent points-per-match form. */
  form: number;
  expectedGoalsPer90: number | null;
  expectedAssistsPer90: number | null;
  bonus: number;
  saves: number;
  selectedBy: number;
  /** Probability (0-1) that the player is available for the next round. */
  availability: number;
  /** Probability (0-1) that the player starts when available. */
  startLikelihood: number | null;
  news: string | null;
  /** The provider's own expected-points figure for the next round, if any. */
  providerExpectedPoints: number | null;
  transfersIn: number;
  transfersOut: number;
};

export type LeagueSnapshot = {
  league: League;
  rules: SquadRules;
  teams: Map<string, TeamInfo>;
  players: PlayerRecord[];
  fixtures: FixtureInfo[];
  gameweeks: GameweekInfo[];
  /** The gameweek predictions target by default (the next one with an open deadline). */
  defaultGameweek: number;
  fetchedAt: Date;
};

export const STANDARD_POSITION_RULES: Record<Position, PositionRules> = {
  [Position.GK]: { squad: 2, minStarters: 1, maxStarters: 1 },
  [Position.DEF]: { squad: 5, minStarters: 3, maxStarters: 5 },
  [Position.MID]: { squad: 5, minStarters: 2, maxStarters: 5 },
  [Position.FWD]: { squad: 3, minStarters: 1, maxStarters: 3 },
};
