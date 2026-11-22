import { gql } from '@apollo/client';

import type { League } from '../lib/league';
import type { Position } from '../lib/format';

export type Gameweek = {
  id: number;
  name: string;
  deadline: string | null;
  isCurrent: boolean;
  isNext: boolean;
  finished: boolean;
};

export type Season = {
  league: League;
  currency: string;
  budget: number;
  maxPerTeam: number;
  defaultGameweek: number;
  updatedAt: string;
  gameweeks: Gameweek[];
};

export type Fixture = {
  gameweek: number;
  opponent: string;
  home: boolean;
  difficulty: number;
  kickoff: string | null;
};

export type PlayerSummary = {
  id: string;
  displayName: string;
  firstName: string;
  secondName: string;
  team: string;
  teamShort: string;
  position: Position;
  price: number;
  totalPoints: number;
  form: number;
  pointsPerGame: number;
  selectedBy: number;
  availability: number;
  news: string | null;
  goals: number;
  assists: number;
  transfersIn: number;
  transfersOut: number;
};

export type ProjectedPlayer = {
  predictedPoints: number;
  playProbability: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  reasons: string[];
  fixtures: Fixture[];
  player: PlayerSummary;
};

export type PredictedTeam = {
  league: League;
  gameweek: number;
  gameweekName: string;
  horizon: number;
  formation: string;
  currency: string;
  budget: number;
  totalCost: number;
  bank: number;
  predictedPoints: number;
  starters: ProjectedPlayer[];
  bench: ProjectedPlayer[];
};

export type Tip = {
  category: string;
  title: string;
  body: string;
};

export type TeamRun = {
  team: string;
  teamShort: string;
  averageDifficulty: number;
  attackRating: number;
  defenceRating: number;
  fixtures: Fixture[];
};

export type Insights = {
  league: League;
  gameweek: number;
  gameweekName: string;
  currency: string;
  tips: Tip[];
  captainPicks: ProjectedPlayer[];
  differentials: ProjectedPlayer[];
  valuePicks: ProjectedPlayer[];
  inForm: ProjectedPlayer[];
  injuryWatch: ProjectedPlayer[];
  mostTransferredIn: ProjectedPlayer[];
  mostTransferredOut: ProjectedPlayer[];
  fixtureTicker: TeamRun[];
};

const FIXTURE_FIELDS = `
  gameweek
  opponent
  home
  difficulty
  kickoff
`;

const PROJECTED_PLAYER_FIELDS = `
  predictedPoints
  playProbability
  isCaptain
  isViceCaptain
  reasons
  fixtures { ${FIXTURE_FIELDS} }
  player {
    id
    displayName
    firstName
    secondName
    team
    teamShort
    position
    price
    totalPoints
    form
    pointsPerGame
    selectedBy
    availability
    news
    goals
    assists
    transfersIn
    transfersOut
  }
`;

export const GET_SEASON = gql`
  query Season($league: League!) {
    season(league: $league) {
      league
      currency
      budget
      maxPerTeam
      defaultGameweek
      updatedAt
      gameweeks {
        id
        name
        deadline
        isCurrent
        isNext
        finished
      }
    }
  }
`;

export const GET_PREDICTED_TEAM = gql`
  query PredictedTeam($league: League!, $gameweek: Int, $horizon: Int) {
    predictedTeam(league: $league, gameweek: $gameweek, horizon: $horizon) {
      league
      gameweek
      gameweekName
      horizon
      formation
      currency
      budget
      totalCost
      bank
      predictedPoints
      starters { ${PROJECTED_PLAYER_FIELDS} }
      bench { ${PROJECTED_PLAYER_FIELDS} }
    }
  }
`;

export const GET_INSIGHTS = gql`
  query Insights($league: League!, $gameweek: Int) {
    insights(league: $league, gameweek: $gameweek) {
      league
      gameweek
      gameweekName
      currency
      tips {
        category
        title
        body
      }
      captainPicks { ${PROJECTED_PLAYER_FIELDS} }
      differentials { ${PROJECTED_PLAYER_FIELDS} }
      valuePicks { ${PROJECTED_PLAYER_FIELDS} }
      inForm { ${PROJECTED_PLAYER_FIELDS} }
      injuryWatch { ${PROJECTED_PLAYER_FIELDS} }
      mostTransferredIn { ${PROJECTED_PLAYER_FIELDS} }
      mostTransferredOut { ${PROJECTED_PLAYER_FIELDS} }
      fixtureTicker {
        team
        teamShort
        averageDifficulty
        attackRating
        defenceRating
        fixtures { ${FIXTURE_FIELDS} }
      }
    }
  }
`;
