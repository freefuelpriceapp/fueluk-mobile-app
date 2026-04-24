/**
 * src/lib/stationStatus.js
 *
 * Pure helpers for determining a station's current open/closed status based on
 * the backend-provided `opening_hours` block. No React Native imports, no
 * side effects — this module is safe to import from any layer and from tests.
 *
 * All computations are done against `Europe/London` using `Intl.DateTimeFormat`
 * so BST/GMT transitions are handled without a timezone library. A user in
 * another timezone checking UK stations still sees UK-local status.
 */

const DAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const DAY_SHORT = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

const MINUTES_PER_DAY = 24 * 60;
const CLOSING_SOON_MINUTES = 60;
const DEFAULT_TZ = 'Europe/London';

// ─── Time helpers ────────────────────────────────────────────────────────────

/**
 * Parse an "HH:MM[:SS]" string to minutes-since-midnight. Returns null if the
 * input is unusable.
 */
function parseHHMM(s) {
  if (!s || typeof s !== 'string') return null;
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (isNaN(h) || isNaN(mm)) return null;
  return h * 60 + mm;
}

/**
 * Zero-padded HH:MM.
 */
function padHHMM(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Format a "HH:MM[:SS]" string as a short human label.
 *   "06:00:00" → "6am"
 *   "10:30:00" → "10:30am"
 *   "22:00:00" → "10pm"
 *   "00:00:00" → "midnight"
 *   "12:00:00" → "noon"
 */
function formatTimeLabel(timeStr) {
  const mins = parseHHMM(timeStr);
  if (mins == null) return '';
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  if (h === 0 && m === 0) return 'midnight';
  if (h === 12 && m === 0) return 'noon';
  const period = h < 12 ? 'am' : 'pm';
  let displayHour = h % 12;
  if (displayHour === 0) displayHour = 12;
  if (m === 0) return `${displayHour}${period}`;
  return `${displayHour}:${String(m).padStart(2, '0')}${period}`;
}

// ─── Timezone helpers ────────────────────────────────────────────────────────

/**
 * Return a plain object describing `date` rendered in the given IANA timezone
 * — year, month (1-12), day, hours, minutes, weekday (monday…sunday).
 */
function getZonedParts(date, timezone) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'long',
  });
  const parts = fmt.formatToParts(date);
  const get = (type) => {
    const p = parts.find((pp) => pp.type === type);
    return p ? p.value : '';
  };
  const weekday = get('weekday').toLowerCase();
  let hour = parseInt(get('hour'), 10);
  // Some Intl implementations return "24" for midnight in hour12:false mode.
  if (hour === 24) hour = 0;
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour,
    minute: parseInt(get('minute'), 10),
    weekday,
  };
}

/**
 * Given a zoned "year/month/day/hour/minute" in `timezone`, reconstruct the
 * corresponding absolute UTC Date. We search for the UTC instant whose zoned
 * representation matches the requested clock time — iterating at most a couple
 * of times to handle the DST offset difference.
 */
function zonedPartsToDate(year, month, day, hour, minute, timezone) {
  // First guess: treat the parts as if they were UTC, then correct.
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  for (let i = 0; i < 3; i += 1) {
    const candidate = new Date(utcMs);
    const zoned = getZonedParts(candidate, timezone);
    const diffMins =
      (year - zoned.year) * 525600 +
      (month - zoned.month) * 43800 +
      (day - zoned.day) * 1440 +
      (hour - zoned.hour) * 60 +
      (minute - zoned.minute);
    if (diffMins === 0) return candidate;
    utcMs += diffMins * 60 * 1000;
  }
  return new Date(utcMs);
}

function dayIndex(weekday) {
  return DAY_ORDER.indexOf(weekday);
}

function dayAt(offset, baseIndex) {
  return DAY_ORDER[(baseIndex + offset + 7 * 10) % 7];
}

// ─── Closure / 24h detection ─────────────────────────────────────────────────

function isOpen24h(openingHours) {
  const days = openingHours && openingHours.usual_days;
  if (!days) return false;
  for (const key of DAY_ORDER) {
    const d = days[key];
    if (!d || !d.is_24_hours) return false;
  }
  return true;
}

function hasAnyDayData(openingHours) {
  const days = openingHours && openingHours.usual_days;
  if (!days || typeof days !== 'object') return false;
  for (const key of DAY_ORDER) {
    const d = days[key];
    if (d && (d.is_24_hours || d.open || d.close)) return true;
  }
  return false;
}

// ─── Main helper ─────────────────────────────────────────────────────────────

/**
 * Determine a station's current open/closed status.
 *
 * @param {object|null} opening_hours
 * @param {boolean} temporary_closure
 * @param {boolean} permanent_closure
 * @param {Date} [now]
 * @param {string} [timezone]
 * @returns {{
 *   status: 'open_24h' | 'open' | 'closing_soon' | 'closed' |
 *           'temporarily_closed' | 'permanently_closed' | 'unknown',
 *   label: string,
 *   sub: string | null,
 *   nextChangeAt: Date | null,
 * }}
 *
 * TODO: Incorporate a UK bank holiday calendar. For MVP we only surface the
 * `opening_hours.bank_holiday` block when upstream already flags today as one
 * (rare). Building a proper England/Wales/Scotland/NI holiday lookup is future
 * work.
 */
