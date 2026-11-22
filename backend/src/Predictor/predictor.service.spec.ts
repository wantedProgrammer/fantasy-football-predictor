import { BadRequestException } from '@nestjs/common';

import { League } from '../Players/models/league.enum';
import { Position } from '../Players/models/position.enum';
import { PlayersService } from '../Players/players.service';
import { PlayerRecord } from '../Players/domain';
import { PredictorService } from './predictor.service';
import { makeFixture, makePlayer, makeSnapshot } from './test-fixtures';

function buildPlayers(): PlayerRecord[] {
  const quotas: [Position, number][] = [
    [Position.GK, 4],
    [Position.DEF, 10],
    [Position.MID, 10],
    [Position.FWD, 6],
  ];
  const players: PlayerRecord[] = [];
  let id = 0;

  for (const [position, count] of quotas) {
    for (let index = 0; index < count; index += 1) {
      id += 1;
      players.push(
        makePlayer({
          id: String(id),
          displayName: `${position} ${index}`,
          position,
          teamId: `t${(id % 6) + 1}`,
          price: 4 + (index % 5),
          pointsPerGame: 2 + index * 0.3,
          form: 2 + index * 0.3,
          selectedBy: index * 3,
        }),
      );
    }
  }

  return players;
}

describe('PredictorService', () => {
  const snapshot = makeSnapshot({
    players: buildPlayers(),
    fixtures: [
      makeFixture({ id: 'done', gameweek: 1, finished: true, homeScore: 2, awayScore: 0 }),
      makeFixture({ id: 'a', gameweek: 2, homeTeamId: 't1', awayTeamId: 't2' }),
      makeFixture({ id: 'b', gameweek: 2, homeTeamId: 't3', awayTeamId: 't4' }),
    ],
  });

  const playersService = {
    getSnapshot: jest.fn().mockResolvedValue(snapshot),
  } as unknown as PlayersService;

  const service = new PredictorService(playersService);

  it('builds a legal predicted team for the next gameweek', async () => {
    const team = await service.getPredictedTeam(League.PREMIER_LEAGUE);

    expect(team.gameweek).toBe(2);
    expect(team.starters).toHaveLength(11);
    expect(team.bench).toHaveLength(4);
    expect(team.totalCost).toBeLessThanOrEqual(100);
    expect(team.bank).toBeCloseTo(100 - team.totalCost, 5);
    expect(team.starters.filter((player) => player.isCaptain)).toHaveLength(1);
    expect(team.starters.filter((player) => player.isViceCaptain)).toHaveLength(1);
    expect(team.formation.split('-').map(Number).reduce((a, b) => a + b)).toBe(10);
  });

  it('clamps the horizon to between 1 and 5 gameweeks', async () => {
    const team = await service.getPredictedTeam(League.PREMIER_LEAGUE, null, 99);

    expect(team.horizon).toBe(5);
  });

  it('rejects past or unknown gameweeks', async () => {
    await expect(
      service.getPredictedTeam(League.PREMIER_LEAGUE, 1),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.getInsights(League.PREMIER_LEAGUE, 40),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns insights with captain picks, a fixture ticker and tips', async () => {
    const insights = await service.getInsights(League.PREMIER_LEAGUE);

    expect(insights.captainPicks.length).toBeGreaterThan(0);
    expect(insights.fixtureTicker).toHaveLength(4);
    expect(insights.tips.some((tip) => tip.category === 'CAPTAIN')).toBe(true);
  });

  it('exposes the season rules and gameweeks', async () => {
    const season = await service.getSeason(League.PREMIER_LEAGUE);

    expect(season).toMatchObject({
      currency: '£',
      budget: 100,
      maxPerTeam: 3,
      defaultGameweek: 2,
    });
    expect(season.gameweeks).toHaveLength(2);
  });
});
