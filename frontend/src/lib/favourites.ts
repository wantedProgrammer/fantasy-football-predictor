import { useCallback, useSyncExternalStore } from 'react';

import type { League } from './league';

/**
 * Favourite players, kept in this browser only (no accounts).
 * Stored per competition because player ids differ between the FPL and UEFA feeds.
 */
const STORAGE_KEY = 'predictor.favourites';

type Store = Record<League, string[]>;

const EMPTY: Store = { PREMIER_LEAGUE: [], CHAMPIONS_LEAGUE: [] };

let current: Store = read();
const listeners = new Set<() => void>();

function read(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      PREMIER_LEAGUE: Array.isArray(parsed.PREMIER_LEAGUE) ? parsed.PREMIER_LEAGUE.map(String) : [],
      CHAMPIONS_LEAGUE: Array.isArray(parsed.CHAMPIONS_LEAGUE) ? parsed.CHAMPIONS_LEAGUE.map(String) : [],
    };
  } catch {
    // Storage blocked or corrupt: start empty; favourites still work for this visit.
    return EMPTY;
  }
}

function write(next: Store) {
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures; the in-memory copy still updates the UI.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep tabs in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      current = read();
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useFavourites(league: League) {
  const store = useSyncExternalStore(subscribe, () => current, () => EMPTY);
  const ids = store[league];

  const toggle = useCallback(
    (playerId: string) => {
      const list = current[league];
      write({
        ...current,
        [league]: list.includes(playerId) ? list.filter((id) => id !== playerId) : [...list, playerId],
      });
    },
    [league],
  );

  return { ids, isFavourite: (playerId: string) => ids.includes(playerId), toggle };
}
