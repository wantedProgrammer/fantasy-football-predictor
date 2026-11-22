import { useState } from 'react';
import { useQuery } from '@apollo/client';

import AppLayout from '../components/AppLayout';
import { Shirt } from '../components/Decor';
import GameweekPicker from '../components/GameweekPicker';
import PageHero from '../components/PageHero';
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
  { value: 1, label: '1 GW', title: 'This gameweek only', hint: 'Best one-week team, like a Free Hit' },
  { value: 3, label: '3 GWs', title: 'Next 3 gameweeks', hint: 'Balances this week against the next two' },
  { value: 5, label: '5 GWs', title: 'Next 5 gameweeks', hint: 'Long-term squad, like a Wildcard' },
];

const ROWS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

function Armband({ captain }: { captain: boolean }) {
  return (
    <span
      className={`absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full font-display text-xs font-black ring-2 ring-black/40 ${
        captain ? 'bg-amber-300 text-black' : 'bg-white text-black'
      }`}
      title={captain ? 'Captain' : 'Vice-captain'}
    >
      {captain ? 'C' : 'V'}
    </span>
  );
}

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
      className={`group relative flex w-[4.6rem] flex-col items-center text-center transition sm:w-[6.5rem] ${
        selected ? 'scale-105' : 'hover:-translate-y-0.5'
      }`}
    >
      <span className="relative">
        {(item.isCaptain || item.isViceCaptain) && <Armband captain={item.isCaptain} />}
        {doubtful && (
          <span
            className="absolute -left-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[11px] font-black text-black ring-2 ring-black/40"
            title={`${Math.round(player.availability * 100)}% chance of playing`}
          >
            !
          </span>
        )}
        <Shirt teamShort={player.teamShort} goalkeeper={player.position === 'GK'} size={52} />
      </span>

      <span
        className={`mt-0.5 w-full overflow-hidden rounded-md shadow-lg shadow-black/30 ${
          selected ? 'ring-2 ring-accent' : ''
        }`}
      >
        <span className="block truncate bg-white px-1 py-0.5 text-[11px] font-extrabold text-ink sm:text-xs">
          {player.displayName}
        </span>
        <span className="flex items-center justify-between gap-1 bg-ink px-1.5 py-0.5 text-[10px] font-semibold text-white/75 sm:text-[11px]">
          <span className="hidden truncate sm:inline">
            {item.fixtures.length > 0 ? item.fixtures.map(fixtureLabel).join(', ') : 'No fixture'}
          </span>
          <span className="stat ml-auto text-sm text-accent sm:text-base">
            {formatPoints(item.predictedPoints)}
          </span>
        </span>
      </span>
      <span className="mt-0.5 hidden text-[10px] font-bold text-white/80 sm:block">
        {formatPrice(currency, player.price)}
      </span>
    </button>
  );
}

