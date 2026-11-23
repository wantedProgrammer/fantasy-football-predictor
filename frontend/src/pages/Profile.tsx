import { useApolloClient, useQuery } from '@apollo/client';
import { Link, useNavigate } from 'react-router-dom';

import AppLayout from '../components/AppLayout';
import PageHeader from '../components/PageHeader';
import { FormSparkline } from '../components/PlayerPanel';
import { CountUp, GlowBackdrop } from '../components/motion';
import { ErrorPanel } from '../components/QueryState';
import { EmptyState, PositionTag, Skeleton, TeamChip, buttonGhost, buttonPrimary } from '../components/ui';
import { GET_PLAYERS } from '../graphql/players';
import { ME } from '../graphql/profile';
import { LEAGUES, useLeague } from '../lib/league';
import { POSITION_LABELS, formatPrice } from '../lib/format';
import type { Position } from '../lib/format';

type UserProfile = {
  id: number;
  name: string;
  surname: string;
  email: string;
  mobile: string;
  favouritePlayer?: string | null;
};

type PlayerStats = {
  id: string;
  displayName: string;
  firstName: string;
  secondName: string;
  team: string;
  teamShort: string;
  position: Position;
  price: number;
  totalPoints: number;
  form: number;
  selectedBy: number;
  availability: number;
  news: string | null;
  predictedPoints: number;
  goals: number;
  assists: number;
};

function FavouriteCard({ name }: { name: string }) {
  const { league, currency } = useLeague();
  const { data, loading } = useQuery<{ players: PlayerStats[] }>(GET_PLAYERS, { variables: { league } });
  const player = data?.players.find((item) => item.displayName === name);
  const otherLeague = LEAGUES.find((item) => item.id !== league)?.label;

  if (loading) {
    return <Skeleton className="h-[26rem] rounded-3xl" />;
  }

  return (
    <section className="glass relative isolate overflow-hidden rounded-3xl p-6 sm:p-8">
      <GlowBackdrop className="-z-10" intensity={0.7} />
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-mint" fill="currentColor" aria-hidden="true">
          <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z" />
        </svg>
        Favourite player
      </p>

      <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{name}</h2>

      {!player ? (
        <p className="mt-3 max-w-md text-sm text-muted">
          {name} isn't in this competition's player list. Switch to the {otherLeague} to see their stats, or pick a new
          favourite here.
        </p>
      ) : (
        <>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
            <TeamChip code={player.teamShort} size="sm" />
            {player.team}
            <PositionTag position={player.position} />
            <span className="text-faint">{POSITION_LABELS[player.position]}</span>
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-[auto_1fr] lg:items-end">
            <div>
              <p className="text-xs text-muted">Projected next gameweek</p>
              <CountUp value={player.predictedPoints} className="text-accent text-7xl font-semibold leading-none tracking-[-0.04em]" />
            </div>
            <div>
              <p className="mb-2 text-xs text-muted">Recent form</p>
              <FormSparkline league={league} playerId={player.id} form={player.form} height={70} />
            </div>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ['Price', formatPrice(currency, player.price)],
              ['Total points', String(player.totalPoints)],
              ['Form', player.form.toFixed(1)],
              ['Owned', `${player.selectedBy.toFixed(1)}%`],
              ['Goals · assists', `${player.goals} · ${player.assists}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white/[0.04] px-3 py-2.5">
                <dt className="text-[11px] text-muted">{label}</dt>
                <dd className="num mt-0.5 text-lg font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          {player.availability < 1 && (
            <p className="mt-4 rounded-xl bg-warn/10 px-3 py-2 text-sm text-warn">
              {Math.round(player.availability * 100)}% chance of playing{player.news ? `: ${player.news}` : ''}
            </p>
          )}
        </>
      )}

      <Link to="/players" className={`${buttonGhost} mt-6`}>
        Change favourite
      </Link>
    </section>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const { data, loading, error, refetch } = useQuery<{ me: UserProfile }>(ME, { fetchPolicy: 'network-only' });
  const me = data?.me;

  async function logout() {
    sessionStorage.removeItem('token');
    await client.clearStore();
    navigate('/login', { replace: true });
  }

  return (
    <AppLayout
      gameweekApplies={false}
      header={
        <PageHeader
          eyebrow="Your account"
          title={me ? `Hi, ${me.name}` : 'Your profile'}
          accentWords={me ? [me.name] : []}
        />
      }
    >
      {loading && (
        <div aria-busy="true" aria-label="Loading profile" className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-[26rem] rounded-3xl" />
        </div>
      )}
      {error && !loading && <ErrorPanel title="Unable to load profile" error={error} onRetry={() => refetch()} />}

      {me && !loading && (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr] lg:items-start">
          <section className="glass rounded-3xl p-6">
            <h2 className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Account</h2>
            <p className="mt-4 text-xs text-muted">Mobile number</p>
            <p className="num mt-0.5 font-mono text-2xl font-semibold tracking-tight">{me.mobile}</p>

            <dl className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Name</dt>
                <dd className="truncate font-medium">
                  {me.name} {me.surname}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Email</dt>
                <dd className="truncate font-medium">{me.email}</dd>
              </div>
            </dl>

            <button type="button" onClick={logout} className={`${buttonGhost} mt-6 w-full hover:!border-warn/40 hover:!text-warn`}>
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 4H4v12h4M13 6l4 4-4 4M17 10H8" />
              </svg>
              Log out
            </button>
          </section>

          {me.favouritePlayer ? (
            <FavouriteCard name={me.favouritePlayer} />
          ) : (
            <EmptyState
              icon="star"
              title="No favourite player yet"
              body="Star a player on the Players page to pin their stats and form here."
              action={
                <Link to="/players" className={buttonPrimary}>
                  Browse players
                </Link>
              }
            />
          )}
        </div>
      )}
    </AppLayout>
  );
}
