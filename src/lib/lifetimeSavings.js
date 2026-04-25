/**
 * lifetimeSavings.js — pure helpers for the LifetimeSavingsCard.
 *
 * Stores a rolling list of saving entries in AsyncStorage (device-local
 * only, never sent to backend). Each entry is `{ ts, saving_pence }`.
 * The list is capped at 365 entries; the oldest are dropped first.
 *
 * Storage key: `@fueluk/lifetime_savings_v1`.
 */

export const LIFETIME_SAVINGS_KEY = '@fueluk/lifetime_savings_v1';
export const LIFETIME_MAX_ENTRIES = 365;

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

function coerceTimestamp(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const t = Date.parse(value);
    if (Number.isFinite(t)) return t;
  }
  if (value instanceof Date) {
    const t = value.getTime();
    if (Number.isFinite(t)) return t;
  }
  return null;
}

/**
 * appendLifetimeSaving(list, entry) — immutable. Returns a NEW list with
 * the entry appended and the result capped at LIFETIME_MAX_ENTRIES.
 *
 * Invalid entries are silently ignored (returns input list unchanged).
 * `entry.saving_pence` must be a finite number > 0; non-positive savings
 * (e.g. user picked the nearest station) are not tracked.
 */
export function appendLifetimeSaving(list, entry) {
  const safeList = Array.isArray(list) ? list : [];
  if (!entry || typeof entry !== 'object') return safeList;
  const ts = coerceTimestamp(entry.ts ?? Date.now());
  const saving = Number(entry.saving_pence);
  if (ts == null) return safeList;
  if (!isFiniteNumber(saving) || saving <= 0) return safeList;

  const next = [...safeList, { ts, saving_pence: saving }];
  if (next.length > LIFETIME_MAX_ENTRIES) {
    return next.slice(next.length - LIFETIME_MAX_ENTRIES);
  }
  return next;
}

/**
 * summariseLifetimeSavings(list)
 *
 * Returns:
 *   {
 *     totalPence: number,
 *     totalPounds: number,        // floor (whole £) — never inflate the number
 *     entryCount: number,
 *     firstEntryTs: number|null,  // ms epoch — used for "since 12 Apr"
 *     isEmpty: boolean,
 *   }
 */
export function summariseLifetimeSavings(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return {
      totalPence: 0,
      totalPounds: 0,
      entryCount: 0,
      firstEntryTs: null,
      isEmpty: true,
    };
  }
  let totalPence = 0;
  let firstEntryTs = null;
  for (const e of list) {
    if (!e || typeof e !== 'object') continue;
    const s = Number(e.saving_pence);
    if (!isFiniteNumber(s) || s <= 0) continue;
    totalPence += s;
    const ts = coerceTimestamp(e.ts);
    if (ts != null && (firstEntryTs == null || ts < firstEntryTs)) {
      firstEntryTs = ts;
    }
  }
  const totalPounds = Math.floor(totalPence / 100);
  return {
    totalPence,
    totalPounds,
    entryCount: list.length,
    firstEntryTs,
    isEmpty: totalPence <= 0,
  };
}

/**
 * formatLifetimeSinceDate(date, { now } = {})
 *
 * Returns "since 12 Apr" or "since today" depending on whether the date
 * matches today's calendar date. Returns null for missing/invalid input.
 *
 * Months are rendered using the JS engine's "short" locale month name,
 * which is consistent across React Native targets.
 */
export function formatLifetimeSinceDate(date, options = {}) {
  let target;
  if (date instanceof Date) {
    target = date;
  } else if (typeof date === 'number' && Number.isFinite(date)) {
    target = new Date(date);
  } else if (typeof date === 'string') {
    const t = Date.parse(date);
    if (!Number.isFinite(t)) return null;
    target = new Date(t);
  } else {
    return null;
  }
  if (Number.isNaN(target.getTime())) return null;

  const now = options.now instanceof Date ? options.now : new Date();
  const sameDay =
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate();
  if (sameDay) return 'since today';

  const day = target.getDate();
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const month = months[target.getMonth()];
  return `since ${day} ${month}`;
}

export default {
  LIFETIME_SAVINGS_KEY,
  LIFETIME_MAX_ENTRIES,
  appendLifetimeSaving,
  summariseLifetimeSavings,
  formatLifetimeSinceDate,
};
