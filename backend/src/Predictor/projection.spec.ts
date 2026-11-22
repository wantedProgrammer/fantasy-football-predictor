import { Position } from '../Players/models/position.enum';
import { buildModelContext, projectPlayers } from './projection';
import { makeFixture, makePlayer, makeSnapshot } from './test-fixtures';

/** Ten finished gameweek-1 style matches so every club has a played history. */
const history = Array.from({ length: 10 }, (_, index) =>
  makeFixture({
    id: `played-${index}`,
    gameweek: 1,
    finished: true,
    homeTeamId: index % 2 ? 't1' : 't2',
    awayTeamId: index % 2 ? 't2' : 't1',
    homeScore: 1,
    awayScore: 1,
  }),
);

function project(
  players = [makePlayer()],
  upcoming = [makeFixture({ id: 'next', gameweek: 2 })],
) {
  const snapshot = makeSnapshot({
    players,
    fixtures: [...history, ...upcoming],
  });
  return projectPlayers(buildModelContext(snapshot), 2);
}

describe('projectPlayers', () => {
  it('projects positive points for a fit, regular starter', () => {
    const [projection] = project();

    expect(projection.points).toBeGreaterThan(2);
    expect(projection.playProbability).toBe(1);
    expect(projection.fixtures).toHaveLength(1);
  });

  it('projects zero for a player ruled out', () => {
    const [projection] = project([
      makePlayer({ availability: 0, news: 'Knee injury' }),
    ]);

    expect(projection.points).toBe(0);
    expect(projection.reasons.join(' ')).toContain('Knee injury');
  });

  it('projects zero when the team has no fixture (blank gameweek)', () => {
    const [projection] = project([makePlayer({ teamId: 't3' })]);

    expect(projection.points).toBe(0);
    expect(projection.reasons).toContain('No fixture this gameweek');
  });

  it('roughly doubles the projection in a double gameweek', () => {
    const single = project()[0].points;
    const double = project(undefined, [
      makeFixture({ id: 'a', gameweek: 2 }),
      makeFixture({ id: 'b', gameweek: 2, homeTeamId: 't4', awayTeamId: 't1' }),
    ])[0];

    expect(double.points).toBeGreaterThan(single * 1.6);
    expect(double.reasons[0]).toContain('Double gameweek');
  });

  it('rates an easy fixture above a hard one', () => {
    const easy = project(undefined, [
      makeFixture({ homeDifficulty: 2 }),
    ])[0].points;
    const hard = project(undefined, [
      makeFixture({ homeDifficulty: 5 }),
    ])[0].points;

    expect(easy).toBeGreaterThan(hard);
  });

  it('discounts rotation-risk players', () => {
    const [nailed, rotated] = project([
      makePlayer({ id: 'a', starts: 10 }),
      makePlayer({ id: 'b', starts: 3, minutes: 300 }),
    ]);

    expect(rotated.playProbability).toBeLessThan(nailed.playProbability);
    expect(rotated.points).toBeLessThan(nailed.points);
  });

  it('includes clean sheet chances for defenders', () => {
    const [projection] = project([
      makePlayer({ position: Position.DEF }),
    ]);

    expect(projection.reasons.some((reason) => reason.includes('clean sheet'))).toBe(true);
  });

  it('sums decayed points across a multi-gameweek horizon', () => {
    const snapshot = makeSnapshot({
      players: [makePlayer()],
      fixtures: [
        makeFixture({ id: 'a', gameweek: 2 }),
        makeFixture({ id: 'b', gameweek: 3 }),
      ],
      gameweeks: [
        ...makeSnapshot().gameweeks,
        {
          id: 3,
          name: 'Gameweek 3',
          deadline: null,
          isCurrent: false,
          isNext: false,
          finished: false,
        },
      ],
    });
    const context = buildModelContext(snapshot);

    const one = projectPlayers(context, 2, 1)[0].points;
    const two = projectPlayers(context, 2, 2)[0].points;

    expect(two).toBeGreaterThan(one * 1.5);
    expect(two).toBeLessThan(one * 2);
  });
});
