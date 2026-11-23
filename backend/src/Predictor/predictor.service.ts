import { BadRequestException, Injectable } from '@nestjs/common';

import { League } from '../Players/models/league.enum';
import { LeagueSnapshot } from '../Players/domain';
import { PlayersService, toPlayerModel } from '../Players/players.service';
import { buildInsights } from './insights';
import {
  FixtureView,
  ModelContext,
  PlayerProjection,
  buildModelContext,
  projectPlayers,
} from './projection';
import { pickBestSquad } from './optimizer';
import {
  FixtureModel,
  InsightsModel,
  PredictedTeamModel,
  ProjectedPlayerModel,
  SeasonModel,
} from './models/predictor.models';

export const MAX_HORIZON = 5;

type ProjectedCandidate = {
  id: string;
  position: PlayerProjection['player']['position'];
  teamId: string;
  price: number;
  points: number;
  projection: PlayerProjection;
};

@Injectable()
export class PredictorService {
  private readonly contexts = new WeakMap<LeagueSnapshot, ModelContext>();
  private readonly teams = new Map<string, PredictedTeamModel>();

  constructor(private readonly playersService: PlayersService) {}

  async getSeason(league: League): Promise<SeasonModel> {
    const snapshot = await this.playersService.getSnapshot(league);

    return {
      league,
      currency: snapshot.rules.currency,
      budget: snapshot.rules.budget,
      maxPerTeam: snapshot.rules.maxPerTeam,
      defaultGameweek: snapshot.defaultGameweek,
      gameweeks: snapshot.gameweeks,
      updatedAt: snapshot.fetchedAt.toISOString(),
    };
  }

  async getPredictedTeam(
    league: League,
    gameweek?: number | null,
    horizon?: number | null,
  ): Promise<PredictedTeamModel> {
    const snapshot = await this.playersService.getSnapshot(league);
    const target = this.resolveGameweek(snapshot, gameweek);
    const span = Math.min(Math.max(Math.trunc(horizon ?? 1), 1), MAX_HORIZON);

    const cacheKey = `${league}:${snapshot.fetchedAt.getTime()}:${target}:${span}`;
    const cached = this.teams.get(cacheKey);
    if (cached) {
      return cached;
    }

    const projections = projectPlayers(this.context(snapshot), target, span);
    const candidates: ProjectedCandidate[] = projections.map((projection) => ({
      id: projection.player.id,
      position: projection.player.position,
      teamId: projection.player.teamId,
      price: projection.player.price,
      points: projection.points,
      projection,
    }));

    const selection = pickBestSquad(candidates, snapshot.rules);

    const toModel = (candidate: ProjectedCandidate) =>
      this.toProjectedPlayer(snapshot, candidate.projection, {
        isCaptain: candidate === selection.captain,
        isViceCaptain: candidate === selection.viceCaptain,
      });

    const result: PredictedTeamModel = {
      league,
      gameweek: target,
      gameweekName: this.gameweekName(snapshot, target),
      horizon: span,
      formation: selection.formation,
      currency: snapshot.rules.currency,
      budget: snapshot.rules.budget,
      totalCost: selection.cost,
      bank: Math.round((snapshot.rules.budget - selection.cost) * 10) / 10,
      predictedPoints: Math.round(selection.startingPoints * 10) / 10,
      starters: selection.starters.map(toModel),
      bench: selection.bench.map(toModel),
    };

    // Keep the cache small: only results for the current data are useful.
    for (const key of this.teams.keys()) {
      if (!key.startsWith(`${league}:${snapshot.fetchedAt.getTime()}:`)) {
        this.teams.delete(key);
      }
    }
    this.teams.set(cacheKey, result);

    return result;
  }

  async getInsights(
    league: League,
    gameweek?: number | null,
  ): Promise<InsightsModel> {
    const snapshot = await this.playersService.getSnapshot(league);
    const target = this.resolveGameweek(snapshot, gameweek);
    const context = this.context(snapshot);
    const projections = projectPlayers(context, target, 1);
    const insights = buildInsights(context, projections, target);

    const toModels = (items: PlayerProjection[]) =>
      items.map((item) => this.toProjectedPlayer(snapshot, item));

    return {
      league,
      gameweek: target,
      gameweekName: this.gameweekName(snapshot, target),
      currency: snapshot.rules.currency,
      tips: insights.tips,
      captainPicks: toModels(insights.captainPicks),
      differentials: toModels(insights.differentials),
      valuePicks: toModels(insights.valuePicks),
      inForm: toModels(insights.inForm),
      injuryWatch: toModels(insights.injuryWatch),
      mostTransferredIn: toModels(insights.mostTransferredIn),
      mostTransferredOut: toModels(insights.mostTransferredOut),
      fixtureTicker: insights.fixtureTicker.map((run) => ({
        team: run.team,
        teamShort: run.teamShort,
        averageDifficulty: run.averageDifficulty,
        attackRating: run.attackRating,
        defenceRating: run.defenceRating,
        fixtures: run.fixtures.map(toFixtureModel),
      })),
    };
  }

  private context(snapshot: LeagueSnapshot): ModelContext {
    let context = this.contexts.get(snapshot);

    if (!context) {
      context = buildModelContext(snapshot);
      this.contexts.set(snapshot, context);
    }

    return context;
  }

  private resolveGameweek(
    snapshot: LeagueSnapshot,
    requested?: number | null,
  ): number {
    if (requested === undefined || requested === null) {
      return snapshot.defaultGameweek;
    }

    const exists = snapshot.gameweeks.some((item) => item.id === requested);

    if (!exists || requested < snapshot.defaultGameweek) {
      throw new BadRequestException(
        `Gameweek ${requested} is not an upcoming gameweek. Choose ${snapshot.defaultGameweek} or later.`,
      );
    }

    return requested;
  }

  private gameweekName(snapshot: LeagueSnapshot, gameweek: number): string {
    return (
      snapshot.gameweeks.find((item) => item.id === gameweek)?.name ??
      `Gameweek ${gameweek}`
    );
  }

  private toProjectedPlayer(
    snapshot: LeagueSnapshot,
    projection: PlayerProjection,
    flags: { isCaptain: boolean; isViceCaptain: boolean } = {
      isCaptain: false,
      isViceCaptain: false,
    },
  ): ProjectedPlayerModel {
    return {
      player: toPlayerModel(snapshot, projection.player, projection.points),
      predictedPoints: projection.points,
      playProbability: projection.playProbability,
      fixtures: projection.fixtures.map(toFixtureModel),
      reasons: projection.reasons,
      xgiPer90: projection.xgiPer90,
      cleanSheetChance: projection.cleanSheetChance,
      ...flags,
    };
  }
}

function toFixtureModel(view: FixtureView): FixtureModel {
  return {
    gameweek: view.gameweek,
    opponent: view.opponent,
    home: view.home,
    difficulty: view.difficulty,
    kickoff: view.fixture.kickoff,
  };
}
