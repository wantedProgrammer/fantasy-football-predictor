import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type League = 'PREMIER_LEAGUE' | 'CHAMPIONS_LEAGUE';

// eslint-disable-next-line react-refresh/only-export-components
export const LEAGUES: { id: League; label: string; short: string }[] = [
  { id: 'PREMIER_LEAGUE', label: 'Premier League', short: 'FPL' },
  { id: 'CHAMPIONS_LEAGUE', label: 'Champions League', short: 'UCL' },
];

const STORAGE_KEY = 'predictor.league';

type LeagueContextValue = {
  league: League;
  setLeague: (league: League) => void;
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

  function setLeague(next: League) {
    setLeagueState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures; the choice still applies for this session.
    }
  }

  return (
    <LeagueContext.Provider value={{ league, setLeague }}>
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
