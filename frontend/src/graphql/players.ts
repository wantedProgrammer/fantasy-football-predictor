import { gql } from '@apollo/client';

export const GET_PLAYERS = gql`
  query Players($league: League!) {
    players(league: $league) {
      id
      firstName
      secondName
      displayName
      totalPoints
      team
      teamShort
      position
      price
      goals
      assists
      form
      selectedBy
      availability
      news
      predictedPoints
    }
  }
`;

export type GameweekPoints = { gameweek: number; points: number };

export const GET_PLAYER_HISTORY = gql`
  query PlayerHistory($league: League!, $playerId: String!) {
    playerHistory(league: $league, playerId: $playerId) {
      playerId
      recent {
        gameweek
        points
      }
    }
  }
`;
