import { useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client';

import AppLayout from '../components/AppLayout';
import { Shirt } from '../components/Decor';
import PageHero from '../components/PageHero';
import GameweekPicker from '../components/GameweekPicker';
import { ErrorPanel, Loading } from '../components/QueryState';
import { GET_INSIGHTS } from '../graphql/predictor';
import type { Insights as InsightsData, ProjectedPlayer, TeamRun } from '../graphql/predictor';
import { LEAGUES, useLeague } from '../lib/league';
import type { League } from '../lib/league';
import {
  DIFFICULTY_STYLES,
  POSITION_STYLES,
  fixtureLabel,
  formatPoints,
  formatPrice,
} from '../lib/format';

const TIP_STYLES: Record<string, { label: string; colour: string }> = {
  CAPTAIN: { label: 'Captain', colour: '#fcd34d' },
  FIXTURES: { label: 'Fixtures', colour: '#01fc7a' },
  INJURY: { label: 'Injury', colour: '#ff1751' },
  DIFFERENTIAL: { label: 'Differential', colour: '#b57bff' },
  VALUE: { label: 'Value', colour: '#05f0ff' },
  TRANSFERS: { label: 'Transfers', colour: '#6d8bff' },
  SCHEDULE: { label: 'Schedule', colour: '#e7e7e7' },
};

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-5">
      <h2 className="font-display text-2xl font-extrabold uppercase italic tracking-wide">
        <span className="mr-2 inline-block h-4 w-1.5 -skew-x-12 bg-accent align-middle" />
        {title}
      </h2>
      {subtitle && <p className="mt-0.5 text-xs font-medium text-white/55">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PlayerRow({
  item,
  rank,
  metric,
  detail,
}: {
  item: ProjectedPlayer;
  rank?: number;
  metric: string;
  detail?: string;
}) {
  const { player } = item;

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-raised/70 px-3 py-2 transition hover:bg-raised">
      {rank !== undefined && (
        <span className="stat w-5 text-center text-xl text-white/35">{rank}</span>
      )}
      <Shirt teamShort={player.teamShort} goalkeeper={player.position === 'GK'} size={34} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-bold">
          <span className="truncate">{player.displayName}</span>
          <span
            className={`shrink-0 rounded px-1.5 py-px text-[10px] font-extrabold ${POSITION_STYLES[player.position]}`}
          >
            {player.position}
          </span>
        </p>
        <p className="truncate text-xs text-white/55">
          {player.teamShort}
          {detail ? ` · ${detail}` : ''}
        </p>
      </div>
      {metric && <span className="stat text-right text-xl text-accent">{metric}</span>}
    </li>
  );
}

function CaptainChart({ picks }: { picks: ProjectedPlayer[] }) {
  const max = Math.max(...picks.map((item) => item.predictedPoints), 1);
  const [top, ...rest] = picks;

  if (!top) {
    return <p className="text-sm text-white/55">No captain picks yet.</p>;
  }

  return (
    <div>
      <div className="relative isolate flex items-center gap-4 overflow-hidden rounded-2xl bg-sweep p-4">
        <div className="absolute inset-0 -z-10 bg-ink/40" />
        <span className="relative">
          <span className="absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-amber-300 font-display text-sm font-black text-black ring-2 ring-black/40">
            C
          </span>
          <Shirt teamShort={top.player.teamShort} goalkeeper={top.player.position === 'GK'} size={60} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-white/80">Top captain pick</p>
          <p className="headline truncate text-3xl">{top.player.displayName}</p>
          <p className="truncate text-xs font-semibold text-white/75">
            {top.fixtures.map(fixtureLabel).join(', ') || 'No fixture'}
          </p>
        </div>
        <div className="text-right">
          <p className="stat text-5xl text-amber-300">{formatPoints(top.predictedPoints)}</p>
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">
            x2 = {formatPoints(top.predictedPoints * 2)}
          </p>
        </div>
      </div>

      <ol className="mt-4 space-y-3">
        {rest.map((item, index) => (
          <li key={item.player.id}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate font-bold">
                <span className="stat mr-2 text-base text-white/35">{index + 2}</span>
                {item.player.displayName}
                <span className="ml-2 text-xs font-medium text-white/50">
                  {item.fixtures.map(fixtureLabel).join(', ')}
                </span>
              </span>
              <span className="stat text-xl text-amber-300">{formatPoints(item.predictedPoints)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-raised">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300/40 to-amber-300"
                style={{ width: `${(item.predictedPoints / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function FixtureTicker({ runs }: { runs: TeamRun[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? runs : runs.slice(0, 10);
  const weeks = [...new Set(runs.flatMap((run) => run.fixtures.map((f) => f.gameweek)))].sort(
    (a, b) => a - b,
  );

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-separate border-spacing-y-1 text-sm">
          <thead>
            <tr className="eyebrow text-left text-white/50">
              <th className="px-2 py-1 font-semibold">Team</th>
              {weeks.map((week) => (
                <th key={week} className="px-1 py-1 text-center font-semibold">
                  GW{week}
                </th>
              ))}
              <th className="px-2 py-1 text-right font-semibold">Avg</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((run) => (
              <tr key={run.team}>
                <td className="whitespace-nowrap rounded-l-xl bg-raised/70 px-3 py-1.5 font-bold">
                  {run.team}
                </td>
                {weeks.map((week) => {
                  const fixtures = run.fixtures.filter((f) => f.gameweek === week);
                  return (
                    <td key={week} className="bg-raised/70 px-0.5 py-1.5">
                      {fixtures.length === 0 ? (
                        <span className="block rounded-md bg-black/30 px-1 py-1 text-center text-xs text-white/40">
                          -
                        </span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          {fixtures.map((fixture) => (
                            <span
                              key={`${fixture.opponent}-${fixture.home}`}
                              className={`block rounded-md px-1 py-1 text-center text-xs font-extrabold ${DIFFICULTY_STYLES[fixture.difficulty]}`}
                              title={`Difficulty ${fixture.difficulty}/5`}
                            >
                              {fixture.opponent} ({fixture.home ? 'H' : 'A'})
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="stat rounded-r-xl bg-raised/70 px-3 py-1.5 text-right text-lg">
                  {run.averageDifficulty.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {runs.length > 10 && (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="mt-3 rounded-full border border-line px-4 py-1.5 text-sm font-bold text-accent transition hover:bg-white/5"
        >
          {showAll ? 'Show fewer teams' : `Show all ${runs.length} teams`}
        </button>
      )}
    </>
  );
}

export default function Insights() {
  const { league } = useLeague();
  const [gameweeks, setGameweeks] = useState<Record<League, number | null>>({
    PREMIER_LEAGUE: null,
    CHAMPIONS_LEAGUE: null,
  });
  const gameweek = gameweeks[league];

  const { data, loading, error, refetch } = useQuery<{ insights: InsightsData }>(
    GET_INSIGHTS,
    { variables: { league, gameweek } },
  );

  const insights = data?.insights;
  const currency = insights?.currency ?? '£';
  const leagueLabel = LEAGUES.find((item) => item.id === league)?.label;

  return (
    <AppLayout
      hero={
        <PageHero
          eyebrow={`${leagueLabel} · ${insights?.gameweekName ?? 'Upcoming gameweek'}`}
          title={
            <>
              Scout <span className="text-accent">report</span>
            </>
          }
          description="Captaincy, differentials, value, injuries and fixture runs, from the same projections that pick the Best XI."
          actions={
            <div className="sm:w-64">
              <GameweekPicker
                league={league}
                value={gameweek}
                onChange={(value) => setGameweeks((current) => ({ ...current, [league]: value }))}
              />
            </div>
          }
        />
      }
    >
      {loading && <Loading label="Crunching the numbers..." />}
      {error && !loading && (
        <ErrorPanel title="Unable to load insights" error={error} onRetry={() => refetch()} />
      )}

      {insights && !loading && (
        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {insights.tips.map((tip) => {
              const style = TIP_STYLES[tip.category] ?? TIP_STYLES.SCHEDULE;
              return (
                <article
                  key={`${tip.category}-${tip.title}`}
                  className="rounded-2xl border border-line bg-surface p-4 pl-5"
                  style={{ boxShadow: `inset 4px 0 0 ${style.colour}` }}
                >
                  <span className="eyebrow" style={{ color: style.colour }}>
                    {style.label}
                  </span>
                  <h3 className="mt-1.5 text-[0.95rem] font-extrabold leading-snug">{tip.title}</h3>
                  <p className="mt-1 text-sm text-white/65">{tip.body}</p>
                </article>
              );
            })}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Captain picks" subtitle="Highest projected points among likely starters">
              <CaptainChart picks={insights.captainPicks} />
            </Panel>

            <Panel title="Differentials" subtitle="Owned by under 10% of managers, projected to score">
              <ul className="space-y-2">
                {insights.differentials.map((item, index) => (
                  <PlayerRow
                    key={item.player.id}
                    item={item}
                    rank={index + 1}
                    metric={`${formatPoints(item.predictedPoints)} pts`}
                    detail={`${item.player.selectedBy.toFixed(1)}% owned · ${formatPrice(currency, item.player.price)}`}
                  />
                ))}
              </ul>
            </Panel>

            <Panel title="Best value" subtitle="Projected points per million spent">
              <ul className="space-y-2">
                {insights.valuePicks.map((item, index) => (
                  <PlayerRow
                    key={item.player.id}
                    item={item}
                    rank={index + 1}
                    metric={`${(item.predictedPoints / item.player.price).toFixed(2)}/m`}
                    detail={`${formatPrice(currency, item.player.price)} · ${formatPoints(item.predictedPoints)} pts`}
                  />
                ))}
              </ul>
            </Panel>

            <Panel title="In form" subtitle="Best recent points per match">
              <ul className="space-y-2">
                {insights.inForm.map((item, index) => (
                  <PlayerRow
                    key={item.player.id}
                    item={item}
                    rank={index + 1}
                    metric={item.player.form.toFixed(1)}
                    detail={`${item.player.totalPoints} pts this season`}
                  />
                ))}
              </ul>
            </Panel>

            <Panel title="Injury & availability watch" subtitle="Popular players who may miss out">
              {insights.injuryWatch.length === 0 ? (
                <p className="text-sm text-white/55">No popular players are flagged.</p>
              ) : (
                <ul className="space-y-2">
                  {insights.injuryWatch.map((item) => (
                    <PlayerRow
                      key={item.player.id}
                      item={item}
                      metric={`${Math.round(item.player.availability * 100)}%`}
                      detail={item.player.news ?? `${item.player.selectedBy.toFixed(1)}% owned`}
                    />
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Transfer trends" subtitle="Most bought and sold this round">
              {insights.mostTransferredIn.length === 0 ? (
                <p className="text-sm text-white/55">No transfer data is available yet.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="eyebrow mb-2 text-[#01fc7a]">
                      Bought
                    </h3>
                    <ul className="space-y-2">
                      {insights.mostTransferredIn.map((item) => (
                        <PlayerRow
                          key={item.player.id}
                          item={item}
                          metric=""
                          detail={`+${item.player.transfersIn.toLocaleString()}`}
                        />
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="eyebrow mb-2 text-[#ff1751]">
                      Sold
                    </h3>
                    <ul className="space-y-2">
                      {insights.mostTransferredOut.map((item) => (
                        <PlayerRow
                          key={item.player.id}
                          item={item}
                          metric=""
                          detail={`-${item.player.transfersOut.toLocaleString()}`}
                        />
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </Panel>
          </div>

          <Panel
            title="Fixture ticker"
            subtitle="Upcoming fixtures by difficulty, easiest run first (1 = easiest, 5 = hardest)"
          >
            <FixtureTicker runs={insights.fixtureTicker} />
          </Panel>
        </div>
      )}
    </AppLayout>
  );
}
