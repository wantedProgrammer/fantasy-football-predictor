import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

import { Position } from './position.enum';

@ObjectType()
export class PlayerModel {
  @Field()
  id!: string;

  @Field()
  firstName!: string;

  @Field()
  secondName!: string;

  @Field()
  displayName!: string;

  @Field(() => Int)
  totalPoints!: number;

  @Field()
  team!: string;

  @Field()
  teamShort!: string;

  @Field(() => Position)
  position!: Position;

  @Field(() => Float, { description: 'Price in millions.' })
  price!: number;

  @Field(() => Int)
  goals!: number;

  @Field(() => Int)
  assists!: number;

  @Field(() => Int)
  cleanSheets!: number;

  @Field(() => Int)
  minutes!: number;

  @Field(() => Float)
  form!: number;

  @Field(() => Float)
  pointsPerGame!: number;

  @Field(() => Float, { description: 'Percentage of managers who own the player.' })
  selectedBy!: number;

  @Field(() => Float, { description: 'Chance (0-1) of being available next round.' })
  availability!: number;

  @Field(() => String, { nullable: true })
  news?: string | null;

  @Field(() => Int, { description: 'Transfers in during the current round.' })
  transfersIn!: number;

  @Field(() => Int, { description: 'Transfers out during the current round.' })
  transfersOut!: number;

  @Field(() => Float, { description: 'Projected points for the next gameweek.' })
  predictedPoints!: number;
}
