const {
  isStationOpenNow,
  formatTimeLabel,
  shouldDeEmphasise,
} = require('../stationStatus');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a usual_days block from a compact { monday: ['06:00', '22:00'], … }
 * map. Missing days yield closed (is_24_hours:false, no open/close).
 */
function hours(map) {
  const out = {};
  ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach((d) => {
    const v = map[d];
    if (v === '24h') {
      out[d] = { open: '00:00:00', close: '23:59:00', is_24_hours: true };
    } else if (Array.isArray(v)) {
      out[d] = { open: `${v[0]}:00`, close: `${v[1]}:00`, is_24_hours: false };
    } else {
      out[d] = { open: null, close: null, is_24_hours: false };
    }
  });
  return { usual_days: out, bank_holiday: null };
}

function all24() {
  const out = {};
  ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach((d) => {
    out[d] = { open: '00:00:00', close: '23:59:00', is_24_hours: true };
  });
  return { usual_days: out, bank_holiday: null };
}

/**
 * Produce a Date whose `Europe/London` zoned representation equals the given
 * y/m/d/h/m. BST-aware: works the same whether the chosen date is in BST or
 * GMT.
 */
function londonDate(y, m, d, h, mi) {
  // Start from a UTC guess and walk it to match Europe/London parts.
  let ms = Date.UTC(y, m - 1, d, h, mi, 0);
  for (let i = 0; i < 4; i += 1) {
    const cand = new Date(ms);
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(cand);
    const g = (t) => parseInt(parts.find((p) => p.type === t).value, 10);
    let hh = g('hour');
    if (hh === 24) hh = 0;
    const diffMins =
      (y - g('year')) * 525600 +
      (m - g('month')) * 43800 +
      (d - g('day')) * 1440 +
      (h - hh) * 60 +
      (mi - g('minute'));
    if (diffMins === 0) return cand;
    ms += diffMins * 60 * 1000;
  }
  return new Date(ms);
}

const SHOP_HOURS = hours({
  monday: ['06:00', '22:00'],
  tuesday: ['06:00', '22:00'],
  wednesday: ['06:00', '22:00'],
  thursday: ['06:00', '22:00'],
  friday: ['06:00', '22:00'],
  saturday: ['06:00', '22:00'],
  sunday: ['10:00', '16:00'],
});

// ─── formatTimeLabel ─────────────────────────────────────────────────────────

describe('formatTimeLabel', () => {
  test('formats on-the-hour AM', () => {
    expect(formatTimeLabel('06:00:00')).toBe('6am');
  });
  test('formats on-the-hour PM', () => {
    expect(formatTimeLabel('22:00:00')).toBe('10pm');
  });
  test('formats half-past AM', () => {
    expect(formatTimeLabel('10:30:00')).toBe('10:30am');
  });
  test('formats half-past PM', () => {
    expect(formatTimeLabel('21:45:00')).toBe('9:45pm');
  });
  test('midnight', () => {
    expect(formatTimeLabel('00:00:00')).toBe('midnight');
  });
  test('noon', () => {
    expect(formatTimeLabel('12:00:00')).toBe('noon');
  });
  test('12:30pm', () => {
    expect(formatTimeLabel('12:30:00')).toBe('12:30pm');
  });
  test('returns empty string for nonsense', () => {
    expect(formatTimeLabel(null)).toBe('');
    expect(formatTimeLabel('nope')).toBe('');
  });
});

// ─── Closure branches ────────────────────────────────────────────────────────

describe('isStationOpenNow — closure flags', () => {
  test('permanent_closure wins over everything', () => {
    const res = isStationOpenNow(all24(), true, true, londonDate(2026, 4, 24, 12, 0));
    expect(res.status).toBe('permanently_closed');
    expect(res.label).toBe('Permanently closed');
    expect(res.nextChangeAt).toBeNull();
  });

  test('temporary_closure with no permanent', () => {
    const res = isStationOpenNow(all24(), true, false, londonDate(2026, 4, 24, 12, 0));
    expect(res.status).toBe('temporarily_closed');
    expect(res.label).toBe('Temporarily closed');
  });

  test('null opening_hours → unknown', () => {
    const res = isStationOpenNow(null, false, false, londonDate(2026, 4, 24, 12, 0));
    expect(res.status).toBe('unknown');
  });

  test('empty usual_days → unknown', () => {
    const res = isStationOpenNow({ usual_days: {} }, false, false, londonDate(2026, 4, 24, 12, 0));
    expect(res.status).toBe('unknown');
  });
});

// ─── 24h stations ────────────────────────────────────────────────────────────

