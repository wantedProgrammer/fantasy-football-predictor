import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';

import AppLayout from '../components/AppLayout';
import { Shirt } from '../components/Decor';
import PageHero from '../components/PageHero';
import { ErrorPanel, Loading } from '../components/QueryState';
import { GET_PLAYERS } from '../graphql/players';
import { ME, SET_FAVOURITE_PLAYER } from '../graphql/profile';
import { LEAGUES, useLeague } from '../lib/league';
import { POSITION_STYLES, formatPoints, formatPrice, plural } from '../lib/format';
import type { Position } from '../lib/format';

import premierLeagueHero from '../assets/premier-league-games.webp';
import championsLeagueHero from '../assets/Champions_League_trophy.png.webp';

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

type SortKey = 'predicted' | 'points' | 'form' | 'value' | 'priceHigh' | 'priceLow' | 'none';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'predicted', label: 'Projected points (next GW)' },
  { value: 'points', label: 'Total points' },
  { value: 'form', label: 'Form' },
  { value: 'value', label: 'Projected points per million' },
  { value: 'priceHigh', label: 'Price: high to low' },
  { value: 'priceLow', label: 'Price: low to high' },
  { value: 'none', label: 'No sorting' },
];

const POSITION_FILTERS: { value: Position | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'GK', label: 'GK' },
  { value: 'DEF', label: 'DEF' },
  { value: 'MID', label: 'MID' },
  { value: 'FWD', label: 'FWD' },
];

const PAGE_SIZE = 48;

/** Columns for the player list: player, price, projected, points, form, owned, favourite. */
const ROW_GRID =
  'grid grid-cols-[minmax(0,1fr)_4.5rem_4rem_2.75rem] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_5rem_4.5rem_4rem_4.5rem_3rem] sm:gap-3';

