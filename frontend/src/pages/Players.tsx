import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery } from '@apollo/client';

import AppLayout from '../components/AppLayout';
import PageHeader from '../components/PageHeader';
import { ErrorPanel } from '../components/QueryState';
import { EmptyState, PositionTag, Skeleton, TeamChip, buttonGhost } from '../components/ui';
import { GET_PLAYERS } from '../graphql/players';
import { ME, SET_FAVOURITE_PLAYER } from '../graphql/profile';
import { LEAGUES, useLeague } from '../lib/league';
import { formatPoints, formatPrice } from '../lib/format';
import type { Position } from '../lib/format';

type Player = {
  id: string;
  firstName: string;
  secondName: string;
  displayName: string;
  totalPoints: number;
  team: string;
  teamShort: string;
  position: Position;
  price: number;
  goals: number;
  assists: number;
  form: number;
  selectedBy: number;
  availability: number;
  news: string | null;
  predictedPoints: number;
};

type SortKey = 'predicted' | 'points' | 'form' | 'value' | 'price' | 'owned' | 'name' | 'none';
type SortDirection = 'desc' | 'asc';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'predicted', label: 'Projection' },
  { value: 'points', label: 'Total points' },
  { value: 'form', label: 'Form' },
  { value: 'value', label: 'Value (pts per £/€m)' },
  { value: 'price', label: 'Price' },
  { value: 'owned', label: 'Ownership' },
];

const VALUES: Record<Exclude<SortKey, 'none'>, (player: Player) => number | string> = {
  predicted: (player) => player.predictedPoints,
  points: (player) => player.totalPoints,
  form: (player) => player.form,
  value: (player) => player.predictedPoints / player.price,
  price: (player) => player.price,
  owned: (player) => player.selectedBy,
  name: (player) => player.displayName.toLowerCase(),
};

const POSITIONS: (Position | 'ALL')[] = ['ALL', 'GK', 'DEF', 'MID', 'FWD'];
const PAGE_SIZE = 50;

function shufflePlayers(players: Player[]): Player[] {
  const shuffled = [...players];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function StarButton({
  active,
  disabled,
  name,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  name: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={active ? `${name} is your favourite player` : `Set ${name} as favourite player`}
      title={active ? 'Favourite player' : 'Set as favourite'}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'text-mint drop-shadow-[0_0_8px_rgb(60_245_160/0.8)]' : 'text-faint hover:bg-white/[0.06] hover:text-ink'
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
        <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z" />
      </svg>
    </button>
  );
}

function InjuryFlag({ player }: { player: Player }) {
  if (player.availability >= 1) {
    return <span className="text-faint" aria-label="Available">—</span>;
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-warn/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-warn"
      title={player.news ?? undefined}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-warn" />
      {Math.round(player.availability * 100)}%
    </span>
  );
}

function FormBar({ form }: { form: number }) {
  return (
    <span className="flex items-center justify-end gap-2">
      <span className="num">{form.toFixed(1)}</span>
      <span className="hidden h-1 w-10 overflow-hidden rounded-full bg-white/[0.07] xl:block">
        <span className="bg-accent block h-full rounded-full" style={{ width: `${Math.min(form / 10, 1) * 100}%` }} />
      </span>
    </span>
  );
}

function PlayersSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading players" className="glass space-y-2 rounded-2xl p-4">
      {Array.from({ length: 10 }, (_, index) => (
        <Skeleton key={index} className="h-11 w-full" />
      ))}
    </div>
  );
}

