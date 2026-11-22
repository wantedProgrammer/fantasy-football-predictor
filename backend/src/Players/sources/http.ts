import axios from 'axios';

const REQUEST_TIMEOUT_MS = 20_000;

export async function getJson<T>(url: string): Promise<T> {
  const { data } = await axios.get<T>(url, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (fantasy-predictor)',
    },
  });

  return data;
}

/**
 * Parses the UEFA feed date formats into ISO strings (treated as UTC):
 *   "11/24/26 06:45:00 PM" and "11/24/2026 21:00:00".
 */
export function parseUefaDate(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }

  const match =
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(
      value.trim(),
    );

  if (!match) {
    return null;
  }

  const [, month, day, rawYear, rawHour, minute, second = '0', meridiem] =
    match;

  let year = Number(rawYear);
  if (year < 100) {
    year += 2000;
  }

  let hour = Number(rawHour);
  if (meridiem) {
    const isPm = meridiem.toUpperCase() === 'PM';
    if (isPm && hour < 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
  }

  const date = new Date(
    Date.UTC(
      year,
      Number(month) - 1,
      Number(day),
      hour,
      Number(minute),
      Number(second),
    ),
  );

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
