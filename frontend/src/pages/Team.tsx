import { useState } from 'react';
import { useQuery } from '@apollo/client';

import AppLayout from '../components/AppLayout';
import PageHeader from '../components/PageHeader';
import PlayerPanel from '../components/PlayerPanel';
import SlideOver from '../components/SlideOver';
import { CountUp, TiltCard } from '../components/motion';
import { ErrorPanel } from '../components/QueryState';
import { EmptyState, Segmented, Skeleton, TeamChip } from '../components/ui';
import { GET_PREDICTED_TEAM } from '../graphql/predictor';
import type { PredictedTeam, ProjectedPlayer } from '../graphql/predictor';
import pitchImage from '../assets/pitch.webp';
import { LEAGUES, useLeague } from '../lib/league';
import { formatPoints, formatPrice } from '../lib/format';
import type { Position } from '../lib/format';

const HORIZONS = [
  { value: 1, label: '1 GW', hint: 'Free Hit: best team for this gameweek only' },
  { value: 3, label: '3 GW', hint: 'Balances this gameweek against the next two' },
  { value: 5, label: '5 GW', hint: 'Wildcard: long-term squad over five gameweeks' },
];

const HORIZON_NOTES: Record<number, string> = {
  1: 'Free Hit',
  3: 'Medium term',
  5: 'Wildcard',
};

const ROWS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

