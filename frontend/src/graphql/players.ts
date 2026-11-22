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
