import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type League = 'PREMIER_LEAGUE' | 'CHAMPIONS_LEAGUE';

// eslint-disable-next-line react-refresh/only-export-components
export const LEAGUES: { id: League; label: string; short: string; currency: string }[] = [
  { id: 'PREMIER_LEAGUE', label: 'Premier League', short: 'PL', currency: '£' },
  { id: 'CHAMPIONS_LEAGUE', label: 'Champions League', short: 'UCL', currency: '€' },
];

const STORAGE_KEY = 'predictor.league';

type LeagueContextValue = {
  league: League;
  setLeague: (league: League) => void;
  /** Selected gameweek for the active league; null means "the next one". */
  gameweek: number | null;
  setGameweek: (gameweek: number | null) => void;
  /** Currency symbol for the active league. */
  currency: string;
};

const LeagueContext = createContext<LeagueContextValue | null>(null);

function readStoredLeague(): League {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'PREMIER_LEAGUE' || stored === 'CHAMPIONS_LEAGUE') {
      return stored;
    }
  } catch {
    // Storage can be unavailable (private mode); fall back to the default.
  }
  return 'PREMIER_LEAGUE';
}

export function LeagueProvider({ children }: { children: ReactNode }) {
  const [league, setLeagueState] = useState<League>(readStoredLeague);
  // Each competition keeps its own gameweek selection.
  const [gameweeks, setGameweeks] = useState<Record<League, number | null>>({
    PREMIER_LEAGUE: null,
    CHAMPIONS_LEAGUE: null,
  });

  function setLeague(next: League) {
    setLeagueState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures; the choice still applies for this session.
    }
  }

  function setGameweek(next: number | null) {
    setGameweeks((current) => ({ ...current, [league]: next }));
  }

  const currency = LEAGUES.find((item) => item.id === league)?.currency ?? '£';

  return (
    <LeagueContext.Provider
      value={{ league, setLeague, gameweek: gameweeks[league], setGameweek, currency }}
    >
      {children}
    </LeagueContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLeague(): LeagueContextValue {
  const context = useContext(LeagueContext);
  if (!context) {
    throw new Error('useLeague must be used inside LeagueProvider');
  }
  return context;
}