function isStationOpenNow(
  opening_hours,
  temporary_closure,
  permanent_closure,
  now,
  timezone,
) {
  const nowDate = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();
  const tz = typeof timezone === 'string' && timezone ? timezone : DEFAULT_TZ;

  if (permanent_closure) {
    return {
      status: 'permanently_closed',
      label: 'Permanently closed',
      sub: null,
      nextChangeAt: null,
    };
  }

  if (temporary_closure) {
    return {
      status: 'temporarily_closed',
      label: 'Temporarily closed',
      sub: null,
      nextChangeAt: null,
    };
  }

  if (!hasAnyDayData(opening_hours)) {
    return {
      status: 'unknown',
      label: 'Hours unknown',
      sub: null,
      nextChangeAt: null,
    };
  }

  if (isOpen24h(opening_hours)) {
    return {
      status: 'open_24h',
      label: 'Open 24hrs',
      sub: 'Open 24 hours',
      nextChangeAt: null,
    };
  }

  const days = opening_hours.usual_days;
  const parts = getZonedParts(nowDate, tz);
  const todayIdx = dayIndex(parts.weekday);
  if (todayIdx < 0) {
    // Shouldn't happen — fall back to unknown.
    return {
      status: 'unknown',
      label: 'Hours unknown',
      sub: null,
      nextChangeAt: null,
    };
  }

  const nowMins = parts.hour * 60 + parts.minute;

  // ─ Overnight carry-over from yesterday ─
  // If yesterday's close is <= yesterday's open, it spans into today. If we're
  // still before yesterday's close (viewed from today), the station is open.
  const yesterdayKey = dayAt(-1, todayIdx);
  const yesterday = days[yesterdayKey];
  if (yesterday && !yesterday.is_24_hours) {
    const yOpen = parseHHMM(yesterday.open);
    const yClose = parseHHMM(yesterday.close);
    if (yOpen != null && yClose != null && yClose <= yOpen) {
      // Overnight window from yesterday ends today at yClose.
      if (nowMins < yClose) {
        const nextChangeAt = zonedPartsToDate(
          parts.year,
          parts.month,
          parts.day,
          Math.floor(yClose / 60),
          yClose % 60,
          tz,
        );
        const closeLabel = formatTimeLabel(padHHMM(yClose));
        const minutesUntilClose = yClose - nowMins;
        if (minutesUntilClose <= CLOSING_SOON_MINUTES) {
          return {
            status: 'closing_soon',
            label: `Closing soon · ${closeLabel}`,
            sub: `Closes ${closeLabel}`,
            nextChangeAt,
          };
        }
        return {
          status: 'open',
          label: `Open · closes ${closeLabel}`,
          sub: `Open · closes ${closeLabel}`,
          nextChangeAt,
        };
      }
    }
  }

  // ─ Today's own window ─
  const today = days[todayIdx >= 0 ? DAY_ORDER[todayIdx] : null];
  if (today && today.is_24_hours) {
    // One 24h day amid non-24h days — treat as open, with next change at
    // midnight (start of tomorrow's window).
    const nextChangeAt = findNextStatusChange(days, parts, tz);
    return {
      status: 'open',
      label: 'Open now',
      sub: 'Open today',
      nextChangeAt,
    };
  }

  if (today) {
    const tOpen = parseHHMM(today.open);
    const tClose = parseHHMM(today.close);
    if (tOpen != null && tClose != null) {
      const overnight = tClose <= tOpen;

      if (!overnight) {
        // Regular same-day window.
        if (nowMins < tOpen) {
          // Closed — opens later today.
          const openLabel = formatTimeLabel(today.open);
          const nextChangeAt = zonedPartsToDate(
            parts.year,
            parts.month,
            parts.day,
            Math.floor(tOpen / 60),
            tOpen % 60,
            tz,
          );
          return {
            status: 'closed',
            label: `Closed · opens ${openLabel}`,
            sub: `Opens ${openLabel} today`,
            nextChangeAt,
          };
        }
        if (nowMins < tClose) {
          // Open right now.
          const closeLabel = formatTimeLabel(today.close);
          const nextChangeAt = zonedPartsToDate(
            parts.year,
            parts.month,
            parts.day,
            Math.floor(tClose / 60),
            tClose % 60,
            tz,
          );
          const minutesUntilClose = tClose - nowMins;
          if (minutesUntilClose <= CLOSING_SOON_MINUTES) {
            return {
              status: 'closing_soon',
              label: `Closing soon · ${closeLabel}`,
              sub: `Closes ${closeLabel}`,
              nextChangeAt,
            };
          }
          return {
            status: 'open',
            label: `Open · closes ${closeLabel}`,
            sub: `Open today ${formatTimeLabel(today.open)}–${closeLabel}`,
            nextChangeAt,
          };
        }
        // Past close — fall through to "find next open".
      } else {
        // Overnight window starting today (e.g. 06:00–02:00 next day).
        if (nowMins < tOpen) {
          // Closed until today's open.
          const openLabel = formatTimeLabel(today.open);
          const nextChangeAt = zonedPartsToDate(
            parts.year,
            parts.month,
            parts.day,
            Math.floor(tOpen / 60),
            tOpen % 60,
            tz,
          );
          return {
            status: 'closed',
            label: `Closed · opens ${openLabel}`,
            sub: `Opens ${openLabel} today`,
            nextChangeAt,
          };
        }
        // nowMins >= tOpen — open through midnight into tomorrow.
        const closeLabel = formatTimeLabel(today.close);
        // next change is tomorrow at tClose.
        const tomorrow = new Date(nowDate.getTime() + 24 * 3600 * 1000);
        const tomorrowParts = getZonedParts(tomorrow, tz);
        const nextChangeAt = zonedPartsToDate(
          tomorrowParts.year,
          tomorrowParts.month,
          tomorrowParts.day,
          Math.floor(tClose / 60),
          tClose % 60,
          tz,
        );
        // closing_soon doesn't apply here — close is tomorrow.
        return {
          status: 'open',
          label: `Open · closes ${closeLabel}`,
          sub: `Open · closes ${closeLabel}`,
          nextChangeAt,
        };
      }
    }
  }

  // ─ Already-past-close or no valid today window: find next opening ─
  return findNextOpenStatus(days, parts, tz);
}

