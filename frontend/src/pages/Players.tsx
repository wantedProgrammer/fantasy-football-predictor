import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';

import AppLayout from '../components/AppLayout';
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

const PAGE_SIZE = 48;

function shufflePlayers(players: Player[]): Player[] {
  const shuffled = [...players];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

const selectClass =
  'w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-sm outline-none focus:border-emerald-400';
const labelClass = 'mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400';

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
    <AppLayout>
      <section className="relative mb-6 overflow-hidden rounded-3xl border border-white/10">
        <img
          src={league === 'PREMIER_LEAGUE' ? premierLeagueHero : championsLeagueHero}
          alt=""
          className="h-56 w-full object-cover sm:h-72"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
        <div className="absolute inset-0 flex max-w-2xl flex-col justify-end p-6 sm:p-10">
          <span className="mb-3 w-fit rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            Live player data
          </span>
          <h1 className="text-3xl font-black sm:text-5xl">{leagueLabel} players</h1>
          <p className="mt-3 max-w-xl text-sm text-slate-300 sm:text-base">
            Every player with price, form and next-gameweek projection. Filter, sort and find your
            next transfer.
          </p>
        </div>
      </section>

      <section className="mb-6 grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block lg:col-span-2">
          <span className={labelClass}>Search</span>
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Player name"
            className={selectClass}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Team</span>
          <select
            value={selectedTeam}
            onChange={(event) => {
              setSelectedTeam(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className={selectClass}
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
          <span className={labelClass}>Position</span>
          <select
            value={selectedPosition}
            onChange={(event) => {
              setSelectedPosition(event.target.value as Position | 'ALL');
              setVisibleCount(PAGE_SIZE);
            }}
            className={selectClass}
          >
            <option value="ALL">All positions</option>
            <option value="GK">Goalkeepers</option>
            <option value="DEF">Defenders</option>
            <option value="MID">Midfielders</option>
            <option value="FWD">Forwards</option>
          </select>
        </label>

        <label className="block">
          <span className={labelClass}>Sort by</span>
          <select
            value={sortKey}
            onChange={(event) => {
              setSortKey(event.target.value as SortKey);
              setShuffleVersion(0);
            }}
            className={selectClass}
          >
            {SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {favouriteMessage && (
        <div className="mb-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-200">
          {favouriteMessage}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          Showing {visiblePlayers.length} of {filteredPlayers.length} players
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShuffleVersion((current) => current + 1)}
            className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold transition hover:bg-indigo-400"
          >
            Shuffle
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10"
          >
            Refresh data
          </button>
        </div>
      </div>

      {loading && <Loading label="Loading players..." />}
      {error && !loading && (
        <ErrorPanel title="Unable to load players" error={error} onRetry={() => refetch()} />
      )}

      {!loading && !error && filteredPlayers.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-12 text-center text-slate-400">
          No players match the selected filters.
        </div>
      )}

      {!loading && !error && visiblePlayers.length > 0 && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {visiblePlayers.map((player) => {
            const isFavourite = favouritePlayer === player.displayName;

            return (
              <article
                key={player.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 transition hover:border-emerald-400/50"
              >
                <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-sky-500" />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold uppercase tracking-wider text-emerald-400">
                        {player.team}
                      </p>
                      <h3 className="mt-1 truncate text-xl font-bold">{player.displayName}</h3>
                      <p className="truncate text-sm text-slate-400">
                        {player.firstName} {player.secondName}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold ${POSITION_STYLES[player.position]}`}
                    >
                      {player.position}
                    </span>
                  </div>

                  {player.availability < 1 && (
                    <p className="mt-3 rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                      {Math.round(player.availability * 100)}% chance of playing
                      {player.news ? `: ${player.news}` : ''}
                    </p>
                  )}

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-slate-800 p-2.5">
                      <p className="text-lg font-black text-emerald-300">
                        {formatPoints(player.predictedPoints)}
                      </p>
                      <p className="text-[11px] text-slate-400">Projected</p>
                    </div>
                    <div className="rounded-xl bg-slate-800 p-2.5">
                      <p className="text-lg font-black text-amber-300">{player.totalPoints}</p>
                      <p className="text-[11px] text-slate-400">Points</p>
                    </div>
                    <div className="rounded-xl bg-slate-800 p-2.5">
                      <p className="text-lg font-black">{formatPrice(currency, player.price)}</p>
                      <p className="text-[11px] text-slate-400">Price</p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-400">
                    {plural(player.goals, 'goal')} · {plural(player.assists, 'assist')} · form {player.form.toFixed(1)} ·{' '}
                    {player.selectedBy.toFixed(1)}% owned
                  </p>

                  <div className="mt-auto pt-4">
                    <button
                      type="button"
                      disabled={savingFavourite}
                      onClick={() => selectFavourite(player)}
                      className={`w-full rounded-xl border py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        isFavourite
                          ? 'border-amber-300 bg-amber-300 text-slate-950'
                          : 'border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20'
                      }`}
                    >
                      {isFavourite ? '★ Favourite player' : '☆ Select favourite'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {!loading && !error && visibleCount < filteredPlayers.length && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/10"
          >
            Show more players
          </button>
        </div>
      )}
    </AppLayout>
  );
}