export default function Players() {
  const { league, currency } = useLeague();

  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [selectedPosition, setSelectedPosition] = useState<Position | 'ALL'>('ALL');
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'predicted', direction: 'desc' });
  const [search, setSearch] = useState('');
  const [shuffleVersion, setShuffleVersion] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [favouriteMessage, setFavouriteMessage] = useState('');

  const { data, loading, error, refetch } = useQuery<{ players: Player[] }>(GET_PLAYERS, {
    variables: { league },
  });
  const { data: meData } = useQuery<{ me: { id: number; favouritePlayer?: string | null } }>(ME);
  const favouritePlayer = meData?.me.favouritePlayer ?? null;
  const [setFavouritePlayer, { loading: savingFavourite }] = useMutation(SET_FAVOURITE_PLAYER);

  const [previousLeague, setPreviousLeague] = useState(league);
  if (previousLeague !== league) {
    // Team names differ between competitions, so reset filters on switch.
    setPreviousLeague(league);
    setSelectedTeam('ALL');
    setShuffleVersion(0);
    setVisibleCount(PAGE_SIZE);
  }

  const teams = useMemo(
    () => [...new Set((data?.players ?? []).map((player) => player.team))].sort((a, b) => a.localeCompare(b)),
    [data],
  );

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    let players = (data?.players ?? []).filter(
      (player) =>
        (selectedTeam === 'ALL' || player.team === selectedTeam) &&
        (selectedPosition === 'ALL' || player.position === selectedPosition) &&
        (!query ||
          `${player.firstName} ${player.secondName} ${player.displayName}`.toLowerCase().includes(query)),
    );

    if (shuffleVersion > 0) {
      return shufflePlayers(players);
    }

    if (sort.key !== 'none') {
      const read = VALUES[sort.key];
      const factor = sort.direction === 'desc' ? -1 : 1;
      players = [...players].sort((a, b) => {
        const left = read(a);
        const right = read(b);
        if (typeof left === 'string' && typeof right === 'string') return left.localeCompare(right) * factor;
        return ((left as number) - (right as number)) * factor;
      });
    }

    return players;
  }, [data, selectedTeam, selectedPosition, search, sort, shuffleVersion]);

  const visiblePlayers = filteredPlayers.slice(0, visibleCount);
  const leagueLabel = LEAGUES.find((item) => item.id === league)?.label ?? '';

  function sortBy(key: SortKey) {
    setShuffleVersion(0);
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'desc' ? 'asc' : 'desc' }
        : { key, direction: key === 'name' ? 'asc' : 'desc' },
    );
  }

  async function selectFavourite(player: Player) {
    setFavouriteMessage('');
    try {
      const result = await setFavouritePlayer({
        variables: { player: player.displayName },
        refetchQueries: [{ query: ME }],
      });
      const saved = result.data?.setFavouritePlayer?.favouritePlayer ?? player.displayName;
      setFavouriteMessage(`${saved} is now your favourite player.`);
    } catch (mutationError) {
      setFavouriteMessage(
        mutationError instanceof Error ? mutationError.message : 'Unable to save favourite player.',
      );
    }
  }

  function resetFilters() {
    setSearch('');
    setSelectedTeam('ALL');
    setSelectedPosition('ALL');
    setVisibleCount(PAGE_SIZE);
  }

  // Called as a plain function (not as a JSX component) so React doesn't remount it every render.
  function renderHeader({ label, sortKey, align = 'right', className = '' }: { label: ReactNode; sortKey?: SortKey; align?: 'left' | 'right'; className?: string }) {
    const active = sortKey && sort.key === sortKey && shuffleVersion === 0;
    return (
      <th
        key={typeof label === 'string' ? label : 'favourite'}
        scope="col"
        aria-sort={active ? (sort.direction === 'desc' ? 'descending' : 'ascending') : undefined}
        className={`px-3 py-3 font-medium ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
      >
        {sortKey ? (
          <button
            type="button"
            onClick={() => sortBy(sortKey)}
            className={`inline-flex items-center gap-1 transition hover:text-ink ${active ? 'text-mint' : ''}`}
          >
            {label}
            <span className={`text-[9px] ${active ? 'opacity-100' : 'opacity-30'}`}>
              {active && sort.direction === 'asc' ? '▲' : '▼'}
            </span>
          </button>
        ) : (
          label
        )}
      </th>
    );
  }

  return (
    <AppLayout
      gameweekApplies={false}
      header={
        <PageHeader
          key={league}
          eyebrow={`${leagueLabel} · Live player data`}
          title="Every player, ranked"
          accentWords={['ranked']}
          description="Price, form, ownership and next-gameweek projection. Filter, sort and find your next transfer."
        />
      }
    >
      {/* Filters */}
      <div className="glass flex flex-col gap-3 rounded-2xl p-3 lg:flex-row lg:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">Search players</span>
          <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="9" r="5.5" />
            <path d="M13.5 13.5L17 17" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Search players"
            className="field !pl-10"
          />
        </label>

        <div role="radiogroup" aria-label="Position" className="flex rounded-xl border border-line bg-white/[0.03] p-1">
          {POSITIONS.map((position) => {
            const active = selectedPosition === position;
            return (
              <button
                key={position}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setSelectedPosition(position);
                  setVisibleCount(PAGE_SIZE);
                }}
                className={`flex-1 rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition ${
                  active ? 'bg-white/[0.09] text-mint' : 'text-muted hover:text-ink'
                }`}
              >
                {position === 'ALL' ? 'All' : position}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:flex">
          <label className="block lg:w-44">
            <span className="sr-only">Team</span>
            <select
              value={selectedTeam}
              onChange={(event) => {
                setSelectedTeam(event.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="field"
            >
              <option value="ALL">All teams</option>
              {teams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </label>

          <label className="block lg:w-48">
            <span className="sr-only">Sort by</span>
            <select
              value={shuffleVersion > 0 ? 'none' : sort.key}
              onChange={(event) => {
                setShuffleVersion(0);
                setSort({ key: event.target.value as SortKey, direction: 'desc' });
              }}
              className="field"
            >
              {shuffleVersion > 0 && <option value="none">Shuffled</option>}
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort: {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button type="button" onClick={() => setShuffleVersion((current) => current + 1)} className={buttonGhost}>
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h3.5c3 0 4 8 7 8H17M14.5 11.5L17 14l-2.5 2.5M3 14h3.5c1.2 0 2-1.2 2.7-2.6M11 8.4C11.7 7 12.5 6 13.5 6H17M14.5 3.5L17 6l-2.5 2.5" />
          </svg>
          Shuffle
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span className="num">
          {loading ? 'Loading…' : `Showing ${visiblePlayers.length} of ${filteredPlayers.length} players`}
        </span>
        {favouriteMessage && (
          <span role="status" className="text-mint">
            ★ {favouriteMessage}
          </span>
        )}
      </div>

      <div className="mt-3">
        {loading && <PlayersSkeleton />}
        {error && !loading && <ErrorPanel title="Unable to load players" error={error} onRetry={() => refetch()} />}

        {!loading && !error && filteredPlayers.length === 0 && (
          <EmptyState
            title="No players match these filters"
            body="Try a different name, team or position."
            action={
              <button type="button" onClick={resetFilters} className={buttonGhost}>
                Clear filters
              </button>
            }
          />
        )}

        {!loading && !error && visiblePlayers.length > 0 && (
          <>
            {/* Desktop table */}
            <div className="glass hidden overflow-hidden rounded-2xl md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-line text-[11px] uppercase tracking-[0.1em] text-muted">
                  <tr>
                    {renderHeader({ label: "Player", sortKey: "name", align: "left", className: "pl-5" })}
                    {renderHeader({ label: "Team", align: "left", className: "hidden lg:table-cell" })}
                    {renderHeader({ label: "Pos", align: "left" })}
                    {renderHeader({ label: "Price", sortKey: "price" })}
                    {renderHeader({ label: "Next GW", sortKey: "predicted" })}
                    {renderHeader({ label: "Points", sortKey: "points" })}
                    {renderHeader({ label: "Form", sortKey: "form" })}
                    {renderHeader({ label: "Owned", sortKey: "owned" })}
                    {renderHeader({ label: "Status", align: "left" })}
                    {renderHeader({ label: <span className="sr-only">Favourite</span> })}
                  </tr>
                </thead>
                <tbody>
                  {visiblePlayers.map((player) => {
                    const isFavourite = favouritePlayer === player.displayName;
                    return (
                      <tr key={player.id} className="border-b border-line/60 transition last:border-0 hover:bg-white/[0.03]">
                        <td className="py-2.5 pl-5 pr-3">
                          <span className="flex items-center gap-2.5">
                            <TeamChip code={player.teamShort} size="xs" />
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{player.displayName}</span>
                              <span className="block truncate text-[11px] text-faint">
                                {player.firstName} {player.secondName}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className="hidden truncate px-3 text-muted lg:table-cell">{player.team}</td>
                        <td className="px-3">
                          <PositionTag position={player.position} />
                        </td>
                        <td className="num px-3 text-right font-mono">{formatPrice(currency, player.price)}</td>
                        <td className="num text-accent px-3 text-right font-semibold">{formatPoints(player.predictedPoints)}</td>
                        <td className="num px-3 text-right">{player.totalPoints}</td>
                        <td className="px-3 text-right">
                          <FormBar form={player.form} />
                        </td>
                        <td className="num px-3 text-right text-muted">{player.selectedBy.toFixed(1)}%</td>
                        <td className="px-3">
                          <InjuryFlag player={player} />
                        </td>
                        <td className="pr-3 text-right">
                          <StarButton
                            active={isFavourite}
                            disabled={savingFavourite}
                            name={player.displayName}
                            onClick={() => selectFavourite(player)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="space-y-2 md:hidden">
              {visiblePlayers.map((player) => {
                const isFavourite = favouritePlayer === player.displayName;
                return (
                  <li key={player.id} className="glass rounded-2xl p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2">
                          <span className="truncate font-medium">{player.displayName}</span>
                          <PositionTag position={player.position} />
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                          <TeamChip code={player.teamShort} size="xs" />
                          <span className="num font-mono">{formatPrice(currency, player.price)}</span>
                          <InjuryFlag player={player} />
                        </p>
                      </div>
                      <StarButton
                        active={isFavourite}
                        disabled={savingFavourite}
                        name={player.displayName}
                        onClick={() => selectFavourite(player)}
                      />
                    </div>
                    <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
                      {[
                        ['Next GW', formatPoints(player.predictedPoints), true],
                        ['Points', String(player.totalPoints), false],
                        ['Form', player.form.toFixed(1), false],
                        ['Owned', `${player.selectedBy.toFixed(1)}%`, false],
                      ].map(([label, value, accent]) => (
                        <div key={label as string} className="rounded-lg bg-white/[0.03] py-1.5">
                          <dt className="text-[10px] text-faint">{label}</dt>
                          <dd className={`num text-sm font-semibold ${accent ? 'text-accent' : ''}`}>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {!loading && !error && visibleCount < filteredPlayers.length && (
          <div className="mt-6 text-center">
            <button type="button" onClick={() => setVisibleCount((current) => current + PAGE_SIZE)} className={buttonGhost}>
              Show more players
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
