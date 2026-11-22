import { Position } from '../Players/models/position.enum';
import { SquadRules } from '../Players/domain';

/**
 * Squad optimiser.
 *
 * Finds a 15-player squad that maximises expected points for the starting XI
 * (with the captain's points doubled) while respecting the budget, position
 * quotas and the per-club limit. A small weight on bench points makes it pick
 * sensible substitutes rather than the cheapest possible players.
 *
 * The search is a multi-start local search: build feasible starting squads,
 * then repeatedly apply the best single-player swap, falling back to two-player
 * swaps (which can fund an upgrade with a downgrade) until nothing improves.
 */

export type Candidate = {
  id: string;
  position: Position;
  teamId: string;
  price: number;
  points: number;
};

export type LineupSelection<T extends Candidate> = {
  starters: T[];
  bench: T[];
  captain: T;
  viceCaptain: T;
  formation: string;
  /** Starting XI points including the captain's double points. */
  startingPoints: number;
};

export type SquadSelection<T extends Candidate> = LineupSelection<T> & {
  squad: T[];
  cost: number;
};

const BENCH_WEIGHT = 0.1;
const SINGLE_POOL_SIZE = 40;
const VALUE_POOL_SIZE = 15;
const CHEAP_POOL_SIZE = 6;
const PAIR_POOL_SIZE = 18;
const EPSILON = 1e-6;
const OUTFIELD: Position[] = [Position.DEF, Position.MID, Position.FWD];
const ALL_POSITIONS: Position[] = [Position.GK, ...OUTFIELD];

const byPointsDesc = <T extends Candidate>(first: T, second: T) =>
  second.points - first.points ||
  first.price - second.price ||
  first.id.localeCompare(second.id);

/** Picks the best legal starting XI, captain and bench order from a squad. */
export function selectLineup<T extends Candidate>(
  squad: T[],
  rules: SquadRules,
): LineupSelection<T> {
  const sorted = [...squad].sort(byPointsDesc);
  const starters: T[] = [];
  const counts: Record<Position, number> = {
    [Position.GK]: 0,
    [Position.DEF]: 0,
    [Position.MID]: 0,
    [Position.FWD]: 0,
  };
  const used = new Set<T>();

  for (const position of ALL_POSITIONS) {
    const required = rules.positions[position].minStarters;

    for (const player of sorted) {
      if (counts[position] >= required) break;
      if (player.position === position) {
        starters.push(player);
        used.add(player);
        counts[position] += 1;
      }
    }
  }

  for (const player of sorted) {
    if (starters.length >= rules.startingSize) break;
    if (used.has(player)) continue;
    if (counts[player.position] >= rules.positions[player.position].maxStarters) {
      continue;
    }

    starters.push(player);
    used.add(player);
    counts[player.position] += 1;
  }

  const benchGoalkeepers = sorted.filter(
    (player) => !used.has(player) && player.position === Position.GK,
  );
  const benchOutfield = sorted.filter(
    (player) => !used.has(player) && player.position !== Position.GK,
  );

  const orderedStarters = [...starters].sort(
    (first, second) =>
      ALL_POSITIONS.indexOf(first.position) -
        ALL_POSITIONS.indexOf(second.position) || byPointsDesc(first, second),
  );

  const [captain, viceCaptain] = [...starters].sort(byPointsDesc);

  const startingPoints =
    starters.reduce((total, player) => total + player.points, 0) +
    (captain?.points ?? 0);

  return {
    starters: orderedStarters,
    bench: [...benchGoalkeepers, ...benchOutfield],
    captain,
    viceCaptain: viceCaptain ?? captain,
    formation: OUTFIELD.map((position) => counts[position]).join('-'),
    startingPoints,
  };
}

function objective<T extends Candidate>(squad: T[], rules: SquadRules): number {
  const lineup = selectLineup(squad, rules);
  const benchPoints = lineup.bench.reduce(
    (total, player) =>
      total +
      (player.position === Position.GK ? player.points * 0.3 : player.points),
    0,
  );

  return lineup.startingPoints + BENCH_WEIGHT * benchPoints;
}

function squadCost(squad: Candidate[]): number {
  return squad.reduce((total, player) => total + player.price, 0);
}

function teamCounts(squad: Candidate[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const player of squad) {
    counts.set(player.teamId, (counts.get(player.teamId) ?? 0) + 1);
  }
  return counts;
}

