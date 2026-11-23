import { useQuery } from '@apollo/client';

import { GET_PLAYER_HISTORY } from '../graphql/players';
import type { GameweekPoints } from '../graphql/players';
import type { ProjectedPlayer } from '../graphql/predictor';
import type { League } from '../lib/league';
import { DIFFICULTY_STYLES, POSITION_LABELS, formatPrice } from '../lib/format';
import { CountUp, Sparkline } from './motion';
import { MeterBar, Skeleton, TeamChip } from './ui';

/** Form sparkline from the player's recent gameweeks, with honest fallbacks. */
export function FormSparkline({
  league,
  playerId,
  form,
  height = 56,
}: {
  league: League;
  playerId: string;
  form: number;
  height?: number;
}) {
  const { data, loading, error } = useQuery<{
    playerHistory: { playerId: string; recent: GameweekPoints[] };
  }>(GET_PLAYER_HISTORY, { variables: { league, playerId } });

  const recent = data?.playerHistory.recent ?? [];

  if (loading) {
    return (
      <div style={{ height: height + 22 }}>
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (error || recent.length < 2) {
    return (
      <p className="rounded-xl bg-white/[0.03] px-3 py-3 text-xs text-muted">
        {league === 'CHAMPIONS_LEAGUE'
          ? 'Per-matchday history isn’t published in this competition’s feed.'
          : 'Not enough gameweek history yet.'}{' '}
        Current form: <span className="num font-semibold text-ink">{form.toFixed(1)}</span>
      </p>
    );
  }

  return (
    <div>
      <Sparkline
        values={recent.map((item) => item.points)}
        labels={recent.map((item) => `GW${item.gameweek}`)}
        height={height}
      />
      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-faint">
        {recent.map((item) => (
          <span key={item.gameweek} className="flex flex-col items-center">
            <span className="text-muted">{item.points}</span>GW{item.gameweek}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-3 py-2.5">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="num mt-0.5 text-lg font-semibold">{value}</p>
      {sub && <p className="text-[10px] text-faint">{sub}</p>}
    </div>
  );
}

/** Content of the "Why this pick?" slide-over. */
export default function PlayerPanel({
  item,
  league,
  currency,
  horizon = 1,
}: {
  item: ProjectedPlayer;
  league: League;
  currency: string;
  horizon?: number;
}) {
  const { player } = item;
  const availability = player.availability;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <TeamChip code={player.teamShort} size="md" />
          <span className="text-xs text-muted">
            {player.team} · {POSITION_LABELS[player.position]}
          </span>
        </div>
        <h2 className="mt-3 flex flex-wrap items-center gap-2 text-3xl font-semibold tracking-tight">
          {player.displayName}
          {item.isCaptain && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-[#04130c]">Captain</span>
          )}
          {item.isViceCaptain && (
            <span className="rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-ink/80">
              Vice-captain
            </span>
          )}
        </h2>
      </header>

      <div className="flex items-end justify-between gap-4 rounded-2xl border border-mint/20 bg-mint/[0.04] p-4">
        <div>
          <p className="text-xs text-muted">{horizon > 1 ? `Projected over ${horizon} GWs` : 'Projected points'}</p>
          <CountUp value={item.predictedPoints} className="text-accent text-5xl font-semibold" />
        </div>
        <div className="text-right text-sm">
          <p className="num font-semibold">{formatPrice(currency, player.price)}</p>
          <p className="text-xs text-muted">{player.selectedBy.toFixed(1)}% owned</p>
        </div>
      </div>

      <section>
        <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Fixture</h3>
        {item.fixtures.length === 0 ? (
          <p className="mt-2 text-sm text-warn">No fixture this gameweek (blank).</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {item.fixtures.map((fixture) => (
              <span
                key={`${fixture.gameweek}-${fixture.opponent}-${fixture.home}`}
                className={`num inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold ${DIFFICULTY_STYLES[fixture.difficulty]}`}
                title={`Difficulty ${fixture.difficulty} of 5`}
              >
                GW{fixture.gameweek} · {fixture.opponent} ({fixture.home ? 'H' : 'A'})
                <span className="opacity-70">FDR {fixture.difficulty}</span>
              </span>
            ))}
            {item.fixtures.length > 1 && (
              <span className="rounded-lg bg-mint/10 px-2.5 py-1.5 text-xs font-semibold text-mint">Double gameweek</span>
            )}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Form</h3>
        <div className="mt-2">
          <FormSparkline league={league} playerId={player.id} form={player.form} />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <Stat label="xGI / 90" value={item.xgiPer90 !== null ? item.xgiPer90.toFixed(2) : '—'} />
        <Stat
          label="Clean sheet"
          value={item.cleanSheetChance !== null ? `${Math.round(item.cleanSheetChance * 100)}%` : '—'}
        />
        <Stat label="Form" value={player.form.toFixed(1)} sub={`${player.pointsPerGame.toFixed(1)} ppg`} />
      </section>

      <section className="space-y-3">
        <div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted">Availability</span>
            <span className={`num font-semibold ${availability < 1 ? 'text-warn' : 'text-mint'}`}>
              {Math.round(availability * 100)}%
            </span>
          </div>
          <MeterBar value={availability} tone={availability < 1 ? 'warn' : 'good'} className="mt-1.5" />
          {player.news && <p className="mt-1.5 text-xs text-warn/90">{player.news}</p>}
        </div>
        <div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted">Chance of starting</span>
            <span className="num font-semibold">{Math.round(item.playProbability * 100)}%</span>
          </div>
          <MeterBar value={item.playProbability} tone={item.playProbability >= 0.6 ? 'good' : 'warn'} className="mt-1.5" delay={120} />
        </div>
      </section>

      <section>
        <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Why this pick</h3>
        <ul className="mt-2 space-y-2 text-sm text-ink/85">
          {item.reasons.map((reason, index) => (
            <li
              key={reason}
              className="animate-fade-up flex gap-2.5"
              style={{ animationDelay: `${200 + index * 60}ms` }}
            >
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-mint" />
              {reason}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