/**
 * Walk forward up to 7 days from the current zoned moment and return a
 * `closed` status result describing the next opening. If no open day is found
 * within a week, returns `unknown`.
 */
function findNextOpenStatus(days, nowParts, tz) {
  const todayIdx = dayIndex(nowParts.weekday);
  for (let offset = 0; offset <= 7; offset += 1) {
    const key = dayAt(offset, todayIdx);
    const d = days[key];
    if (!d) continue;
    if (d.is_24_hours) {
      // Opens at 00:00 on that day.
      const { year, month, day } = addZonedDays(nowParts, offset, tz);
      const nextChangeAt = zonedPartsToDate(year, month, day, 0, 0, tz);
      const dayName =
        offset === 0 ? 'today' : offset === 1 ? 'tomorrow' : DAY_SHORT[key];
      return {
        status: 'closed',
        label: `Closed · opens ${dayName === 'today' ? 'midnight' : dayName === 'tomorrow' ? 'tomorrow midnight' : `${dayName} midnight`}`,
        sub: `Opens ${dayName} at midnight`,
        nextChangeAt,
      };
    }
    const open = parseHHMM(d.open);
    if (open == null) continue;
    // If this is today (offset 0) and we're already past open, skip.
    if (offset === 0) {
      const nowMins = nowParts.hour * 60 + nowParts.minute;
      if (nowMins >= open) continue;
    }
    const { year, month, day } = addZonedDays(nowParts, offset, tz);
    const nextChangeAt = zonedPartsToDate(
      year,
      month,
      day,
      Math.floor(open / 60),
      open % 60,
      tz,
    );
    const openLabel = formatTimeLabel(d.open);
    let label;
    if (offset === 0) {
      label = `Closed · opens ${openLabel}`;
    } else if (offset === 1) {
      label = `Closed · opens tomorrow ${openLabel}`;
    } else {
      label = `Closed · opens ${DAY_SHORT[key]} ${openLabel}`;
    }
    return {
      status: 'closed',
      label,
      sub: label.replace(/^Closed · /, ''),
      nextChangeAt,
    };
  }
  return {
    status: 'unknown',
    label: 'Hours unknown',
    sub: null,
    nextChangeAt: null,
  };
}

/**
 * For the rare case where today is 24h but neighbouring days aren't — we're
 * "open" all day, but should refresh at midnight when the next day's rules
 * take over. Best-effort: next change = midnight local.
 */
function findNextStatusChange(days, nowParts, tz) {
  const tomorrow = addZonedDays(nowParts, 1, tz);
  return zonedPartsToDate(tomorrow.year, tomorrow.month, tomorrow.day, 0, 0, tz);
}

/**
 * Add `offset` whole days to a zoned { year, month, day } triple, preserving
 * the original clock time. Crosses month/year boundaries correctly.
 */
function addZonedDays(nowParts, offset, tz) {
  // Use noon UTC to avoid DST boundary issues on the date arithmetic itself.
  const anchor = new Date(
    Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day, 12, 0, 0),
  );
  const shifted = new Date(anchor.getTime() + offset * 24 * 3600 * 1000);
  const zoned = getZonedParts(shifted, tz);
  return { year: zoned.year, month: zoned.month, day: zoned.day };
}

/**
 * Whether the UI should visually de-emphasise the station. True for
 * permanently-closed stations; false otherwise.
 */
function shouldDeEmphasise(statusResult) {
  if (!statusResult) return false;
  return statusResult.status === 'permanently_closed';
}

module.exports = {
  isStationOpenNow,
  formatTimeLabel,
  shouldDeEmphasise,
  // Exported for test inspection:
  _internals: {
    parseHHMM,
    padHHMM,
    getZonedParts,
    zonedPartsToDate,
    DAY_ORDER,
    DAY_SHORT,
  },
};
