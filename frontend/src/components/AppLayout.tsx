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
  /** Page-wide hero band shown under the navigation. */
  hero?: ReactNode;
  /** Hide the league switcher on pages that do not depend on it. */
  showLeagueSwitcher?: boolean;
};

export default function AppLayout({
  children,
  hero,
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
    <div className="min-h-screen bg-ink text-white">
      {/* Utility bar */}
      <div className="bg-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Link to="/team" className="flex items-center gap-2.5">
            <img src={logo} alt="" className="h-7 w-7" />
            <span className="font-display text-lg font-extrabold uppercase italic tracking-wide">
              Fantasy<span className="text-accent">Predictor</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Log out
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 4H4v12h4M13 6l4 4-4 4M17 10H8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main navigation band */}
      <header className="sticky top-0 z-30 border-b border-line bg-band shadow-lg shadow-black/20">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <nav className="-mx-1 flex gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-4 py-2 text-[0.95rem] font-bold transition ${
                    isActive
                      ? 'bg-accent text-on-accent shadow-[0_0_24px_-4px_var(--accent)]'
                      : 'text-white/85 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {showLeagueSwitcher && (
            <div
              role="group"
              aria-label="Competition"
              className="flex rounded-full border border-white/15 bg-black/25 p-1"
            >
              {LEAGUES.map((item) => {
                const active = league === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLeague(item.id)}
                    aria-pressed={active}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider transition ${
                      active ? 'bg-white text-ink' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <span className="sm:hidden">{item.short}</span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {hero}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
