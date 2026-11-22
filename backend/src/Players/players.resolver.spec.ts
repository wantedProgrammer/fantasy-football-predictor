import { Test, TestingModule } from '@nestjs/testing';

import { League } from './models/league.enum';
import { PlayersResolver } from './players.resolver';
import { PlayersService } from './players.service';

describe('PlayersResolver', () => {
  let resolver: PlayersResolver;
  const getPlayers = jest.fn();

  beforeEach(async () => {
    getPlayers.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayersResolver,
        { provide: PlayersService, useValue: { getPlayers } },
      ],
    }).compile();

    resolver = module.get(PlayersResolver);
  });

  it.each([League.PREMIER_LEAGUE, League.CHAMPIONS_LEAGUE])(
    'returns players for %s',
    async (league) => {
      getPlayers.mockResolvedValue([{ displayName: 'Player' }]);

      await expect(resolver.players(league)).resolves.toEqual([
        { displayName: 'Player' },
      ]);
      expect(getPlayers).toHaveBeenCalledWith(league);
    },
  );

  it('propagates external service failures', async () => {
    getPlayers.mockRejectedValue(new Error('Unable to fetch Premier League players'));

    await expect(resolver.players(League.PREMIER_LEAGUE)).rejects.toThrow(
      'Unable to fetch Premier League players',
    );
  });
});