describe('isStationOpenNow — 24h', () => {
  test('24h at noon', () => {
    const res = isStationOpenNow(all24(), false, false, londonDate(2026, 4, 24, 12, 0));
    expect(res.status).toBe('open_24h');
    expect(res.label).toBe('Open 24hrs');
  });

  test('24h at 3am', () => {
    const res = isStationOpenNow(all24(), false, false, londonDate(2026, 4, 24, 3, 0));
    expect(res.status).toBe('open_24h');
  });

  test('24h at 23:45', () => {
    const res = isStationOpenNow(all24(), false, false, londonDate(2026, 4, 24, 23, 45));
    expect(res.status).toBe('open_24h');
  });
});

// ─── Regular station ────────────────────────────────────────────────────────

describe('isStationOpenNow — regular hours', () => {
  // 2026-04-24 is a Friday.
  test('before open: 3am Friday → closed, opens 6am today', () => {
    const res = isStationOpenNow(SHOP_HOURS, false, false, londonDate(2026, 4, 24, 3, 0));
    expect(res.status).toBe('closed');
    expect(res.label).toBe('Closed · opens 6am');
    expect(res.nextChangeAt).not.toBeNull();
    // Next change is today 06:00 London.
    const expected = londonDate(2026, 4, 24, 6, 0);
    expect(res.nextChangeAt.getTime()).toBe(expected.getTime());
  });

  test('during: noon Friday → open, closes 10pm', () => {
    const res = isStationOpenNow(SHOP_HOURS, false, false, londonDate(2026, 4, 24, 12, 0));
    expect(res.status).toBe('open');
    expect(res.label).toBe('Open · closes 10pm');
  });

  test('closing soon: 21:15 Friday (45 min before close) → closing_soon', () => {
    const res = isStationOpenNow(SHOP_HOURS, false, false, londonDate(2026, 4, 24, 21, 15));
    expect(res.status).toBe('closing_soon');
    expect(res.label).toBe('Closing soon · 10pm');
  });

  test('59 min before close → closing_soon', () => {
    const res = isStationOpenNow(SHOP_HOURS, false, false, londonDate(2026, 4, 24, 21, 1));
    expect(res.status).toBe('closing_soon');
  });

  test('61 min before close → still open', () => {
    const res = isStationOpenNow(SHOP_HOURS, false, false, londonDate(2026, 4, 24, 20, 59));
    expect(res.status).toBe('open');
  });

  test('exactly 60 min before close → closing_soon (boundary inclusive)', () => {
    const res = isStationOpenNow(SHOP_HOURS, false, false, londonDate(2026, 4, 24, 21, 0));
    expect(res.status).toBe('closing_soon');
  });

  test('after close: 23:00 Friday → closed, opens 6am tomorrow', () => {
    const res = isStationOpenNow(SHOP_HOURS, false, false, londonDate(2026, 4, 24, 23, 0));
    expect(res.status).toBe('closed');
    expect(res.label).toBe('Closed · opens tomorrow 6am');
  });

  test('Sunday 11pm → closed, opens Mon 6am', () => {
    // 2026-04-26 is Sunday.
    const res = isStationOpenNow(SHOP_HOURS, false, false, londonDate(2026, 4, 26, 23, 0));
    expect(res.status).toBe('closed');
    expect(res.label).toBe('Closed · opens tomorrow 6am');
  });

  test('Sunday 2am with shop closed Sun (no hours) → closed, opens Mon 6am', () => {
    const closedSunday = hours({
      monday: ['06:00', '22:00'],
      tuesday: ['06:00', '22:00'],
      wednesday: ['06:00', '22:00'],
      thursday: ['06:00', '22:00'],
      friday: ['06:00', '22:00'],
      saturday: ['06:00', '22:00'],
      // sunday omitted / closed
    });
    const res = isStationOpenNow(closedSunday, false, false, londonDate(2026, 4, 26, 2, 0));
    expect(res.status).toBe('closed');
    expect(res.label).toBe('Closed · opens tomorrow 6am');
  });

  test('Saturday 11pm with shop closed Sunday → opens Mon 6am', () => {
    const closedSunday = hours({
      monday: ['06:00', '22:00'],
      tuesday: ['06:00', '22:00'],
      wednesday: ['06:00', '22:00'],
      thursday: ['06:00', '22:00'],
      friday: ['06:00', '22:00'],
      saturday: ['06:00', '22:00'],
    });
    // 2026-04-25 is Saturday.
    const res = isStationOpenNow(closedSunday, false, false, londonDate(2026, 4, 25, 23, 0));
    expect(res.status).toBe('closed');
    expect(res.label).toBe('Closed · opens Mon 6am');
  });

  test('nextChangeAt on open status is today\'s close time', () => {
    const res = isStationOpenNow(SHOP_HOURS, false, false, londonDate(2026, 4, 24, 14, 0));
    const expected = londonDate(2026, 4, 24, 22, 0);
    expect(res.nextChangeAt.getTime()).toBe(expected.getTime());
  });

  test('nextChangeAt after close is tomorrow\'s open', () => {
    const res = isStationOpenNow(SHOP_HOURS, false, false, londonDate(2026, 4, 24, 23, 0));
    const expected = londonDate(2026, 4, 25, 6, 0);
    expect(res.nextChangeAt.getTime()).toBe(expected.getTime());
  });
});