function RoleBadge({ item }: { item: ProjectedPlayer }) {
  if (!item.isCaptain && !item.isViceCaptain) return null;

  return (
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
        item.isCaptain
          ? 'bg-accent text-[#03140d] shadow-[0_0_12px_rgb(33_227_138/0.7)]'
          : 'border border-white/30 bg-black/40 text-ink'
      }`}
      title={item.isCaptain ? 'Captain' : 'Vice-captain'}
      aria-label={item.isCaptain ? 'Captain' : 'Vice-captain'}
    >
      {item.isCaptain ? 'C' : 'V'}
    </span>
  );
}

function PlayerCard({
  item,
  currency,
  order,
  onSelect,
  compact = false,
  label,
}: {
  item: ProjectedPlayer;
  currency: string;
  /** Position in the drop-in sequence. */
  order: number;
  onSelect: () => void;
  compact?: boolean;
  label?: string;
}) {
  const { player } = item;
  const doubtful = player.availability < 1;

  return (
    <div className="animate-drop" style={{ animationDelay: `${150 + order * 70}ms` }}>
      <TiltCard
        as="button"
        onClick={onSelect}
        aria-label={`${player.displayName}, ${formatPoints(item.predictedPoints)} projected points. Show why this pick.`}
        maxTilt={10}
        className={`glass flex flex-col rounded-xl text-left ${
          compact ? 'w-full p-2.5' : 'w-[4.85rem] !bg-[#0b100d]/80 p-2 sm:w-[7.25rem] sm:p-2.5'
        } ${doubtful ? '!border-warn/40' : ''}`}
      >
        <span className="flex items-center justify-between gap-1">
          <TeamChip code={player.teamShort} size="xs" />
          <RoleBadge item={item} />
        </span>
        {label && <span className="mt-1.5 font-mono text-[10px] text-faint">{label}</span>}
        <span className="mt-1.5 truncate text-[12px] font-semibold leading-tight sm:text-[13px]">
          {player.displayName}
        </span>
        <span className="mt-1 flex items-end justify-between gap-1">
          <span className="num font-mono text-[10px] text-muted sm:text-[11px]">
            {formatPrice(currency, player.price)}
          </span>
          <span className="num text-accent text-sm font-semibold sm:text-base">
            {formatPoints(item.predictedPoints)}
          </span>
        </span>
        {doubtful && (
          <span className="mt-1 truncate text-[10px] font-medium text-warn">
            {Math.round(player.availability * 100)}% to play
          </span>
        )}
      </TiltCard>
    </div>
  );
}

function Pitch({
  team,
  onSelect,
}: {
  team: PredictedTeam;
  onSelect: (id: string) => void;
}) {
  let order = 0;

  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-3xl border border-line bg-pitch"
      aria-label={`Starting XI in a ${team.formation} formation`}
      role="group"
    >
      {/* Top-down pitch artwork, goal at the top behind the goalkeeper */}
      <img
        src={pitchImage}
        alt=""
        aria-hidden="true"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, rgb(33 227 138 / 0.08), transparent 60%), linear-gradient(180deg, rgb(10 12 12 / 0.15), rgb(10 12 12 / 0.05) 40%, rgb(10 12 12 / 0.45))',
        }}
      />

      <div className="relative flex min-h-[30rem] flex-1 flex-col justify-around gap-4 px-1.5 py-7 sm:min-h-[38rem] sm:px-6">
        {ROWS.map((position) => (
          <div key={position} className="flex justify-center gap-1.5 sm:gap-4">
            {team.starters
              .filter((item) => item.player.position === position)
              .map((item) => (
                <PlayerCard
                  key={item.player.id}
                  item={item}
                  currency={team.currency}
                  order={order++}
                  onSelect={() => onSelect(item.player.id)}
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Summary({ team }: { team: PredictedTeam }) {
  const money = (value: number) => formatPrice(team.currency, value);

  return (
    <div className="glass grid gap-6 rounded-2xl p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10 sm:p-6">
      <div>
        <p className="text-xs text-muted">
          {team.horizon > 1 ? `Projected points · next ${team.horizon} GWs` : 'Projected points'}
        </p>
        <CountUp
          value={team.predictedPoints}
          className="text-accent block text-6xl font-semibold leading-none tracking-[-0.04em] sm:text-7xl"
        />
      </div>
      <dl className="grid grid-cols-3 gap-3 sm:border-l sm:border-line sm:pl-10">
        <div>
          <dt className="text-xs text-muted">Formation</dt>
          <dd className="num mt-1 text-xl font-semibold sm:text-2xl">{team.formation}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Squad cost</dt>
          <dd className="mt-1 text-xl font-semibold sm:text-2xl">
            <CountUp value={team.totalCost} format={money} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">In the bank</dt>
          <dd className="mt-1 text-xl font-semibold text-mint sm:text-2xl">
            <CountUp value={team.bank} format={money} />
          </dd>
        </div>
      </dl>
    </div>
  );
}

function TeamSkeleton() {
  return (
    <div aria-busy="true" aria-label="Building your team">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-3xl border border-line bg-pitch p-6">
          {[1, 4, 4, 2].map((count, row) => (
            <div key={row} className="my-10 flex justify-center gap-3">
              {Array.from({ length: count }, (_, index) => (
                <Skeleton key={index} className="h-[5.5rem] w-[4.85rem] rounded-xl sm:w-[7.25rem]" />
              ))}
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamView({ team }: { team: PredictedTeam }) {
  const { league } = useLeague();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const all = [...team.starters, ...team.bench];
  const selected = all.find((item) => item.player.id === selectedId) ?? null;
  const captain = team.starters.find((item) => item.isCaptain);

  return (
    <>
      <Summary team={team} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Pitch team={team} onSelect={setSelectedId} />

        <aside className="space-y-6">
          <section>
            <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Bench · in order</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1">
              {team.bench.map((item, index) => (
                <PlayerCard
                  key={item.player.id}
                  item={item}
                  currency={team.currency}
                  order={team.starters.length + index}
                  onSelect={() => setSelectedId(item.player.id)}
                  compact
                  label={index === 0 ? 'GK' : `SUB ${index}`}
                />
              ))}
            </div>
          </section>

          {captain && (
            <button
              type="button"
              onClick={() => setSelectedId(captain.player.id)}
              className="glass w-full rounded-2xl p-4 text-left transition hover:border-mint/30"
            >
              <p className="text-xs text-muted">Captain · points count twice</p>
              <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
                {captain.player.displayName}
                <TeamChip code={captain.player.teamShort} size="xs" />
              </p>
              <p className="num text-accent mt-1 text-2xl font-semibold">
                {formatPoints(captain.predictedPoints * 2)}
                <span className="ml-1 text-sm text-muted">pts with armband</span>
              </p>
            </button>
          )}

          <p className="text-xs leading-relaxed text-faint">
            Built from expected-points projections (underlying stats, form, fixture difficulty and the chance
            each player starts), within a {team.currency}
            {team.budget}m budget, max 3 players per club and legal formations.
          </p>
        </aside>
      </div>

      <SlideOver open={selected !== null} onClose={() => setSelectedId(null)} title="Why this pick?">
        {selected && (
          <PlayerPanel item={selected} league={league} currency={team.currency} horizon={team.horizon} />
        )}
      </SlideOver>
    </>
  );
}

export default function Team() {
  const { league, gameweek } = useLeague();
  const [horizon, setHorizon] = useState(1);

  const { data, loading, error, refetch } = useQuery<{ predictedTeam: PredictedTeam }>(
    GET_PREDICTED_TEAM,
    { variables: { league, gameweek, horizon } },
  );

  const team = data?.predictedTeam;
  const leagueLabel = LEAGUES.find((item) => item.id === league)?.label;

  return (
    <AppLayout
      header={
        <PageHeader
          key={league}
          eyebrow={`${leagueLabel} · ${team?.gameweekName ?? 'Upcoming gameweek'}`}
          title="Your best XI"
          accentWords={['XI']}
          description="The highest-projected legal squad for the gameweek, built from live fantasy data."
          aside={
            <div className="flex flex-col gap-2 lg:items-end">
              <span className="text-xs text-muted">Plan for · {HORIZON_NOTES[horizon]}</span>
              <Segmented label="Plan for" options={HORIZONS} value={horizon} onChange={setHorizon} />
            </div>
          }
        />
      }
    >
      {loading && <TeamSkeleton />}
      {error && !loading && (
        <ErrorPanel title="Unable to build a team" error={error} onRetry={() => refetch()} />
      )}
      {!loading && !error && team && team.starters.length === 0 && (
        <EmptyState
          title="No team for this gameweek yet"
          body="Fixtures or player data for this gameweek haven't been published. Try another gameweek."
        />
      )}
      {team && !loading && team.starters.length > 0 && (
        <TeamView key={`${team.league}-${team.gameweek}-${team.horizon}`} team={team} />
      )}
    </AppLayout>
  );
}