function AdBoard({ text }: { text: string }) {
  const items = Array.from({ length: 8 }, (_, index) => index);

  return (
    <div className="relative mx-auto h-9 overflow-hidden rounded-t-xl border-b border-black/40 bg-black sm:h-10" aria-hidden="true">
      <div className="board-track flex h-full w-max items-center">
        {[...items, ...items].map((index) => (
          <span
            key={index}
            className="flex items-center gap-4 px-6 font-display text-lg font-black uppercase italic tracking-wider sm:text-xl"
          >
            <span className="text-sweep">Fantasy Predictor</span>
            <span className="text-white/50">{text}</span>
          </span>
        ))}
      </div>
    </div>
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
    <div className="overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="relative flex items-center gap-4 bg-sweep p-5">
        <div className="absolute inset-0 bg-ink/45" />
        <span className="relative">
          <Shirt teamShort={player.teamShort} goalkeeper={player.position === 'GK'} size={68} />
        </span>
        <div className="relative min-w-0">
          <p className="eyebrow truncate text-white/80">
            {player.team} · {POSITION_LABELS[player.position]}
          </p>
          <h3 className="headline mt-1 truncate text-4xl">{player.displayName}</h3>
          {(item.isCaptain || item.isViceCaptain) && (
            <span
              className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${
                item.isCaptain ? 'bg-amber-300 text-black' : 'bg-white text-black'
              }`}
            >
              {item.isCaptain ? 'Captain' : 'Vice-captain'}
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        <dl className="grid grid-cols-3 divide-x divide-line rounded-2xl bg-raised py-3 text-center">
          <div>
            <dt className="eyebrow text-white/55">{horizon > 1 ? `${horizon} GW proj.` : 'Proj.'}</dt>
            <dd className="stat mt-1 text-3xl text-accent">{formatPoints(item.predictedPoints)}</dd>
          </div>
          <div>
            <dt className="eyebrow text-white/55">Price</dt>
            <dd className="stat mt-1 text-3xl">{formatPrice(currency, player.price)}</dd>
          </div>
          <div>
            <dt className="eyebrow text-white/55">Owned</dt>
            <dd className="stat mt-1 text-3xl">{player.selectedBy.toFixed(1)}%</dd>
          </div>
        </dl>

        {item.fixtures.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {item.fixtures.map((fixture) => (
              <span
                key={`${fixture.gameweek}-${fixture.opponent}-${fixture.home}`}
                className={`rounded-md px-2 py-1 text-xs font-extrabold ${DIFFICULTY_STYLES[fixture.difficulty]}`}
                title={`Difficulty ${fixture.difficulty}/5`}
              >
                GW{fixture.gameweek} · {fixtureLabel(fixture)}
              </span>
            ))}
          </div>
        )}

        <h4 className="eyebrow mt-5 text-accent">Why this pick</h4>
        <ul className="mt-2 space-y-2 text-sm text-white/80">
          {[
            ...item.reasons,
            `Season: ${player.totalPoints} pts, ${plural(player.goals, 'goal')}, ${plural(player.assists, 'assist')}`,
          ].map((reason) => (
            <li key={reason} className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-3 shrink-0 -skew-x-12 bg-accent" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SquadBar({ team }: { team: PredictedTeam }) {
  const stats = [
    { label: 'Players', value: `${team.starters.length + team.bench.length}`, suffix: '/15' },
    { label: 'Formation', value: team.formation },
    { label: 'Squad cost', value: formatPrice(team.currency, team.totalCost) },
    { label: 'In the bank', value: formatPrice(team.currency, team.bank) },
  ];

  return (
    <div className="relative isolate mb-6 overflow-hidden rounded-2xl border border-white/15 bg-surface shadow-xl shadow-black/30">
      <div className="absolute inset-0 -z-10 bg-sweep opacity-25" />
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-3.5">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-xs font-semibold text-white/65">{stat.label}</p>
            <p className="stat text-2xl sm:text-3xl">
              {stat.value}
              {stat.suffix && <span className="text-base text-white/60">{stat.suffix}</span>}
            </p>
          </div>
        ))}
        <div className="ml-auto rounded-xl bg-accent px-5 py-2 text-on-accent">
          <p className="text-[11px] font-extrabold uppercase tracking-wider opacity-75">
            {team.horizon > 1 ? `Projected · ${team.horizon} GWs` : 'Projected points'}
          </p>
          <p className="stat text-3xl">{formatPoints(team.predictedPoints)}</p>
        </div>
      </div>
    </div>
  );
}

function TeamView({ team }: { team: PredictedTeam }) {
  const captain = team.starters.find((item) => item.isCaptain) ?? team.starters[0];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const all = [...team.starters, ...team.bench];
  const selected = all.find((item) => item.player.id === selectedId) ?? captain;

  return (
    <>
      <SquadBar team={team} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div
            className="overflow-hidden rounded-3xl border border-line bg-surface p-2 shadow-2xl shadow-black/40 sm:p-3"
            aria-label={`Starting XI in a ${team.formation} formation`}
          >
            <AdBoard text={team.gameweekName} />
            <div className="relative overflow-hidden rounded-b-2xl">
              {/* Grass, cut slightly narrower at the far end for depth */}
              <div
                className="pitch absolute inset-0"
                style={{ clipPath: 'polygon(4% 0, 96% 0, 100% 100%, 0 100%)' }}
              />
              {/* Pitch markings */}
              <div className="pointer-events-none absolute inset-x-[6%] top-0 h-[16%] rounded-b-md border-2 border-t-0 border-white/35" />
              <div className="pointer-events-none absolute left-1/2 top-0 h-[7%] w-[22%] -translate-x-1/2 border-2 border-t-0 border-white/35" />
              <div className="pointer-events-none absolute bottom-0 left-1/2 h-24 w-48 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white/35" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t-2 border-white/35" />

              <div className="relative flex min-h-[30rem] flex-col justify-around gap-3 px-1 py-6 sm:min-h-[36rem] sm:px-4">
                {ROWS.map((position) => (
                  <div key={position} className="flex flex-wrap justify-center gap-1 sm:gap-5">
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

            {/* Dugout */}
            <div className="mt-2 rounded-2xl bg-raised p-3">
              <p className="eyebrow mb-2 px-1 text-white/55">Substitutes</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {team.bench.map((item, index) => {
                  const active = selected?.player.id === item.player.id;
                  return (
                    <button
                      key={item.player.id}
                      type="button"
                      onClick={() => setSelectedId(item.player.id)}
                      className={`flex items-center gap-2 rounded-xl p-2 text-left transition ${
                        active ? 'bg-white/15 ring-2 ring-accent' : 'bg-black/20 hover:bg-white/10'
                      }`}
                    >
                      <Shirt
                        teamShort={item.player.teamShort}
                        goalkeeper={item.player.position === 'GK'}
                        size={36}
                      />
                      <span className="min-w-0">
                        <span className="block text-[10px] font-extrabold uppercase tracking-wider text-white/50">
                          {index === 0 ? 'GK' : `Sub ${index}`} · {item.player.position}
                        </span>
                        <span className="block truncate text-sm font-bold">{item.player.displayName}</span>
                        <span className="block text-xs text-white/60">
                          <span className="font-bold text-accent">{formatPoints(item.predictedPoints)}</span> pts ·{' '}
                          {formatPrice(team.currency, item.player.price)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {selected && <PlayerDetails item={selected} currency={team.currency} horizon={team.horizon} />}

          <details className="group rounded-3xl border border-line bg-surface p-5 text-sm text-white/70">
            <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-white">
              How this team is built
              <span className="text-accent transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3">
              Each player gets an expected-points projection from their underlying stats, recent form,
              fixture difficulty and the chance they play. The optimiser then searches for the 15-man
              squad with the highest-scoring XI within the {team.currency}
              {team.budget}m budget, a maximum of 3 players per club and legal formations. The
              captain's points count twice.
            </p>
          </details>
        </aside>
      </div>
    </>
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
  const horizonInfo = HORIZONS.find((option) => option.value === horizon);

  return (
    <AppLayout
      hero={
        <PageHero
          eyebrow={`${leagueLabel} · ${team?.gameweekName ?? 'Upcoming gameweek'}`}
          title={
            <>
              Best <span className="text-accent">XI</span>
            </>
          }
          description="The highest-projected legal squad for the gameweek, picked from live fantasy data."
          actions={
            <div className="grid gap-3 sm:grid-cols-2 lg:w-[30rem]">
              <GameweekPicker
                league={league}
                value={gameweek}
                onChange={(value) => setGameweeks((current) => ({ ...current, [league]: value }))}
              />
              <div>
                <span className="eyebrow mb-2 block text-white/75">Plan for</span>
                <div
                  role="radiogroup"
                  aria-label="Plan for"
                  className="grid grid-cols-3 rounded-xl border border-line bg-raised p-1"
                >
                  {HORIZONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={horizon === option.value}
                      title={option.title}
                      onClick={() => setHorizon(option.value)}
                      className={`rounded-lg py-2 text-sm font-extrabold transition ${
                        horizon === option.value
                          ? 'bg-accent text-on-accent'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <span className="mt-1.5 block text-xs font-semibold text-white/70">
                  {horizonInfo?.hint}
                </span>
              </div>
            </div>
          }
        />
      }
    >
      {loading && <Loading label="Running the optimiser..." />}
      {error && !loading && (
        <ErrorPanel title="Unable to build a team" error={error} onRetry={() => refetch()} />
      )}
      {team && !loading && (
        <TeamView key={`${team.league}-${team.gameweek}-${team.horizon}`} team={team} />
      )}
    </AppLayout>
  );
}
