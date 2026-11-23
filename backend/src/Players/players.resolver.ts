import { Resolver, Query, Args } from '@nestjs/graphql';

import { UseGuards } from '@nestjs/common';

import { PlayersService } from './players.service';
import { PlayerModel } from './models/player.model';
import { PlayerHistoryModel } from './models/player-history.model';
import { League } from './models/league.enum';

import { JwtAuthGuard } from '../Auth/jwt-auth.guard';

@Resolver(() => PlayerModel)
export class PlayersResolver {
  constructor(private readonly playersService: PlayersService) {}

  @UseGuards(JwtAuthGuard)
  @Query(() => [PlayerModel])
  async players(
    @Args('league', { type: () => League })
    league: League,
  ): Promise<PlayerModel[]> {
    return this.playersService.getPlayers(league);
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => PlayerHistoryModel, {
    description: 'Recent per-gameweek points for one player (form sparkline).',
  })
  async playerHistory(
    @Args('league', { type: () => League })
    league: League,
    @Args('playerId')
    playerId: string,
  ): Promise<PlayerHistoryModel> {
    return this.playersService.getHistory(league, playerId);
  }
}
