import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useApolloClient } from '@apollo/client';
import { Link, NavLink, useNavigate } from 'react-router-dom';

import logo from '../assets/logo.svg';
import { LEAGUES, useLeague } from '../lib/league';

const NAV_ITEMS = [
  { to: '/team', label: 'Best XI' },
  { to: '/insights', label: 'Insights' },
  { to: '/players', label: 'Players' },
  { to: '/profile', label: 'Profile' },
];

type AppLayoutProps = {
  children: ReactNode;
  /** Hide the league switcher on pages that do not depend on it. */
  showLeagueSwitcher?: boolean;
};

export default function AppLayout({
  children,
  showLeagueSwitcher = true,
}: AppLayoutProps) {
  const navigate = useNavigate();
  const client = useApolloClient();
  const { league, setLeague } = useLeague();

  useEffect(() => {
    if (!sessionStorage.getItem('token')) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  async function logout() {
    sessionStorage.removeItem('token');
    await client.clearStore();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/team" className="flex items-center gap-3">
            <img src={logo} alt="" className="h-10 w-10" />
            <div>
              <p className="text-lg font-bold leading-tight">Fantasy Predictor</p>
              <p className="text-xs text-slate-400">FPL &amp; UCL team predictor</p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {showLeagueSwitcher && (
              <div
                role="group"
                aria-label="Competition"
                className="flex rounded-xl border border-white/10 bg-slate-900 p-1"
              >
                {LEAGUES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLeague(item.id)}
                    aria-pressed={league === item.id}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                      league === item.id
                        ? 'bg-emerald-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <span className="sm:hidden">{item.short}</span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={logout}
              className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/25"
            >
              Logout
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
