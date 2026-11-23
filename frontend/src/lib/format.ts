export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export const POSITION_LABELS: Record<Position, string> = {
  GK: 'Goalkeeper',
  DEF: 'Defender',
  MID: 'Midfielder',
  FWD: 'Forward',
};

/** Position tags: neutral glass chip with a position-coloured label. */
export const POSITION_STYLES: Record<Position, string> = {
  GK: 'bg-white/[0.06] text-[#f5c451]',
  DEF: 'bg-white/[0.06] text-[#7cc8ff]',
  MID: 'bg-white/[0.06] text-mint',
  FWD: 'bg-white/[0.06] text-[#ff9b78]',
};

/** Fixture difficulty, 1 (easiest) to 5 (hardest), green through to red. */
export const DIFFICULTY_STYLES: Record<number, string> = {
  1: 'bg-[#1fcb7a] text-[#03170c]',
  2: 'bg-[#1fcb7a]/30 text-[#7df0b6]',
  3: 'bg-white/[0.07] text-muted',
  4: 'bg-[#ff6a3d]/30 text-[#ffb59a]',
  5: 'bg-[#e5484d] text-white',
};

/** Home-kit colours for clubs, keyed by short name. Unknown clubs get a stable hashed colour. */
const KIT_COLOURS: Record<string, string> = {
  ARS: '#ef0107',
  AVL: '#7a1a43',
  BOU: '#d71920',
  BRE: '#e30613',
  BHA: '#0057b8',
  BUR: '#6c1d45',
  CHE: '#034694',
  CRY: '#1b458f',
  EVE: '#003399',
  FUL: '#f5f5f5',
  IPS: '#2a52be',
  LEE: '#f5f5f5',
  LEI: '#003090',
  LIV: '#c8102e',
  MCI: '#6cabdd',
  MUN: '#da291c',
  NEW: '#1d1d1b',
  NFO: '#dd0000',
  SOU: '#d71920',
  SUN: '#eb172b',
  TOT: '#f5f5f5',
  WHU: '#7a263a',
  WOL: '#fdb913',
  // Common Champions League clubs
  RMA: '#f5f5f5',
  BAR: '#a50044',
  FCB: '#a50044',
  BAY: '#dc052d',
  PSG: '#004170',
  JUV: '#1d1d1b',
  INT: '#0068a8',
  MIL: '#fb090b',
  BVB: '#fde100',
  DOR: '#fde100',
  ATM: '#cb3524',
  BEN: '#e83030',
  POR: '#00428c',
  AJA: '#d2122e',
  LIL: '#e01e13',
};

function hashHue(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360;
  }
  return hash;
}

/** Shirt colour and a readable text colour on top of it. */
export function kitColours(teamShort: string): { shirt: string; text: string } {
  const shirt = KIT_COLOURS[teamShort.toUpperCase()] ?? `hsl(${hashHue(teamShort)} 62% 42%)`;
  const light = ['#f5f5f5', '#fdb913', '#fde100', '#6cabdd'].includes(shirt);
  return { shirt, text: light ? '#111827' : '#ffffff' };
}

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
