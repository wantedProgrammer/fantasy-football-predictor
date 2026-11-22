import { InternalServerErrorException } from '@nestjs/common';

import { League } from './models/league.enum';
import { LeagueSnapshot } from './domain';
import { PlayersService } from './players.service';
import { makePlayer, makeSnapshot } from '../Predictor/test-fixtures';

class StubPlayersService extends PlayersService {
  public calls = 0;

  constructor(private readonly result: () => Promise<LeagueSnapshot>) {
    super();
  }

  protected fetchSnapshot(): Promise<LeagueSnapshot> {
    this.calls += 1;
    return this.result();
  }
}

describe('PlayersService', () => {
  it('maps players with team names and a next-gameweek projection', async () => {
    const service = new StubPlayersService(() =>
      Promise.resolve(
        makeSnapshot({
          players: [makePlayer({ displayName: 'Saka', teamId: 't1', price: 10 })],
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
    const service = new StubPlayersService(() => Promise.resolve(makeSnapshot()));

    await service.getSnapshot(League.PREMIER_LEAGUE);
    await service.getSnapshot(League.PREMIER_LEAGUE);

    expect(service.calls).toBe(1);
  });

  it('turns external API failures into a friendly error and retries next time', async () => {
    const service = new StubPlayersService(() =>
      Promise.reject(new Error('ECONNRESET')),
    );

    await expect(service.getSnapshot(League.CHAMPIONS_LEAGUE)).rejects.toThrow(
      new InternalServerErrorException('Unable to fetch Champions League players'),
    );
    await expect(service.getSnapshot(League.CHAMPIONS_LEAGUE)).rejects.toThrow();

    expect(service.calls).toBe(2);
  });
});
