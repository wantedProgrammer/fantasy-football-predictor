import { useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client';

import AppLayout from '../components/AppLayout';
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

const TIP_STYLES: Record<string, { label: string; className: string }> = {
  CAPTAIN: { label: 'Captain', className: 'bg-amber-400/15 text-amber-300' },
  FIXTURES: { label: 'Fixtures', className: 'bg-sky-400/15 text-sky-300' },
  INJURY: { label: 'Injury', className: 'bg-red-400/15 text-red-300' },
  DIFFERENTIAL: { label: 'Differential', className: 'bg-violet-400/15 text-violet-300' },
  VALUE: { label: 'Value', className: 'bg-emerald-400/15 text-emerald-300' },
  TRANSFERS: { label: 'Transfers', className: 'bg-indigo-400/15 text-indigo-300' },
  SCHEDULE: { label: 'Schedule', className: 'bg-slate-400/15 text-slate-300' },
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
    <section className="rounded-2xl border border-white/10 bg-slate-900 p-5">
      <h2 className="text-lg font-bold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
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
    <li className="flex items-center gap-3 rounded-xl bg-slate-800/60 px-3 py-2">
      {rank !== undefined && (
        <span className="w-5 text-center text-sm font-bold text-slate-500">{rank}</span>
      )}
      <span
        className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${POSITION_STYLES[player.position]}`}
      >
        {player.position}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{player.displayName}</p>
        <p className="truncate text-xs text-slate-400">
          {player.teamShort}
          {detail ? ` · ${detail}` : ''}
        </p>
      </div>
      <span className="text-right text-sm font-bold text-emerald-300">{metric}</span>
    </li>
  );
}

function CaptainChart({ picks }: { picks: ProjectedPlayer[] }) {
  const max = Math.max(...picks.map((item) => item.predictedPoints), 1);

  return (
    <ol className="space-y-3">
      {picks.map((item, index) => (
        <li key={item.player.id}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-semibold">
              {index === 0 && <span className="mr-1 text-amber-300">★</span>}
              {item.player.displayName}
              <span className="ml-2 text-xs font-normal text-slate-400">
                {item.fixtures.map(fixtureLabel).join(', ')}
              </span>
            </span>
            <span className="font-bold text-amber-300">
              {formatPoints(item.predictedPoints)}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full ${index === 0 ? 'bg-amber-300' : 'bg-amber-300/50'}`}
              style={{ width: `${(item.predictedPoints / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
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
            <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
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
                <td className="whitespace-nowrap rounded-l-lg bg-slate-800/60 px-2 py-1.5 font-semibold">
                  {run.team}
                </td>
                {weeks.map((week) => {
                  const fixtures = run.fixtures.filter((f) => f.gameweek === week);
                  return (
                    <td key={week} className="bg-slate-800/60 px-1 py-1.5">
                      {fixtures.length === 0 ? (
                        <span className="block rounded bg-slate-700 px-1 py-1 text-center text-xs text-slate-400">
                          -
                        </span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          {fixtures.map((fixture) => (
                            <span
                              key={`${fixture.opponent}-${fixture.home}`}
                              className={`block rounded px-1 py-1 text-center text-xs font-bold ${DIFFICULTY_STYLES[fixture.difficulty]}`}
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
                <td className="rounded-r-lg bg-slate-800/60 px-2 py-1.5 text-right font-bold">
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
          className="mt-3 text-sm font-semibold text-emerald-400 hover:underline"
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
    <AppLayout>
      <section className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
            {leagueLabel}
          </p>
          <h1 className="mt-1 text-3xl font-black sm:text-4xl">
            Insights{insights ? `: ${insights.gameweekName}` : ''}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Captaincy, differentials, value, injuries and fixture runs, from the same projections
            that pick the Best XI.
          </p>
        </div>
        <div className="sm:w-60">
          <GameweekPicker
            league={league}
            value={gameweek}
            onChange={(value) => setGameweeks((current) => ({ ...current, [league]: value }))}
          />
        </div>
      </section>

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
                  className="rounded-2xl border border-white/10 bg-slate-900 p-4"
                >
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${style.className}`}
                  >
                    {style.label}
                  </span>
                  <h3 className="mt-2 font-bold">{tip.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{tip.body}</p>
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
                <p className="text-sm text-slate-400">No popular players are flagged.</p>
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
                <p className="text-sm text-slate-400">No transfer data is available yet.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
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
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-400">
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