type Pools<T extends Candidate> = {
  /** Every candidate worth considering, best first. */
  all: Record<Position, T[]>;
  /** The highest scorers: upgrade targets for pair swaps. */
  top: Record<Position, T[]>;
  /** Cheap and good-value players: downgrade targets that free up budget. */
  budget: Record<Position, T[]>;
};

function buildPools<T extends Candidate>(
  candidates: T[],
  rules: SquadRules,
): Pools<T> {
  const pools: Pools<T> = {
    all: {} as Record<Position, T[]>,
    top: {} as Record<Position, T[]>,
    budget: {} as Record<Position, T[]>,
  };

  for (const position of ALL_POSITIONS) {
    const players = candidates.filter((player) => player.position === position);
    const byPoints = [...players].sort(byPointsDesc);
    const byValue = [...players]
      .filter((player) => player.price > 0)
      .sort(
        (first, second) =>
          second.points / second.price - first.points / first.price,
      );
    const byPrice = [...players].sort(
      (first, second) =>
        first.price - second.price || second.points - first.points,
    );

    const cheapCount = Math.max(CHEAP_POOL_SIZE, rules.positions[position].squad * 2);
    const unique = (players: T[]) =>
      [...new Map(players.map((player) => [player.id, player])).values()].sort(
        byPointsDesc,
      );

    pools.all[position] = unique([
      ...byPoints.slice(0, SINGLE_POOL_SIZE),
      ...byValue.slice(0, VALUE_POOL_SIZE),
      ...byPrice.slice(0, cheapCount),
    ]);
    pools.top[position] = byPoints.slice(0, PAIR_POOL_SIZE);
    pools.budget[position] = unique([
      ...byValue.slice(0, VALUE_POOL_SIZE),
      ...byPrice.slice(0, cheapCount),
    ]);
  }

  return pools;
}

/** Cheapest legal squad, used to prove feasibility and as a starting point. */
function cheapestSquad<T extends Candidate>(
  pools: Record<Position, T[]>,
  rules: SquadRules,
): T[] | null {
  const squad: T[] = [];
  const counts = new Map<string, number>();

  for (const position of ALL_POSITIONS) {
    const cheapest = [...pools[position]].sort(
      (first, second) =>
        first.price - second.price || second.points - first.points,
    );
    let picked = 0;

    for (const player of cheapest) {
      if (picked >= rules.positions[position].squad) break;
      if ((counts.get(player.teamId) ?? 0) >= rules.maxPerTeam) continue;

      squad.push(player);
      counts.set(player.teamId, (counts.get(player.teamId) ?? 0) + 1);
      picked += 1;
    }

    if (picked < rules.positions[position].squad) {
      return null;
    }
  }

  return squadCost(squad) <= rules.budget + EPSILON ? squad : null;
}

/** Greedy squad that buys the highest scorers while keeping the rest affordable. */
function greedySquad<T extends Candidate>(
  pools: Record<Position, T[]>,
  rules: SquadRules,
): T[] | null {
  const cheapestPrices: Record<Position, number[]> = {} as Record<
    Position,
    number[]
  >;

  for (const position of ALL_POSITIONS) {
    cheapestPrices[position] = pools[position]
      .map((player) => player.price)
      .sort((first, second) => first - second);
  }

  const remainingSlots: Record<Position, number> = {
    [Position.GK]: rules.positions[Position.GK].squad,
    [Position.DEF]: rules.positions[Position.DEF].squad,
    [Position.MID]: rules.positions[Position.MID].squad,
    [Position.FWD]: rules.positions[Position.FWD].squad,
  };

  const minimumToFill = () =>
    ALL_POSITIONS.reduce(
      (total, position) =>
        total +
        cheapestPrices[position]
          .slice(0, remainingSlots[position])
          .reduce((sum, price) => sum + price, 0),
      0,
    );

  const all = ALL_POSITIONS.flatMap((position) => pools[position]).sort(
    byPointsDesc,
  );
  const squad: T[] = [];
  const counts = new Map<string, number>();
  let spent = 0;

  for (const player of all) {
    if (remainingSlots[player.position] === 0) continue;
    if ((counts.get(player.teamId) ?? 0) >= rules.maxPerTeam) continue;

    remainingSlots[player.position] -= 1;
    const reserve = minimumToFill();

    if (spent + player.price + reserve > rules.budget + EPSILON) {
      remainingSlots[player.position] += 1;
      continue;
    }

    squad.push(player);
    counts.set(player.teamId, (counts.get(player.teamId) ?? 0) + 1);
    spent += player.price;
  }

  return squad.length === rules.squadSize ? squad : null;
}