function shufflePlayers(players: Player[]): Player[] {
  const shuffled = [...players];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

export default function Players() {
  const { league } = useLeague();

  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [selectedPosition, setSelectedPosition] = useState<Position | 'ALL'>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('predicted');
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
    () =>
      [...new Set((data?.players ?? []).map((player) => player.team))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [data],
  );

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    let players = (data?.players ?? []).filter(
      (player) =>
        (selectedTeam === 'ALL' || player.team === selectedTeam) &&
        (selectedPosition === 'ALL' || player.position === selectedPosition) &&
        (!query ||
          `${player.firstName} ${player.secondName} ${player.displayName}`
            .toLowerCase()
            .includes(query)),
    );

    const comparators: Record<SortKey, ((a: Player, b: Player) => number) | null> = {
      predicted: (a, b) => b.predictedPoints - a.predictedPoints,
      points: (a, b) => b.totalPoints - a.totalPoints,
      form: (a, b) => b.form - a.form,
      value: (a, b) => b.predictedPoints / b.price - a.predictedPoints / a.price,
      priceHigh: (a, b) => b.price - a.price,
      priceLow: (a, b) => a.price - b.price,
      none: null,
    };

    const comparator = comparators[sortKey];
    if (comparator) {
      players = [...players].sort(comparator);
    }

    if (shuffleVersion > 0) {
      players = shufflePlayers(players);
    }

    return players;
  }, [data, selectedTeam, selectedPosition, search, sortKey, shuffleVersion]);

  const visiblePlayers = filteredPlayers.slice(0, visibleCount);
  const currency = league === 'PREMIER_LEAGUE' ? '£' : '€';
  const leagueLabel = LEAGUES.find((item) => item.id === league)?.label ?? '';

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

  return (
    <AppLayout
      hero={
        <PageHero
          eyebrow={`${leagueLabel} · Live player data`}
          title={
            <>
              Player <span className="text-accent">market</span>
            </>
          }
          description="Every player with price, form and next-gameweek projection. Filter, sort and find your next transfer."
          image={league === 'PREMIER_LEAGUE' ? premierLeagueHero : championsLeagueHero}
        />
      }
    >
      <div className="overflow-hidden rounded-3xl border border-line bg-surface">
        {/* Filter bar */}
        <div className="grid gap-3 border-b border-line bg-band p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
          <label className="relative block">
            <span className="sr-only">Search players</span>
            <svg
              viewBox="0 0 20 20"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              aria-hidden="true"
            >
              <circle cx="9" cy="9" r="6" />
              <path d="M14 14l4 4" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              placeholder="Search by player name"
              className="field pl-10"
            />
          </label>

          <label className="block">
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

          <label className="block">
            <span className="sr-only">Sort by</span>
            <select
              value={sortKey}
              onChange={(event) => {
                setSortKey(event.target.value as SortKey);
                setShuffleVersion(0);
              }}
              className="field"
            >
              {SORTS.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  Sort: {sort.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShuffleVersion((current) => current + 1)}
              className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-extrabold text-on-accent transition hover:brightness-110"
            >
              Shuffle
            </button>
            <button
              type="button"
              onClick={() => refetch()}
              title="Refresh data"
              aria-label="Refresh data"
              className="rounded-xl border border-white/15 bg-black/20 px-3 transition hover:bg-white/10"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M16 10a6 6 0 1 1-1.8-4.3M16 4v3h-3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Position tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div role="tablist" aria-label="Position" className="flex gap-1">
            {POSITION_FILTERS.map((option) => {
              const active = selectedPosition === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setSelectedPosition(option.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className={`relative px-3 py-1.5 font-display text-lg font-bold uppercase italic tracking-wide transition ${
                    active ? 'text-accent' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {option.label}
                  {active && <span className="absolute inset-x-2 -bottom-3 h-[3px] rounded-full bg-accent" />}
                </button>
              );
            })}
          </div>
          <p className="text-xs font-semibold text-white/55">
            Showing {visiblePlayers.length} of {filteredPlayers.length} players
          </p>
        </div>

        {favouriteMessage && (
          <div className="border-b border-line bg-amber-300/10 px-5 py-3 text-sm font-semibold text-amber-200">
            ★ {favouriteMessage}
          </div>
        )}

        {loading && (
          <div className="p-4">
            <Loading label="Loading players..." />
          </div>
        )}
        {error && !loading && (
          <div className="p-4">
            <ErrorPanel title="Unable to load players" error={error} onRetry={() => refetch()} />
          </div>
        )}

        {!loading && !error && filteredPlayers.length === 0 && (
          <div className="p-12 text-center text-white/55">No players match the selected filters.</div>
        )}

        {!loading && !error && visiblePlayers.length > 0 && (
          <div role="table" aria-label="Players">
            <div
              role="row"
              className={`${ROW_GRID} eyebrow border-b border-line px-4 py-3 text-white/50`}
            >
              <span role="columnheader">Player</span>
              <span role="columnheader" className="text-right text-accent">Price</span>
              <span role="columnheader" className="text-right">Proj.</span>
              <span role="columnheader" className="hidden text-right sm:block">Pts</span>
              <span role="columnheader" className="hidden text-right sm:block">Form</span>
              <span role="columnheader" className="hidden text-right sm:block">Owned</span>
              <span role="columnheader" className="text-center">
                <span className="sr-only">Favourite</span>★
              </span>
            </div>

            {visiblePlayers.map((player) => {
              const isFavourite = favouritePlayer === player.displayName;
              const doubtful = player.availability < 1;

              return (
                <div
                  key={player.id}
                  role="row"
                  className={`${ROW_GRID} border-b border-line px-4 py-2.5 transition last:border-b-0 hover:bg-white/[0.04]`}
                >
                  <div role="cell" className="flex min-w-0 items-center gap-3">
                    <span className="relative shrink-0">
                      <Shirt teamShort={player.teamShort} goalkeeper={player.position === 'GK'} size={40} />
                      {doubtful && (
                        <span
                          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-black"
                          title={`${Math.round(player.availability * 100)}% chance of playing${player.news ? `: ${player.news}` : ''}`}
                        >
                          !
                        </span>
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-extrabold">{player.displayName}</p>
                      <p className="flex items-center gap-1.5 truncate text-xs text-white/55">
                        <span
                          className={`rounded px-1 py-px text-[10px] font-extrabold ${POSITION_STYLES[player.position]}`}
                        >
                          {player.position}
                        </span>
                        <span className="truncate">{player.team}</span>
                        <span className="hidden truncate md:inline">
                          · {plural(player.goals, 'goal')}, {plural(player.assists, 'assist')}
                        </span>
                      </p>
                      {doubtful && player.news && (
                        <p className="truncate text-[11px] font-semibold text-amber-300">{player.news}</p>
                      )}
                    </div>
                  </div>

                  <span role="cell" className="stat rounded-lg bg-accent/10 py-1.5 text-right text-lg text-accent sm:pr-2">
                    {formatPrice(currency, player.price)}
                  </span>
                  <span role="cell" className="stat text-right text-xl">
                    {formatPoints(player.predictedPoints)}
                  </span>
                  <span role="cell" className="stat hidden text-right text-xl text-white/80 sm:block">
                    {player.totalPoints}
                  </span>
                  <span role="cell" className="stat hidden text-right text-xl text-white/80 sm:block">
                    {player.form.toFixed(1)}
                  </span>
                  <span role="cell" className="stat hidden text-right text-xl text-white/80 sm:block">
                    {player.selectedBy.toFixed(1)}%
                  </span>
                  <span role="cell" className="flex justify-center">
                    <button
                      type="button"
                      disabled={savingFavourite}
                      onClick={() => selectFavourite(player)}
                      aria-pressed={isFavourite}
                      aria-label={isFavourite ? `${player.displayName} is your favourite` : `Make ${player.displayName} your favourite`}
                      title={isFavourite ? 'Favourite player' : 'Select favourite'}
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        isFavourite
                          ? 'bg-amber-300 text-black'
                          : 'text-white/40 hover:bg-amber-300/15 hover:text-amber-300'
                      }`}
                    >
                      {isFavourite ? '★' : '☆'}
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!loading && !error && visibleCount < filteredPlayers.length && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
            className="rounded-full border border-line bg-surface px-6 py-2.5 text-sm font-extrabold transition hover:border-accent hover:text-accent"
          >
            Show more players
          </button>
        </div>
      )}
    </AppLayout>
  );
}
