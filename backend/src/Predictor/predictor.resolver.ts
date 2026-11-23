import { Args, Int, Query, Resolver } from '@nestjs/graphql';

import { League } from '../Players/models/league.enum';
import {
  InsightsModel,
  PredictedTeamModel,
  SeasonModel,
} from './models/predictor.models';
import { PredictorService } from './predictor.service';

@Resolver()
export class PredictorResolver {
  constructor(private readonly predictorService: PredictorService) {}

  @Query(() => SeasonModel, {
    description: 'Gameweeks, budget and squad rules for a competition.',
  })
  season(
    @Args('league', { type: () => League }) league: League,
  ): Promise<SeasonModel> {
    return this.predictorService.getSeason(league);
  }

  @Query(() => PredictedTeamModel, {
    description:
      'The highest-projected legal 15-man squad, starting XI and captain for a gameweek.',
  })
  predictedTeam(
    @Args('league', { type: () => League }) league: League,
    @Args('gameweek', { type: () => Int, nullable: true })
    gameweek?: number | null,
    @Args('horizon', {
      type: () => Int,
      nullable: true,
      description: 'Optimise over this many gameweeks (1-5). Defaults to 1.',
    })
    horizon?: number | null,
  ): Promise<PredictedTeamModel> {
    return this.predictorService.getPredictedTeam(league, gameweek, horizon);
  }

  @Query(() => InsightsModel, {
    description: 'Captain picks, differentials, fixtures and tips for a gameweek.',
  })
  insights(
    @Args('league', { type: () => League }) league: League,
    @Args('gameweek', { type: () => Int, nullable: true })
    gameweek?: number | null,
  ): Promise<InsightsModel> {
    return this.predictorService.getInsights(league, gameweek);
  }
}
