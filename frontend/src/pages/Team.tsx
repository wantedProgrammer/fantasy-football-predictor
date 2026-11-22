import { useState } from 'react';
import { useQuery } from '@apollo/client';

import AppLayout from '../components/AppLayout';
import GameweekPicker from '../components/GameweekPicker';
import { ErrorPanel, Loading } from '../components/QueryState';
import { GET_PREDICTED_TEAM } from '../graphql/predictor';
import type { PredictedTeam, ProjectedPlayer } from '../graphql/predictor';
import { LEAGUES, useLeague } from '../lib/league';
import type { League } from '../lib/league';
import {
  DIFFICULTY_STYLES,
  POSITION_LABELS,
  fixtureLabel,
  formatPoints,
  formatPrice,
  plural,
} from '../lib/format';
import type { Position } from '../lib/format';

const HORIZONS = [
  { value: 1, label: 'This gameweek only', hint: 'Best one-week team, like a Free Hit' },
  { value: 3, label: 'Next 3 gameweeks', hint: 'Balances this week against the next two' },
  { value: 5, label: 'Next 5 gameweeks', hint: 'Long-term squad, like a Wildcard' },
];

const ROWS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

function PitchPlayer({
  item,
  currency,
  selected,
  onSelect,
}: {
  item: ProjectedPlayer;
  currency: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { player } = item;
  const doubtful = player.availability < 1;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex w-[4.75rem] flex-col items-center rounded-xl p-1.5 text-center transition sm:w-28 sm:p-2 ${
        selected ? 'bg-white/25 ring-2 ring-white' : 'hover:bg-white/10'
      }`}
    >
      {(item.isCaptain || item.isViceCaptain) && (
        <span
          className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black ${
            item.isCaptain ? 'bg-amber-300 text-slate-950' : 'bg-slate-200 text-slate-900'
          }`}
          title={item.isCaptain ? 'Captain' : 'Vice-captain'}
        >
          {item.isCaptain ? 'C' : 'V'}
        </span>
      )}

      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-[10px] font-black sm:h-12 sm:w-12 sm:text-xs ${
          doubtful
            ? 'border-amber-300 bg-amber-200 text-amber-950'
            : 'border-white/70 bg-slate-950 text-white'
        }`}
      >
        {player.teamShort}
      </span>

      <span className="mt-1 w-full truncate rounded bg-slate-950/90 px-1 py-0.5 text-[11px] font-semibold sm:text-xs">
        {player.displayName}
      </span>
      <span className="w-full rounded-b bg-emerald-300 px-1 text-[11px] font-bold text-emerald-950 sm:text-xs">
        {formatPoints(item.predictedPoints)} pts
      </span>
      <span className="mt-0.5 hidden text-[11px] text-white/80 sm:block">
        {item.fixtures.length > 0
          ? item.fixtures.map(fixtureLabel).join(', ')
          : 'No fixture'}{' '}
        · {formatPrice(currency, player.price)}
      </span>
    </button>
  );
}

function PlayerDetails({
  item,
  currency,
  horizon,
}: {
  item: ProjectedPlayer;
  currency: string;
  horizon: number;
}) {
  const { player } = item;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
        {player.team} · {POSITION_LABELS[player.position]}
      </p>
      <h3 className="mt-1 text-2xl font-bold">
        {player.displayName}
        {item.isCaptain && <span className="ml-2 text-base text-amber-300">(Captain)</span>}
        {item.isViceCaptain && <span className="ml-2 text-base text-slate-300">(Vice)</span>}
      </h3>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-800 p-3">
          <dt className="text-xs text-slate-400">
            {horizon > 1 ? `${horizon} GW proj.` : 'Projected'}
          </dt>
          <dd className="text-xl font-black text-emerald-300">
            {formatPoints(item.predictedPoints)}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-800 p-3">
          <dt className="text-xs text-slate-400">Price</dt>
          <dd className="text-xl font-black">{formatPrice(currency, player.price)}</dd>
        </div>
        <div className="rounded-xl bg-slate-800 p-3">
          <dt className="text-xs text-slate-400">Owned</dt>
          <dd className="text-xl font-black">{player.selectedBy.toFixed(1)}%</dd>
        </div>
      </dl>

      {item.fixtures.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {item.fixtures.map((fixture) => (
            <span
              key={`${fixture.gameweek}-${fixture.opponent}-${fixture.home}`}
              className={`rounded-lg px-2 py-1 text-xs font-bold ${DIFFICULTY_STYLES[fixture.difficulty]}`}
            >
              {fixtureLabel(fixture)} · {fixture.difficulty}
            </span>
          ))}
        </div>
      )}

      <h4 className="mt-5 text-sm font-semibold text-slate-300">Why this pick</h4>
      <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
        {item.reasons.map((reason) => (
          <li key={reason} className="flex gap-2">
            <span className="text-emerald-400">•</span>
            <span>{reason}</span>
          </li>
        ))}
        <li className="flex gap-2">
          <span className="text-emerald-400">•</span>
          <span>
            Season: {player.totalPoints} pts, {plural(player.goals, 'goal')},{' '}
            {plural(player.assists, 'assist')}
          </span>
        </li>
      </ul>
    </div>
  );
}

function TeamView({ team }: { team: PredictedTeam }) {
  const captain = team.starters.find((item) => item.isCaptain) ?? team.starters[0];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const all = [...team.starters, ...team.bench];
  const selected = all.find((item) => item.player.id === selectedId) ?? captain;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div>
        <div
          className="relative overflow-hidden rounded-3xl border border-emerald-300/20 bg-gradient-to-b from-emerald-700 to-emerald-900 px-1 py-5 sm:px-4"
          aria-label={`Starting XI in a ${team.formation} formation`}
        >
          {/* Pitch markings */}
          <div className="pointer-events-none absolute inset-3 rounded-2xl border-2 border-white/15" />
          <div className="pointer-events-none absolute left-1/2 top-3 h-16 w-40 -translate-x-1/2 rounded-b-2xl border-2 border-t-0 border-white/15" />
          <div className="pointer-events-none absolute bottom-3 left-1/2 h-16 w-40 -translate-x-1/2 rounded-t-2xl border-2 border-b-0 border-white/15" />

          <div className="relative space-y-4 sm:space-y-6">
            {ROWS.map((position) => (
              <div key={position} className="flex flex-wrap justify-center gap-0.5 sm:gap-3">
                {team.starters
                  .filter((item) => item.player.position === position)
                  .map((item) => (
                    <PitchPlayer
                      key={item.player.id}
                      item={item}
                      currency={team.currency}
                      selected={selected?.player.id === item.player.id}
                      onSelect={() => setSelectedId(item.player.id)}
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Bench
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {team.bench.map((item, index) => (
              <button
                key={item.player.id}
                type="button"
                onClick={() => setSelectedId(item.player.id)}
                className={`rounded-xl p-3 text-left transition ${
                  selected?.player.id === item.player.id
                    ? 'bg-slate-700 ring-1 ring-emerald-400'
                    : 'bg-slate-800 hover:bg-slate-700'
                }`}
              >
                <p className="text-xs text-slate-400">
                  {index === 0 ? 'GK' : `Sub ${index}`} · {item.player.teamShort}
                </p>
                <p className="truncate font-semibold">{item.player.displayName}</p>
                <p className="text-xs text-slate-400">
                  {formatPoints(item.predictedPoints)} pts ·{' '}
                  {formatPrice(team.currency, item.player.price)}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        {selected && (
          <PlayerDetails item={selected} currency={team.currency} horizon={team.horizon} />
        )}

        <div className="rounded-2xl border border-white/10 bg-slate-900 p-5 text-sm text-slate-400">
          <h3 className="font-semibold text-slate-200">How this team is built</h3>
          <p className="mt-2">
            Each player gets an expected-points projection from their underlying stats, recent
            form, fixture difficulty and the chance they play. The optimiser then searches for
            the 15-man squad with the highest-scoring XI within the {team.currency}
            {team.budget}m budget, a maximum of 3 players per club and legal formations. The captain's points count twice.
          </p>
        </div>
      </aside>
    </div>
  );
}

export default function Team() {
  const { league } = useLeague();
  const [gameweeks, setGameweeks] = useState<Record<League, number | null>>({
    PREMIER_LEAGUE: null,
    CHAMPIONS_LEAGUE: null,
  });
  const [horizon, setHorizon] = useState(1);
  const gameweek = gameweeks[league];

  const { data, loading, error, refetch } = useQuery<{ predictedTeam: PredictedTeam }>(
    GET_PREDICTED_TEAM,
    { variables: { league, gameweek, horizon } },
  );

  const team = data?.predictedTeam;
  const leagueLabel = LEAGUES.find((item) => item.id === league)?.label;

  return (
    <AppLayout>
      <section className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
            {leagueLabel}
          </p>
          <h1 className="mt-1 text-3xl font-black sm:text-4xl">
            Best XI{team ? `: ${team.gameweekName}` : ''}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            The highest-projected legal squad for the gameweek, picked from live fantasy data.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:w-[30rem]">
          <GameweekPicker
            league={league}
            value={gameweek}
            onChange={(value) =>
              setGameweeks((current) => ({ ...current, [league]: value }))
            }
          />
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Plan for
            </span>
            <select
              value={horizon}
              onChange={(event) => setHorizon(Number(event.target.value))}
              className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-sm outline-none focus:border-emerald-400"
            >
              {HORIZONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-slate-500">
              {HORIZONS.find((option) => option.value === horizon)?.hint}
            </span>
          </label>
        </div>
      </section>

      {team && !loading && (
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: team.horizon > 1 ? `Projected (${team.horizon} GWs)` : 'Projected points',
              value: formatPoints(team.predictedPoints),
              accent: 'text-emerald-300',
            },
            { label: 'Formation', value: team.formation, accent: 'text-white' },
            {
              label: 'Squad cost',
              value: formatPrice(team.currency, team.totalCost),
              accent: 'text-white',
            },
            {
              label: 'In the bank',
              value: formatPrice(team.currency, team.bank),
              accent: 'text-sky-300',
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <p className="text-xs text-slate-400">{stat.label}</p>
              <p className={`mt-1 text-2xl font-black ${stat.accent}`}>{stat.value}</p>
            </div>
          ))}
        </section>
      )}

      {loading && <Loading label="Running the optimiser..." />}
      {error && !loading && (
        <ErrorPanel title="Unable to build a team" error={error} onRetry={() => refetch()} />
      )}
      {team && !loading && <TeamView key={`${team.league}-${team.gameweek}-${team.horizon}`} team={team} />}
    </AppLayout>
  );
}
