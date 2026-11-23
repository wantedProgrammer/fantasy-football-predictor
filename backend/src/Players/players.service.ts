import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { League } from './models/league.enum';
import { PlayerModel } from './models/player.model';
import {
  GameweekPointsModel,
  PlayerHistoryModel,
} from './models/player-history.model';
import { LeagueSnapshot, PlayerRecord } from './domain';
import {
  fetchPremierLeagueHistory,
  fetchPremierLeagueSnapshot,
} from './sources/fpl.source';
import { fetchChampionsLeagueSnapshot } from './sources/ucl.source';
import { buildModelContext, projectPlayers } from '../Predictor/projection';

const CACHE_TTL_MS = 10 * 60 * 1000;
const HISTORY_LENGTH = 6;

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
  private readonly historyCache = new Map<
    string,
    { expiresAt: number; recent: Promise<GameweekPointsModel[]> }
  >();

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

  /**
   * Recent per-gameweek points for one player, used for form sparklines.
   * Only FPL publishes this; other leagues return an empty list.
   */
  async getHistory(
    league: League,
    playerId: string,
  ): Promise<PlayerHistoryModel> {
    if (league !== League.PREMIER_LEAGUE || !/^\d{1,6}$/.test(playerId)) {
      return { playerId, recent: [] };
    }

    const key = `${league}:${playerId}`;
    const cached = this.historyCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return { playerId, recent: await cached.recent };
    }

    const recent = this.fetchHistory(playerId);
    this.historyCache.set(key, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      recent,
    });

    try {
      return { playerId, recent: await recent };
    } catch (error) {
      this.historyCache.delete(key);
      this.logger.warn(
        `Failed to load history for player ${playerId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { playerId, recent: [] };
    }
  }

  /** Raw per-fixture rows from the provider; overridden in tests. */
  protected fetchRawHistory(
    playerId: string,
  ): Promise<{ gameweek: number; points: number }[]> {
    return fetchPremierLeagueHistory(playerId);
  }

  private async fetchHistory(playerId: string): Promise<GameweekPointsModel[]> {
    const history = await this.fetchRawHistory(playerId);

    // Sum double-gameweek rows so each gameweek appears once.
    const byGameweek = new Map<number, number>();
    for (const row of history) {
      byGameweek.set(
        row.gameweek,
        (byGameweek.get(row.gameweek) ?? 0) + row.points,
      );
    }

    return [...byGameweek.entries()]
      .sort(([a], [b]) => a - b)
      .slice(-HISTORY_LENGTH)
      .map(([gameweek, points]) => ({ gameweek, points }));
  }

  protected fetchSnapshot(league: League): Promise<LeagueSnapshot> {
    switch (league) {
      case League.PREMIER_LEAGUE:
        return fetchPremierLeagueSnapshot();
      case League.CHAMPIONS_LEAGUE:
        return fetchChampionsLeagueSnapshot();
      default:
        return Promise.reject(
          new Error(`Unsupported league ${String(league)}`),
        );
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
