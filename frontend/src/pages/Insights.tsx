import { useState } from 'react';
import { useQuery } from '@apollo/client';

import AppLayout from '../components/AppLayout';
import PageHeader from '../components/PageHeader';
import PlayerPanel from '../components/PlayerPanel';
import SlideOver from '../components/SlideOver';
import { TiltCard } from '../components/motion';
import { ErrorPanel } from '../components/QueryState';
import { EmptyState, MeterBar, Panel, PositionTag, Skeleton, TeamChip } from '../components/ui';
import { GET_INSIGHTS } from '../graphql/predictor';
import type { Insights as InsightsData, ProjectedPlayer, TeamRun, Tip } from '../graphql/predictor';
import { LEAGUES, useLeague } from '../lib/league';
import { DIFFICULTY_STYLES, fixtureLabel, formatPoints, formatPrice } from '../lib/format';

type Tone = 'good' | 'warn' | 'neutral';

const TIP_TAGS: Record<string, { label: string; tone: Tone }> = {
  SCHEDULE: { label: 'Deadline', tone: 'neutral' },
  CAPTAIN: { label: 'Captain', tone: 'good' },
  FIXTURES: { label: 'Fixtures', tone: 'neutral' },
  INJURY: { label: 'Injury', tone: 'warn' },
  DIFFERENTIAL: { label: 'Differential', tone: 'good' },
  VALUE: { label: 'Value', tone: 'good' },
  TRANSFERS: { label: 'Transfers', tone: 'neutral' },
};

function tagFor(tip: Tip): { label: string; tone: Tone } {
  // Double and blank gameweeks arrive as schedule/fixture tips; tag them by name.
  if (/double gameweek/i.test(tip.title + tip.body)) return { label: 'Double GW', tone: 'good' };
  if (/blank/i.test(tip.title + tip.body)) return { label: 'Blank GW', tone: 'warn' };
  return TIP_TAGS[tip.category] ?? { label: tip.category, tone: 'neutral' };
}

/** The captain call is the headline of the week, so it gets the large bento tile. */
function orderedTips(tips: Tip[]): Tip[] {
  const featured = tips.findIndex((tip) => tip.category === 'CAPTAIN');
  if (featured <= 0) return tips;
  return [tips[featured], ...tips.slice(0, featured), ...tips.slice(featured + 1)];
}

const TONE_STYLES: Record<Tone, string> = {
  good: 'bg-mint/10 text-mint ring-mint/25',
  warn: 'bg-warn/10 text-warn ring-warn/25',
  neutral: 'bg-white/[0.05] text-ink/75 ring-white/10',
};

function TipCard({ tip, featured, index }: { tip: Tip; featured: boolean; index: number }) {
  const tag = tagFor(tip);

  return (
    <div
      className={`animate-fade-up ${featured ? 'sm:col-span-2 lg:row-span-2' : ''}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <TiltCard as="article" className={`glass flex h-full flex-col rounded-2xl ${featured ? 'p-6' : 'p-4'}`}>
        <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${TONE_STYLES[tag.tone]}`}>
          {tag.label}
        </span>
        <h3
          className={`mt-3 font-semibold tracking-tight ${featured ? 'text-2xl leading-tight sm:text-3xl' : 'text-[15px] leading-snug'}`}
        >
          {tip.title}
        </h3>
        <p className={`mt-1.5 text-muted ${featured ? 'text-sm sm:text-base' : 'text-[13px]'}`}>{tip.body}</p>
      </TiltCard>
    </div>
  );
}

function PlayerRow({
  item,
  rank,
  metric,
  detail,
  onSelect,
}: {
  item: ProjectedPlayer;
  rank?: number;
  metric?: string;
  detail?: string;
  onSelect: () => void;
}) {
  const { player } = item;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-white/[0.04]"
      >
        {rank !== undefined && <span className="num w-4 text-center font-mono text-xs text-faint">{rank}</span>}
        <TeamChip code={player.teamShort} size="xs" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">{player.displayName}</span>
            <PositionTag position={player.position} />
          </span>
          {detail && <span className="block truncate text-xs text-muted">{detail}</span>}
        </span>
        {metric && <span className="num text-accent shrink-0 text-sm font-semibold">{metric}</span>}
        <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-faint opacity-0 transition group-hover:opacity-100" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 5l5 5-5 5" />
        </svg>
      </button>
    </li>
  );
}

