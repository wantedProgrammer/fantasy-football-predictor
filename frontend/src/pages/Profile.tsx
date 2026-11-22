import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';

import AppLayout from '../components/AppLayout';
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

  return (
    <AppLayout showLeagueSwitcher={false}>
      <section className="relative mb-8 overflow-hidden rounded-3xl border border-white/10">
        <img src={profileHero} alt="" className="h-56 w-full object-cover sm:h-72" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">
            Your profile
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-5xl">
            {data?.me ? `${data.me.name} ${data.me.surname}` : 'Your account'}
          </h1>
        </div>
      </section>

      {loading && <Loading label="Loading profile..." />}
      {error && !loading && (
        <ErrorPanel title="Unable to load profile" error={error} onRetry={() => refetch()} />
      )}

      {data?.me && (
        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">Account details</h2>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                ['First name', data.me.name],
                ['Surname', data.me.surname],
                ['Email', data.me.email],
                ['Mobile', data.me.mobile],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-800 p-4">
                  <dt className="text-xs uppercase tracking-wider text-slate-400">{label}</dt>
                  <dd className="mt-2 break-all font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <aside className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/15 to-slate-900 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              Favourite player
            </p>
            <h2 className="mt-3 text-3xl font-black">
              {data.me.favouritePlayer || 'Not selected yet'}
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              Choose or change your favourite player from the Players page.
            </p>
            <Link
              to="/players"
              className="mt-6 inline-flex rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
            >
              Browse players
            </Link>
          </aside>
        </section>
      )}
    </AppLayout>
  );
}
