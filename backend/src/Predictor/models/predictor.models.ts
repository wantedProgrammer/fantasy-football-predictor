import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

import { League } from '../../Players/models/league.enum';
import { PlayerModel } from '../../Players/models/player.model';

@ObjectType()
export class GameweekModel {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  deadline?: string | null;

  @Field()
  isCurrent!: boolean;

  @Field()
  isNext!: boolean;

  @Field()
  finished!: boolean;
}

@ObjectType()
export class SeasonModel {
  @Field(() => League)
  league!: League;

  @Field()
  currency!: string;

  @Field(() => Float)
  budget!: number;

  @Field(() => Int)
  maxPerTeam!: number;

  @Field(() => Int, { description: 'The next gameweek with an open deadline.' })
  defaultGameweek!: number;

  @Field(() => [GameweekModel])
  gameweeks!: GameweekModel[];

  @Field()
  updatedAt!: string;
}

@ObjectType()
export class FixtureModel {
  @Field(() => Int)
  gameweek!: number;

  @Field()
  opponent!: string;

  @Field()
  home!: boolean;

  @Field(() => Int, { description: '1 (easiest) to 5 (hardest).' })
  difficulty!: number;

  @Field(() => String, { nullable: true })
  kickoff?: string | null;
}

@ObjectType()
export class ProjectedPlayerModel {
  @Field(() => PlayerModel)
  player!: PlayerModel;

  @Field(() => Float)
  predictedPoints!: number;

  @Field(() => Float, { description: 'Probability (0-1) of starting.' })
  playProbability!: number;

  @Field(() => [FixtureModel])
  fixtures!: FixtureModel[];

  @Field(() => [String])
  reasons!: string[];

  @Field()
  isCaptain!: boolean;

  @Field()
  isViceCaptain!: boolean;
}

@ObjectType()
export class PredictedTeamModel {
  @Field(() => League)
  league!: League;

  @Field(() => Int)
  gameweek!: number;

  @Field()
  gameweekName!: string;

  @Field(() => Int, { description: 'Number of gameweeks the squad was optimised over.' })
  horizon!: number;

  @Field()
  formation!: string;

  @Field()
  currency!: string;

  @Field(() => Float)
  budget!: number;

  @Field(() => Float)
  totalCost!: number;

  @Field(() => Float)
  bank!: number;

  @Field(() => Float, { description: 'Starting XI projection, captain counted twice.' })
  predictedPoints!: number;

  @Field(() => [ProjectedPlayerModel])
  starters!: ProjectedPlayerModel[];

  @Field(() => [ProjectedPlayerModel])
  bench!: ProjectedPlayerModel[];
}

@ObjectType()
export class TeamRunModel {
  @Field()
  team!: string;

  @Field()
  teamShort!: string;

  @Field(() => Float)
  averageDifficulty!: number;

  @Field(() => Float, { description: 'Goals scored relative to league average.' })
  attackRating!: number;

  @Field(() => Float, { description: 'Goals conceded relative to league average.' })
  defenceRating!: number;

  @Field(() => [FixtureModel])
  fixtures!: FixtureModel[];
}

@ObjectType()
export class TipModel {
  @Field()
  category!: string;

  @Field()
  title!: string;

  @Field()
  body!: string;
}

@ObjectType()
export class InsightsModel {
  @Field(() => League)
  league!: League;

  @Field(() => Int)
  gameweek!: number;

  @Field()
  gameweekName!: string;

  @Field()
  currency!: string;

  @Field(() => [TipModel])
  tips!: TipModel[];

  @Field(() => [ProjectedPlayerModel])
  captainPicks!: ProjectedPlayerModel[];

  @Field(() => [ProjectedPlayerModel])
  differentials!: ProjectedPlayerModel[];

  @Field(() => [ProjectedPlayerModel])
  valuePicks!: ProjectedPlayerModel[];

  @Field(() => [ProjectedPlayerModel])
  inForm!: ProjectedPlayerModel[];

  @Field(() => [ProjectedPlayerModel])
  injuryWatch!: ProjectedPlayerModel[];

  @Field(() => [ProjectedPlayerModel])
  mostTransferredIn!: ProjectedPlayerModel[];

  @Field(() => [ProjectedPlayerModel])
  mostTransferredOut!: ProjectedPlayerModel[];

  @Field(() => [TeamRunModel])
  fixtureTicker!: TeamRunModel[];
}
