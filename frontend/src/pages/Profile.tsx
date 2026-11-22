import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';

import AppLayout from '../components/AppLayout';
import PageHero from '../components/PageHero';
import { ErrorPanel, Loading } from '../components/QueryState';
import { ME } from '../graphql/profile';
import profileHero from '../assets/2025-05-07t205629z_288169850_up1el571m63cj_rtrmadp_3_soccer-champions-psg-ars-report.jpg';

type UserProfile = {
  id: number;
  name: string;
  surname: string;
  email: string;
  mobile: string;
  favouritePlayer?: string | null;
};

export default function Profile() {
  const { data, loading, error, refetch } = useQuery<{ me: UserProfile }>(ME, {
    fetchPolicy: 'network-only',
  });
  const me = data?.me;
  const initials = me ? `${me.name.charAt(0)}${me.surname.charAt(0)}`.toUpperCase() : '';

  return (
    <AppLayout
      showLeagueSwitcher={false}
      hero={
        <PageHero
          eyebrow="Manager profile"
          title={me ? `${me.name} ${me.surname}` : 'Your account'}
          image={profileHero}
        />
      }
    >
      {loading && <Loading label="Loading profile..." />}
      {error && !loading && (
        <ErrorPanel title="Unable to load profile" error={error} onRetry={() => refetch()} />
      )}

      {me && (
        <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-3xl border border-line bg-surface p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sweep font-display text-3xl font-black italic">
                {initials}
              </span>
              <div>
                <p className="eyebrow text-accent">Account details</p>
                <h2 className="font-display text-3xl font-extrabold uppercase italic">
                  {me.name} {me.surname}
                </h2>
              </div>
            </div>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ['First name', me.name],
                ['Surname', me.surname],
                ['Email', me.email],
                ['Mobile', me.mobile],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-raised p-4">
                  <dt className="eyebrow text-white/50">{label}</dt>
                  <dd className="mt-1.5 break-all font-bold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <aside className="relative isolate overflow-hidden rounded-3xl border border-amber-300/30 bg-surface p-6">
            <div className="absolute -right-10 -top-10 -z-10 h-48 w-48 rounded-full bg-amber-300/20 blur-3xl" />
            <span className="font-display text-7xl font-black italic leading-none text-amber-300/90">★</span>
            <p className="eyebrow mt-2 text-amber-300">Favourite player</p>
            <h2 className="headline mt-2 text-5xl">{me.favouritePlayer || 'Not selected yet'}</h2>
            <p className="mt-3 text-sm text-white/70">
              Choose or change your favourite player from the Players page.
            </p>
            <Link
              to="/players"
              className="mt-6 inline-flex rounded-full bg-amber-300 px-5 py-3 text-sm font-extrabold text-black transition hover:bg-amber-200"
            >
              Browse players →
            </Link>
          </aside>
        </section>
      )}
    </AppLayout>
  );
}
