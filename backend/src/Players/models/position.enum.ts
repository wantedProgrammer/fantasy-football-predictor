import { registerEnumType } from '@nestjs/graphql';

export enum Position {
  GK = 'GK',
  DEF = 'DEF',
  MID = 'MID',
  FWD = 'FWD',
}

registerEnumType(Position, {
  name: 'Position',
});
