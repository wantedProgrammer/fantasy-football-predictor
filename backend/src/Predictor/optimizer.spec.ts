import { Position } from '../Players/models/position.enum';
import { STANDARD_POSITION_RULES, SquadRules } from '../Players/domain';
import { Candidate, pickBestSquad, selectLineup } from './optimizer';

const rules: SquadRules = {
  budget: 100,
  squadSize: 15,
  startingSize: 11,
  maxPerTeam: 3,
  currency: '£',
  positions: STANDARD_POSITION_RULES,
};

/** Deterministic pseudo-random generator so tests are repeatable. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function buildMarket(seed = 7): Candidate[] {
  const random = seeded(seed);
  const counts: Record<Position, number> = {
    [Position.GK]: 30,
    [Position.DEF]: 80,
    [Position.MID]: 90,
    [Position.FWD]: 50,
  };
  const players: Candidate[] = [];

  for (const position of Object.keys(counts) as Position[]) {
    for (let index = 0; index < counts[position]; index += 1) {
      const price = Math.round((4 + random() * 9) * 10) / 10;
      players.push({
        id: `${position}-${index}`,
        position,
        teamId: `team-${Math.floor(random() * 20)}`,
        price,
        // Points loosely correlate with price, plus noise.
        points: Math.round((price * 0.6 + random() * 4) * 100) / 100,
      });
    }
  }

  return players;
}

function bruteForceLineupPoints(squad: Candidate[]): number {
  // Try every legal formation and return the best XI + captain total.
  const byPosition = (position: Position) =>
    squad
      .filter((player) => player.position === position)
      .sort((first, second) => second.points - first.points);

  let best = -Infinity;
  for (let def = 3; def <= 5; def += 1) {
    for (let mid = 2; mid <= 5; mid += 1) {
      const fwd = 10 - def - mid;
      if (fwd < 1 || fwd > 3) continue;

      const xi = [
        ...byPosition(Position.GK).slice(0, 1),
        ...byPosition(Position.DEF).slice(0, def),
        ...byPosition(Position.MID).slice(0, mid),
        ...byPosition(Position.FWD).slice(0, fwd),
      ];
      const total =
        xi.reduce((sum, player) => sum + player.points, 0) +
        Math.max(...xi.map((player) => player.points));
      best = Math.max(best, total);
    }
  }

  return best;
}

describe('pickBestSquad', () => {
  const market = buildMarket();
  const selection = pickBestSquad(market, rules);

  it('returns a full squad with the right position quotas', () => {
    expect(selection.squad).toHaveLength(15);

    for (const position of Object.values(Position)) {
      expect(
        selection.squad.filter((player) => player.position === position),
      ).toHaveLength(rules.positions[position].squad);
    }
  });

  it('stays within budget', () => {
    expect(selection.cost).toBeLessThanOrEqual(rules.budget);
  });

  it('never picks more than three players from one club', () => {
    const counts = new Map<string, number>();
    for (const player of selection.squad) {
      counts.set(player.teamId, (counts.get(player.teamId) ?? 0) + 1);
    }

    expect(Math.max(...counts.values())).toBeLessThanOrEqual(3);
  });

  it('never picks the same player twice', () => {
    expect(new Set(selection.squad.map((player) => player.id)).size).toBe(15);
  });

  it('starts a legal XI and captains its top scorer', () => {
    expect(selection.starters).toHaveLength(11);
    expect(selection.bench).toHaveLength(4);
    expect(selection.bench[0].position).toBe(Position.GK);

    const topStarter = Math.max(...selection.starters.map((player) => player.points));
    expect(selection.captain.points).toBe(topStarter);
    expect(selection.viceCaptain).not.toBe(selection.captain);
  });

  it('chooses the best formation for the squad', () => {
    expect(selection.startingPoints).toBeCloseTo(
      bruteForceLineupPoints(selection.squad),
      6,
    );
  });

  it('beats a simple points-per-price greedy squad', () => {
    const greedy: Candidate[] = [];
    const sorted = [...market].sort(
      (first, second) => second.points / second.price - first.points / first.price,
    );
    const counts = new Map<string, number>();

    for (const player of sorted) {
      const sameRole = greedy.filter((item) => item.position === player.position);
      if (sameRole.length >= rules.positions[player.position].squad) continue;
      if ((counts.get(player.teamId) ?? 0) >= 3) continue;
      greedy.push(player);
      counts.set(player.teamId, (counts.get(player.teamId) ?? 0) + 1);
    }

    const greedyPoints = selectLineup(greedy, rules).startingPoints;
    expect(selection.startingPoints).toBeGreaterThanOrEqual(greedyPoints);
  });

  it('throws when no legal squad fits the budget', () => {
    expect(() => pickBestSquad(market, { ...rules, budget: 20 })).toThrow(
      'No squad satisfies the budget and position rules',
    );
  });
});
