import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

import { LEAGUES, useLeague } from '../lib/league';
import GameweekPicker from './GameweekPicker';
import { FooterNote, Logo } from './ui';

const NAV_ITEMS = [
  {
    to: '/team',
    label: 'Best XI',
    icon: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M4 12h16M9 3v3h6V3M9 21v-3h6v3" /></>,
  },
  {
    to: '/insights',
    label: 'Insights',
    icon: <path d="M4 19l5-6 4 3 7-9M15 7h5v5" />,
  },
  {
    to: '/players',
    label: 'Players',
    icon: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.5a3.5 3.5 0 010 7M18 14.8c1.8.8 3 2.5 3.5 5.2" /></>,
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.5 4.2-6.5 8-6.5s7 2 8 6.5" /></>,
  },
];

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function LeagueToggle() {
  const { league, setLeague } = useLeague();

  return (
    <div role="radiogroup" aria-label="Competition" className="relative inline-flex rounded-full border border-line bg-white/[0.03] p-1">
      {/* Sliding indicator */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-white/[0.09] ring-1 ring-mint/30 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ transform: league === 'CHAMPIONS_LEAGUE' ? 'translateX(100%)' : 'none' }}
      />
      {LEAGUES.map((item) => {
        const active = league === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setLeague(item.id)}
            className={`relative z-10 flex min-w-[4.5rem] items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors lg:min-w-[9.5rem] ${
              active ? 'text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            <span className={`num font-mono text-[11px] ${active ? 'text-mint' : 'text-faint'}`}>{item.currency}</span>
            <span className="lg:hidden">{item.short}</span>
            <span className="hidden lg:inline">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

type AppLayoutProps = {
  children: ReactNode;
  /** Page header rendered under the navigation, full width. */
  header?: ReactNode;
  /** Whether the selected gameweek affects this page. */
  gameweekApplies?: boolean;
};

export default function AppLayout({ children, header, gameweekApplies = true }: AppLayoutProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionStorage.getItem('token')) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-bg pb-24 text-ink md:pb-0">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <Link to="/team" aria-label="Fantasy Predictor home" className="shrink-0">
            <span className="hidden sm:block"><Logo /></span>
            <span className="sm:hidden"><Logo withWordmark={false} /></span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? 'bg-white/[0.07] text-ink' : 'text-muted hover:text-ink'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive && (
                      <span className="bg-accent absolute inset-x-3.5 -bottom-[11px] h-px shadow-[0_0_10px_rgb(33_227_138/0.8)]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <LeagueToggle />
            <div className="hidden sm:block">
              <GameweekPicker
                disabled={!gameweekApplies}
                disabledReason="This page always uses the next gameweek"
              />
            </div>
          </div>
        </div>

        {/* Gameweek picker gets its own row on small screens */}
        <div className="border-t border-line px-4 py-2 sm:hidden">
          <GameweekPicker disabled={!gameweekApplies} disabledReason="This page always uses the next gameweek" />
        </div>
      </header>

      {header}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>

      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6">
        <FooterNote />
      </footer>

      {/* Mobile tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl border border-line bg-[#111]/85 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl md:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition-colors ${
                isActive ? 'bg-white/[0.07] text-mint' : 'text-muted'
              }`
            }
          >
            <NavIcon>{item.icon}</NavIcon>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
