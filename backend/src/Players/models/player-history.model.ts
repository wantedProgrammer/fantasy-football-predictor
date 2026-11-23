import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GameweekPointsModel {
  @Field(() => Int)
  gameweek!: number;

  @Field(() => Int)
  points!: number;
}

@ObjectType()
export class PlayerHistoryModel {
  @Field()
  playerId!: string;

  @Field(() => [GameweekPointsModel], {
    description:
      'Points in the most recent finished gameweeks, oldest first. Empty when the provider does not publish per-gameweek history.',
  })
  recent!: GameweekPointsModel[];
}
