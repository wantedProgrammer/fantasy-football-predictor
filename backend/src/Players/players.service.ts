import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { League } from './models/league.enum';
import { PlayerModel } from './models/player.model';
import { LeagueSnapshot, PlayerRecord } from './domain';
import { fetchPremierLeagueSnapshot } from './sources/fpl.source';
import { fetchChampionsLeagueSnapshot } from './sources/ucl.source';
import { buildModelContext, projectPlayers } from '../Predictor/projection';

const CACHE_TTL_MS = 10 * 60 * 1000;

const LEAGUE_LABELS: Record<League, string> = {
  [League.PREMIER_LEAGUE]: 'Premier League',
  [League.CHAMPIONS_LEAGUE]: 'Champions League',
};

type CacheEntry = {
  expiresAt: number;
  snapshot: Promise<LeagueSnapshot>;
};

@Injectable()
export class PlayersService {
  private readonly logger = new Logger(PlayersService.name);
  private readonly cache = new Map<League, CacheEntry>();

  /**
   * Returns normalised league data, cached for ten minutes so the external
   * APIs are not hit on every request.
   */
  async getSnapshot(league: League): Promise<LeagueSnapshot> {
    const cached = this.cache.get(league);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.snapshot;
    }

    const snapshot = this.fetchSnapshot(league);
    this.cache.set(league, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      snapshot,
    });

    try {
      return await snapshot;
    } catch (error) {
      this.cache.delete(league);
      this.logger.error(
        `Failed to load ${LEAGUE_LABELS[league]} data`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        `Unable to fetch ${LEAGUE_LABELS[league]} players`,
      );
    }
  }

  async getPlayers(league: League): Promise<PlayerModel[]> {
    const snapshot = await this.getSnapshot(league);
    const context = buildModelContext(snapshot);
    const projections = projectPlayers(context, snapshot.defaultGameweek);

    return projections.map((projection) =>
      toPlayerModel(snapshot, projection.player, projection.points),
    );
  }

  protected fetchSnapshot(league: League): Promise<LeagueSnapshot> {
    switch (league) {
      case League.PREMIER_LEAGUE:
        return fetchPremierLeagueSnapshot();
      case League.CHAMPIONS_LEAGUE:
        return fetchChampionsLeagueSnapshot();
      default:
        return Promise.reject(new Error(`Unsupported league ${String(league)}`));
    }
  }
}

export function toPlayerModel(
  snapshot: LeagueSnapshot,
  player: PlayerRecord,
  predictedPoints: number,
): PlayerModel {
  const team = snapshot.teams.get(player.teamId);

  return {
    id: player.id,
    firstName: player.firstName,
    secondName: player.secondName,
    displayName: player.displayName,
    totalPoints: Math.round(player.totalPoints),
    team: team?.name ?? 'Unknown',
    teamShort: team?.shortName ?? '???',
    position: player.position,
    price: player.price,
    goals: Math.round(player.goals),
    assists: Math.round(player.assists),
    cleanSheets: Math.round(player.cleanSheets),
    minutes: Math.round(player.minutes),
    form: player.form,
    pointsPerGame: player.pointsPerGame,
    selectedBy: player.selectedBy,
    availability: player.availability,
    news: player.news,
    transfersIn: Math.round(player.transfersIn),
    transfersOut: Math.round(player.transfersOut),
    predictedPoints,
  };
}