// ─── Overnight hours ─────────────────────────────────────────────────────────

describe('isStationOpenNow — overnight', () => {
  // All week: open 06:00, close 02:00 next day.
  const OVERNIGHT = hours({
    monday: ['06:00', '02:00'],
    tuesday: ['06:00', '02:00'],
    wednesday: ['06:00', '02:00'],
    thursday: ['06:00', '02:00'],
    friday: ['06:00', '02:00'],
    saturday: ['06:00', '02:00'],
    sunday: ['06:00', '02:00'],
  });

  test('1am Friday — open (carry-over from Thursday)', () => {
    const res = isStationOpenNow(OVERNIGHT, false, false, londonDate(2026, 4, 24, 1, 0));
    expect(res.status).toBe('closing_soon');
    expect(res.label).toBe('Closing soon · 2am');
  });

  test('3am Friday — closed (past 2am close, before 6am open)', () => {
    const res = isStationOpenNow(OVERNIGHT, false, false, londonDate(2026, 4, 24, 3, 0));
    expect(res.status).toBe('closed');
    expect(res.label).toBe('Closed · opens 6am');
  });

  test('7am Friday — open through midnight into Saturday 2am', () => {
    const res = isStationOpenNow(OVERNIGHT, false, false, londonDate(2026, 4, 24, 7, 0));
    expect(res.status).toBe('open');
    expect(res.label).toBe('Open · closes 2am');
    const expected = londonDate(2026, 4, 25, 2, 0);
    expect(res.nextChangeAt.getTime()).toBe(expected.getTime());
  });

  test('11pm Friday — open (overnight window)', () => {
    const res = isStationOpenNow(OVERNIGHT, false, false, londonDate(2026, 4, 24, 23, 0));
    expect(res.status).toBe('open');
  });
});

// ─── BST/GMT boundary ───────────────────────────────────────────────────────

describe('isStationOpenNow — DST transitions', () => {
  // 2026 UK clocks go FORWARD at 01:00 GMT on 29 March (1am → 2am).
  test('just before BST starts on 2026-03-29 — still GMT (Sunday opens 10am)', () => {
    // 00:30 London on the morning of the transition (Sunday).
    const res = isStationOpenNow(SHOP_HOURS, false, false, londonDate(2026, 3, 29, 0, 30));
    expect(res.status).toBe('closed');
    expect(res.label).toBe('Closed · opens 10am');
  });

  test('after BST has started — 11am Sunday local still open', () => {
    // 11:00 London on 2026-03-29 — in BST, within Sunday 10am–4pm.
    const res = isStationOpenNow(SHOP_HOURS, false, false, londonDate(2026, 3, 29, 11, 0));
    expect(res.status).toBe('open');
  });

  test('before BST transition — Friday 3am GMT opens 6am today (Mar 27 Fri)', () => {
    // 2026-03-27 is a Friday (GMT). Before transition.
    const res = isStationOpenNow(SHOP_HOURS, false, false, londonDate(2026, 3, 27, 3, 0));
    expect(res.status).toBe('closed');
    expect(res.label).toBe('Closed · opens 6am');
    // nextChangeAt is 06:00 London = 06:00 GMT.
    const expected = londonDate(2026, 3, 27, 6, 0);
    expect(res.nextChangeAt.getTime()).toBe(expected.getTime());
  });

  test('after BST transition — Monday 3am BST opens 6am today (Mar 30 Mon)', () => {
    // 2026-03-30 is a Monday, now in BST.
    const res = isStationOpenNow(SHOP_HOURS, false, false, londonDate(2026, 3, 30, 3, 0));
    expect(res.status).toBe('closed');
    expect(res.label).toBe('Closed · opens 6am');
    // nextChangeAt is 06:00 London = 05:00 UTC (BST).
    const expected = londonDate(2026, 3, 30, 6, 0);
    expect(res.nextChangeAt.getTime()).toBe(expected.getTime());
    expect(res.nextChangeAt.getUTCHours()).toBe(5);
  });

  test('UK timezone used regardless of caller timezone — user in Spain sees UK status', () => {
    // Pick a UTC instant that is 23:00 London (past close) but 00:00 in CET
    // the next day. Our helper should still report "closed".
    const utc = new Date(Date.UTC(2026, 3, 24, 22, 0)); // Apr 24, 22:00 UTC = 23:00 BST London.
    const res = isStationOpenNow(SHOP_HOURS, false, false, utc);
    expect(res.status).toBe('closed');
  });
});

