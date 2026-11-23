import { InternalServerErrorException } from '@nestjs/common';

import { League } from './models/league.enum';
import { LeagueSnapshot } from './domain';
import { PlayersService } from './players.service';
import { makePlayer, makeSnapshot } from '../Predictor/test-fixtures';

class StubPlayersService extends PlayersService {
  public calls = 0;
  public historyCalls = 0;
  public history: { gameweek: number; points: number }[] = [];

  constructor(private readonly result: () => Promise<LeagueSnapshot>) {
    super();
  }

  protected fetchSnapshot(): Promise<LeagueSnapshot> {
    this.calls += 1;
    return this.result();
  }

  protected fetchRawHistory(): Promise<{ gameweek: number; points: number }[]> {
    this.historyCalls += 1;
    return Promise.resolve(this.history);
  }
}

describe('PlayersService', () => {
  it('maps players with team names and a next-gameweek projection', async () => {
    const service = new StubPlayersService(() =>
      Promise.resolve(
        makeSnapshot({
          players: [
            makePlayer({ displayName: 'Saka', teamId: 't1', price: 10 }),
          ],
        }),
      ),
    );

    const [player] = await service.getPlayers(League.PREMIER_LEAGUE);

    expect(player).toMatchObject({
      displayName: 'Saka',
      team: 'Team 1',
      teamShort: 'T1',
      price: 10,
    });
    expect(player.predictedPoints).toBeGreaterThan(0);
  });

  it('caches snapshots between requests', async () => {
    const service = new StubPlayersService(() =>
      Promise.resolve(makeSnapshot()),
    );

    await service.getSnapshot(League.PREMIER_LEAGUE);
    await service.getSnapshot(League.PREMIER_LEAGUE);

    expect(service.calls).toBe(1);
  });

  it('turns external API failures into a friendly error and retries next time', async () => {
    const service = new StubPlayersService(() =>
      Promise.reject(new Error('ECONNRESET')),
    );

    await expect(service.getSnapshot(League.CHAMPIONS_LEAGUE)).rejects.toThrow(
      new InternalServerErrorException(
        'Unable to fetch Champions League players',
      ),
    );
    await expect(
      service.getSnapshot(League.CHAMPIONS_LEAGUE),
    ).rejects.toThrow();

    expect(service.calls).toBe(2);
  });

  describe('getHistory', () => {
    it('returns the last six gameweeks, oldest first, merging double gameweeks', async () => {
      const service = new StubPlayersService(() =>
        Promise.resolve(makeSnapshot()),
      );
      service.history = [
        { gameweek: 1, points: 2 },
        { gameweek: 2, points: 6 },
        { gameweek: 3, points: 1 },
        { gameweek: 4, points: 9 },
        { gameweek: 5, points: 3 },
        { gameweek: 6, points: 2 },
        { gameweek: 6, points: 5 },
        { gameweek: 7, points: 12 },
      ];

      const result = await service.getHistory(League.PREMIER_LEAGUE, '42');

      expect(result.playerId).toBe('42');
      expect(result.recent).toEqual([
        { gameweek: 2, points: 6 },
        { gameweek: 3, points: 1 },
        { gameweek: 4, points: 9 },
        { gameweek: 5, points: 3 },
        { gameweek: 6, points: 7 },
        { gameweek: 7, points: 12 },
      ]);
    });

    it('caches history per player', async () => {
      const service = new StubPlayersService(() =>
        Promise.resolve(makeSnapshot()),
      );

      await service.getHistory(League.PREMIER_LEAGUE, '42');
      await service.getHistory(League.PREMIER_LEAGUE, '42');

      expect(service.historyCalls).toBe(1);
    });

    it('returns no history for leagues without a history feed or for invalid ids', async () => {
      const service = new StubPlayersService(() =>
        Promise.resolve(makeSnapshot()),
      );

      await expect(
        service.getHistory(League.CHAMPIONS_LEAGUE, '42'),
      ).resolves.toEqual({
        playerId: '42',
        recent: [],
      });
      await expect(
        service.getHistory(League.PREMIER_LEAGUE, '../bootstrap'),
      ).resolves.toEqual({
        playerId: '../bootstrap',
        recent: [],
      });
      expect(service.historyCalls).toBe(0);
    });
  });
});
