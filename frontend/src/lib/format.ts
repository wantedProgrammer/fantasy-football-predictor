export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export const POSITION_LABELS: Record<Position, string> = {
  GK: 'Goalkeeper',
  DEF: 'Defender',
  MID: 'Midfielder',
  FWD: 'Forward',
};

export const POSITION_STYLES: Record<Position, string> = {
  GK: 'bg-amber-400/15 text-amber-300',
  DEF: 'bg-sky-400/15 text-sky-300',
  MID: 'bg-emerald-400/15 text-emerald-300',
  FWD: 'bg-rose-400/15 text-rose-300',
};

/** Fixture difficulty colours, 1 (easiest) to 5 (hardest). */
export const DIFFICULTY_STYLES: Record<number, string> = {
  1: 'bg-emerald-500 text-emerald-950',
  2: 'bg-emerald-300 text-emerald-950',
  3: 'bg-slate-500 text-white',
  4: 'bg-rose-400 text-rose-950',
  5: 'bg-rose-600 text-white',
};

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export function formatPrice(currency: string, price: number): string {
  return `${currency}${price.toFixed(1)}m`;
}

export function formatPoints(points: number): string {
  return points.toFixed(1);
}

export function formatDeadline(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fixtureLabel(fixture: {
  opponent: string;
  home: boolean;
}): string {
  return `${fixture.opponent} (${fixture.home ? 'H' : 'A'})`;
}