// ─── Bank holiday awareness (C3/E7) ────────────────────────────────────────
// These tests verify the bank holiday calendar is correctly wired into
// isStationOpenNow. Easter Monday 2026 = Mon 6 Apr; Christmas 2026 = Fri 25 Dec.

describe('isStationOpenNow — bank holiday awareness', () => {
  // Helper: station with a bank_holiday block 08:00–18:00.
  function supermarketHoursWithBankHoliday() {
    return {
      ...SHOP_HOURS,
      bank_holiday: { open: '08:00', close: '18:00', is_24_hours: false },
    };
  }

  test('Easter Monday 2026 — station WITH bank_holiday block → uses bank_holiday hours, open at 10:00', () => {
    const oh = supermarketHoursWithBankHoliday();
    // Easter Monday 2026 = 6 Apr 2026; station open 08:00–18:00 on BH
    const res = isStationOpenNow(oh, false, false, londonDate(2026, 4, 6, 10, 0));
    expect(res.status).toBe('open');
  });

  test('Easter Monday 2026 — station WITH bank_holiday block → uses bank_holiday hours, closed before 08:00', () => {
    const oh = supermarketHoursWithBankHoliday();
    const res = isStationOpenNow(oh, false, false, londonDate(2026, 4, 6, 7, 30));
    // Before 08:00 on BH → closed (usual hours are 06:00–22:00 but BH hours 08:00–18:00 apply)
    expect(res.status).toBe('closed');
  });

  test('Christmas Day 2026 — station WITHOUT bank_holiday block → CLOSED', () => {
    // No bank_holiday block — safest default is closed
    const oh = {
      ...SHOP_HOURS,
      bank_holiday: null,
    };
    const res = isStationOpenNow(oh, false, false, londonDate(2026, 12, 25, 12, 0));
    expect(res.status).toBe('closed');
    expect(res.label).toBe('Closed · bank holiday');
  });

  test('Christmas Day 2026 — station with no opening_hours at all → closed (unknown) not open', () => {
    // opening_hours is null — station has no data, and it is a bank holiday.
    // The bank holiday check fires first but opening_hours is null so
    // bh = null → returns closed-bank-holiday.
    const res = isStationOpenNow(null, false, false, londonDate(2026, 12, 25, 12, 0));
    // null opening_hours → bank holiday check still fires (safely)
    // bh = null → CLOSED bank holiday
    expect(res.status).toBe('closed');
  });

  test('Regular Tuesday 2026-03-10 — bank holiday list ignored, usual hours apply', () => {
    const oh = supermarketHoursWithBankHoliday();
    // 10 March 2026 is not a bank holiday — usual_days should apply
    const res = isStationOpenNow(oh, false, false, londonDate(2026, 3, 10, 12, 0));
    expect(res.status).toBe('open');
    // Should use SHOP_HOURS usual_days (closes 22:00 on Tuesday)
    expect(res.label).toBe('Open · closes 10pm');
  });

  test('Easter Monday 2026 — 24h bank_holiday block → open_24h status', () => {
    const oh = {
      ...SHOP_HOURS,
      bank_holiday: { open: '00:00', close: '23:59', is_24_hours: true },
    };
    const res = isStationOpenNow(oh, false, false, londonDate(2026, 4, 6, 3, 0));
    // 24h bank holiday block → open_24h
    expect(res.status).toBe('open_24h');
  });

  test('Non-bank-holiday day — bank_holiday block is silently ignored even if present', () => {
    const oh = {
      ...SHOP_HOURS,
      bank_holiday: { type: 'standard', open_time: '08:00:00', close_time: '20:00:00', is_24_hours: false },
    };
    // 24 Apr 2026 is NOT a bank holiday — usual_days (SHOP_HOURS) should apply
    const res = isStationOpenNow(oh, false, false, londonDate(2026, 4, 24, 12, 0));
    expect(res.status).toBe('open');
    expect(res.label).toBe('Open · closes 10pm');
  });
});

// ─── shouldDeEmphasise ───────────────────────────────────────────────────────

describe('shouldDeEmphasise', () => {
  test('permanently closed → true', () => {
    const res = isStationOpenNow(null, false, true, londonDate(2026, 4, 24, 12, 0));
    expect(shouldDeEmphasise(res)).toBe(true);
  });
  test('temporarily closed → false', () => {
    const res = isStationOpenNow(null, true, false, londonDate(2026, 4, 24, 12, 0));
    expect(shouldDeEmphasise(res)).toBe(false);
  });
  test('open → false', () => {
    const res = isStationOpenNow(SHOP_HOURS, false, false, londonDate(2026, 4, 24, 12, 0));
    expect(shouldDeEmphasise(res)).toBe(false);
  });
  test('null → false', () => {
    expect(shouldDeEmphasise(null)).toBe(false);
  });
});
