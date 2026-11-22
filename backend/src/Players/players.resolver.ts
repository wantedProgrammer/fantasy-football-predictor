import {
  Resolver,
  Query,
  Args,
} from '@nestjs/graphql';

import { UseGuards } from '@nestjs/common';

import { PlayersService } from './players.service';
import { PlayerModel } from './models/player.model';
import { League } from './models/league.enum';

import { JwtAuthGuard } from '../Auth/jwt-auth.guard';

@Resolver(() => PlayerModel)
export class PlayersResolver {
  constructor(
    private readonly playersService: PlayersService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Query(() => [PlayerModel])
  async players(
    @Args('league', { type: () => League })
    league: League,
  ): Promise<PlayerModel[]> {
    return this.playersService.getPlayers(league);
  }
}
