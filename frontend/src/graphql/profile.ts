import { gql } from '@apollo/client';

export const ME = gql`
  query Me {
    me {
      id
      name
      surname
      email
      mobile
      favouritePlayer
    }
  }
`;

export const SET_FAVOURITE_PLAYER = gql`
  mutation SetFavouritePlayer($player: String!) {
    setFavouritePlayer(player: $player) {
      id
      favouritePlayer
    }
  }
`;