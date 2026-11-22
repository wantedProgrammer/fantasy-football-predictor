import { registerEnumType } from '@nestjs/graphql';

export enum League {
  PREMIER_LEAGUE = 'PREMIER_LEAGUE',
  CHAMPIONS_LEAGUE = 'CHAMPIONS_LEAGUE',
}

registerEnumType(League, {
  name: 'League',
});