function isSwapLegal(
  squad: Candidate[],
  outgoing: Candidate[],
  incoming: Candidate[],
  rules: SquadRules,
  currentCost: number,
  counts: Map<string, number>,
): boolean {
  const cost =
    currentCost -
    outgoing.reduce((total, player) => total + player.price, 0) +
    incoming.reduce((total, player) => total + player.price, 0);

  if (cost > rules.budget + EPSILON) return false;

  const changed = new Map<string, number>();
  for (const player of outgoing) {
    changed.set(player.teamId, (changed.get(player.teamId) ?? 0) - 1);
  }
  for (const player of incoming) {
    changed.set(player.teamId, (changed.get(player.teamId) ?? 0) + 1);
  }

  for (const [teamId, delta] of changed) {
    if (delta > 0 && (counts.get(teamId) ?? 0) + delta > rules.maxPerTeam) {
      return false;
    }
  }

  return true;
}

function improve<T extends Candidate>(
  initial: T[],
  pools: Pools<T>,
  rules: SquadRules,
): T[] {
  let squad = [...initial];
  let score = objective(squad, rules);

  for (let iteration = 0; iteration < 200; iteration += 1) {
    const ids = new Set(squad.map((player) => player.id));
    const cost = squadCost(squad);
    const counts = teamCounts(squad);

    let bestSquad: T[] | null = null;
    let bestScore = score + EPSILON;

    // Single swaps.
    for (let index = 0; index < squad.length; index += 1) {
      const outgoing = squad[index];

      for (const incoming of pools.all[outgoing.position]) {
        if (ids.has(incoming.id)) continue;
        if (
          !isSwapLegal(squad, [outgoing], [incoming], rules, cost, counts)
        ) {
          continue;
        }

        const next = [...squad];
        next[index] = incoming;
        const nextScore = objective(next, rules);

        if (nextScore > bestScore) {
          bestScore = nextScore;
          bestSquad = next;
        }
      }
    }

    // Pair swaps, only when no single swap helps. Either both players are
    // upgrades, or one is a downgrade that funds an upgrade elsewhere.
    if (!bestSquad) {
      for (let first = 0; first < squad.length; first += 1) {
        for (let second = 0; second < squad.length; second += 1) {
          if (first === second) continue;

          const outA = squad[first];
          const outB = squad[second];
          const bothUpgrades = first < second;
          const poolA = bothUpgrades
            ? pools.top[outA.position]
            : pools.budget[outA.position].filter(
                (player) => player.price < outA.price,
              );
          const poolB = pools.top[outB.position];

          for (const inA of poolA) {
            if (ids.has(inA.id)) continue;

            for (const inB of poolB) {
              if (ids.has(inB.id) || inB.id === inA.id) continue;
              if (
                !isSwapLegal(
                  squad,
                  [outA, outB],
                  [inA, inB],
                  rules,
                  cost,
                  counts,
                )
              ) {
                continue;
              }

              const next = [...squad];
              next[first] = inA;
              next[second] = inB;
              const nextScore = objective(next, rules);

              if (nextScore > bestScore) {
                bestScore = nextScore;
                bestSquad = next;
              }
            }
          }
        }
      }
    }

    if (!bestSquad) break;

    squad = bestSquad;
    score = bestScore;
  }

  return squad;
}

export function pickBestSquad<T extends Candidate>(
  candidates: T[],
  rules: SquadRules,
): SquadSelection<T> {
  const pools = buildPools(candidates, rules);
  const starts = [
    cheapestSquad(pools.all, rules),
    greedySquad(pools.all, rules),
  ].filter(
    (squad): squad is T[] => squad !== null,
  );

  if (starts.length === 0) {
    throw new Error('No squad satisfies the budget and position rules');
  }

  let best: T[] | null = null;
  let bestScore = -Infinity;

  for (const start of starts) {
    const squad = improve(start, pools, rules);
    const score = objective(squad, rules);

    if (score > bestScore) {
      best = squad;
      bestScore = score;
    }
  }

  const squad = best as T[];

  return {
    ...selectLineup(squad, rules),
    squad,
    cost: Math.round(squadCost(squad) * 10) / 10,
  };
}