function CaptainShortlist({ picks, onSelect }: { picks: ProjectedPlayer[]; onSelect: (item: ProjectedPlayer) => void }) {
  const max = Math.max(...picks.map((item) => item.predictedPoints), 1);

  if (picks.length === 0) {
    return <EmptyState title="No captain picks" body="No likely starters have fixtures in this gameweek." />;
  }

  return (
    <ol className="space-y-3.5">
      {picks.map((item, index) => (
        <li key={item.player.id}>
          <button type="button" onClick={() => onSelect(item)} className="w-full text-left">
            <span className="flex items-baseline justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="num w-4 font-mono text-xs text-faint">{index + 1}</span>
                <span className="truncate font-medium">{item.player.displayName}</span>
                <TeamChip code={item.player.teamShort} size="xs" />
                <span className="hidden truncate font-mono text-[11px] text-faint sm:inline">
                  {item.fixtures.map(fixtureLabel).join(', ')}
                </span>
              </span>
              <span className={`num font-semibold ${index === 0 ? 'text-accent' : 'text-ink'}`}>
                {formatPoints(item.predictedPoints)}
              </span>
            </span>
            <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <span
                className={`animate-grow block h-full rounded-full ${index === 0 ? 'bg-accent shadow-[0_0_12px_rgb(60_245_160/0.6)]' : 'bg-white/25'}`}
                style={{ width: `${(item.predictedPoints / max) * 100}%`, animationDelay: `${200 + index * 80}ms` }}
              />
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function FixtureTicker({ runs }: { runs: TeamRun[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? runs : runs.slice(0, 10);
  const weeks = [...new Set(runs.flatMap((run) => run.fixtures.map((f) => f.gameweek)))]
    .sort((a, b) => a - b)
    .slice(0, 5);

  if (runs.length === 0) {
    return <EmptyState title="No upcoming fixtures" body="The fixture list for the next gameweeks isn't available yet." />;
  }

  return (
    <>
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[34rem] border-separate border-spacing-1 text-sm">
          <thead>
            <tr className="text-left font-mono text-[11px] text-faint">
              <th className="px-2 py-1 font-medium">Team</th>
              {weeks.map((week) => (
                <th key={week} className="px-1 py-1 text-center font-medium">
                  GW{week}
                </th>
              ))}
              <th className="px-2 py-1 text-right font-medium">Avg</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((run, rowIndex) => (
              <tr key={run.team} className="animate-fade-up" style={{ animationDelay: `${rowIndex * 35}ms` }}>
                <td className="whitespace-nowrap px-2 py-1">
                  <span className="flex items-center gap-2">
                    <TeamChip code={run.teamShort} size="xs" />
                    <span className="hidden text-[13px] text-muted lg:inline">{run.team}</span>
                  </span>
                </td>
                {weeks.map((week) => {
                  const fixtures = run.fixtures.filter((f) => f.gameweek === week);
                  return (
                    <td key={week} className="p-0">
                      {fixtures.length === 0 ? (
                        <span className="block rounded-md bg-white/[0.02] py-1.5 text-center font-mono text-[11px] text-faint ring-1 ring-inset ring-white/[0.05]">
                          blank
                        </span>
                      ) : (
                        <span className="flex flex-col gap-0.5">
                          {fixtures.map((fixture) => (
                            <span
                              key={`${fixture.opponent}-${fixture.home}`}
                              className={`block rounded-md py-1.5 text-center font-mono text-[11px] font-semibold ${DIFFICULTY_STYLES[fixture.difficulty]}`}
                              title={`Difficulty ${fixture.difficulty} of 5`}
                            >
                              {fixture.opponent}
                              <span className="opacity-60"> {fixture.home ? 'H' : 'A'}</span>
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="num px-2 text-right font-semibold">{run.averageDifficulty.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-faint">
          Easier
          {[1, 2, 3, 4, 5].map((level) => (
            <span key={level} className={`rounded px-1.5 py-0.5 ${DIFFICULTY_STYLES[level]}`}>
              {level}
            </span>
          ))}
          Harder
        </div>
        {runs.length > 10 && (
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="text-xs font-medium text-mint hover:underline"
          >
            {showAll ? 'Show fewer teams' : `Show all ${runs.length} teams`}
          </button>
        )}
      </div>
    </>
  );
}

function InsightsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading insights" className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-56 rounded-2xl sm:col-span-2 lg:row-span-2 lg:h-auto" />
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-72 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function Insights() {
  const { league, gameweek } = useLeague();
  const [selected, setSelected] = useState<ProjectedPlayer | null>(null);

  const { data, loading, error, refetch } = useQuery<{ insights: InsightsData }>(GET_INSIGHTS, {
    variables: { league, gameweek },
  });

  const insights = data?.insights;
  const currency = insights?.currency ?? '£';
  const leagueLabel = LEAGUES.find((item) => item.id === league)?.label;

  return (
    <AppLayout
      header={
        <PageHeader
          key={league}
          eyebrow={`${leagueLabel} · ${insights?.gameweekName ?? 'Upcoming gameweek'}`}
          title="Insights for the week"
          accentWords={['week']}
          description="Captaincy, differentials, value, injuries and fixture runs, from the same projections that pick the Best XI."
        />
      }
    >
      {loading && <InsightsSkeleton />}
      {error && !loading && <ErrorPanel title="Unable to load insights" error={error} onRetry={() => refetch()} />}

      {insights && !loading && (
        <div className="space-y-6">
          {insights.tips.length > 0 ? (
            <section className="grid auto-rows-[minmax(8.5rem,auto)] gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Tips">
              {orderedTips(insights.tips).map((tip, index) => (
                <TipCard key={`${tip.category}-${tip.title}`} tip={tip} featured={index === 0} index={index} />
              ))}
            </section>
          ) : (
            <EmptyState title="No tips yet" body="Tips appear once fixtures and player data for this gameweek are published." />
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Captain shortlist" subtitle="Projected points among likely starters">
              <CaptainShortlist picks={insights.captainPicks} onSelect={setSelected} />
            </Panel>

            <Panel title="Differentials" subtitle="Under 10% owned, projected to score">
              {insights.differentials.length === 0 ? (
                <EmptyState title="No differentials found" />
              ) : (
                <ul className="-mx-2">
                  {insights.differentials.map((item, index) => (
                    <PlayerRow
                      key={item.player.id}
                      item={item}
                      rank={index + 1}
                      metric={formatPoints(item.predictedPoints)}
                      detail={`${item.player.selectedBy.toFixed(1)}% owned · ${formatPrice(currency, item.player.price)}`}
                      onSelect={() => setSelected(item)}
                    />
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Best value" subtitle="Projected points per million">
              <ul className="-mx-2">
                {insights.valuePicks.map((item, index) => (
                  <PlayerRow
                    key={item.player.id}
                    item={item}
                    rank={index + 1}
                    metric={(item.predictedPoints / item.player.price).toFixed(2)}
                    detail={`${formatPrice(currency, item.player.price)} · ${formatPoints(item.predictedPoints)} pts`}
                    onSelect={() => setSelected(item)}
                  />
                ))}
              </ul>
            </Panel>

            <Panel title="In form" subtitle="Best recent points per match">
              <ul className="-mx-2">
                {insights.inForm.map((item, index) => (
                  <PlayerRow
                    key={item.player.id}
                    item={item}
                    rank={index + 1}
                    metric={item.player.form.toFixed(1)}
                    detail={`${item.player.totalPoints} pts this season`}
                    onSelect={() => setSelected(item)}
                  />
                ))}
              </ul>
            </Panel>

            <Panel title="Injury watch" subtitle="Popular players who may miss out">
              {insights.injuryWatch.length === 0 ? (
                <EmptyState icon="check" title="All clear" body="No popular players are flagged this week." />
              ) : (
                <ul className="space-y-3">
                  {insights.injuryWatch.map((item, index) => (
                    <li key={item.player.id}>
                      <button type="button" onClick={() => setSelected(item)} className="w-full text-left">
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <TeamChip code={item.player.teamShort} size="xs" />
                            <span className="truncate text-sm font-medium">{item.player.displayName}</span>
                          </span>
                          <span className="num text-sm font-semibold text-warn">
                            {Math.round(item.player.availability * 100)}%
                          </span>
                        </span>
                        <MeterBar value={item.player.availability} tone="warn" className="mt-1.5" delay={index * 60} />
                        <span className="mt-1 block truncate text-xs text-muted">
                          {item.player.news ?? `${item.player.selectedBy.toFixed(1)}% owned`}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Transfer trends" subtitle="Most bought and sold this round">
              {insights.mostTransferredIn.length === 0 ? (
                <EmptyState title="No transfer data yet" />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { title: 'In', items: insights.mostTransferredIn, sign: '+', good: true, key: 'transfersIn' as const },
                    { title: 'Out', items: insights.mostTransferredOut, sign: '−', good: false, key: 'transfersOut' as const },
                  ].map((column) => (
                    <div key={column.title}>
                      <h3 className={`text-[11px] font-medium uppercase tracking-[0.14em] ${column.good ? 'text-mint' : 'text-warn'}`}>
                        {column.good ? '↑ ' : '↓ '}
                        {column.title}
                      </h3>
                      <ul className="mt-2 space-y-2.5">
                        {column.items.map((item) => (
                          <li key={item.player.id}>
                            <button type="button" onClick={() => setSelected(item)} className="w-full text-left">
                              <span className="block truncate text-sm font-medium">{item.player.displayName}</span>
                              <span className={`num block font-mono text-[11px] ${column.good ? 'text-mint/80' : 'text-warn/80'}`}>
                                {column.sign}
                                {item.player[column.key].toLocaleString()}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <Panel title="Fixture ticker" subtitle="Next 5 gameweeks, easiest run first">
            <FixtureTicker runs={insights.fixtureTicker} />
          </Panel>
        </div>
      )}

      <SlideOver open={selected !== null} onClose={() => setSelected(null)} title="Why this pick?">
        {selected && <PlayerPanel item={selected} league={league} currency={currency} />}
      </SlideOver>
    </AppLayout>
  );
}
