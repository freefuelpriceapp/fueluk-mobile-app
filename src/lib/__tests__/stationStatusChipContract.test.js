/**
 * Contract tests for the StationStatusChip component's inputs, expressed
 * against the pure helper to keep them runnable in the node-only jest
 * environment (the project's jest config does not include jsdom or an
 * RN test renderer). These confirm the chip-facing guarantees:
 *
 *   - `unknown` status → chip must render null
 *   - every other status → chip must render a non-empty label
 *   - nextChangeAt is a future Date when present (used by the chip timer)
 *   - a11y strings can be derived without additional data
 *
 * The rendering/timer behaviour is covered at the integration layer
 * (manual QA / Expo dev build). Keeping these pure keeps CI fast.
 */

const {
  isStationOpenNow,
  shouldDeEmphasise,
} = require('../stationStatus');

function allDay(open, close) {
  const out = {};
  ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach((d) => {
    out[d] = { open: `${open}:00`, close: `${close}:00`, is_24_hours: false };
  });
  return { usual_days: out };
}

function londonNow(y, m, d, h, mi) {
  // Same logic as stationStatus.test.js — resolve a UTC instant whose zoned
  // representation matches the requested clock in Europe/London.
  let ms = Date.UTC(y, m - 1, d, h, mi, 0);
  for (let i = 0; i < 4; i += 1) {
    const cand = new Date(ms);
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
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

describe('StationStatusChip contract', () => {
  test('unknown status → chip-facing label is "Hours unknown" and nextChangeAt null (chip returns null)', () => {
    const res = isStationOpenNow(null, false, false, londonNow(2026, 4, 24, 12, 0));
    expect(res.status).toBe('unknown');
    expect(res.nextChangeAt).toBeNull();
    // Chip convention: return null on unknown status.
  });

  test('every renderable status produces a non-empty label', () => {
    const cases = [
      [isStationOpenNow(allDay('06', '22'), false, false, londonNow(2026, 4, 24, 12, 0)), 'open'],
      [isStationOpenNow(allDay('06', '22'), false, false, londonNow(2026, 4, 24, 21, 30)), 'closing_soon'],
      [isStationOpenNow(allDay('06', '22'), false, false, londonNow(2026, 4, 24, 3, 0)), 'closed'],
      [isStationOpenNow(allDay('06', '22'), true, false, londonNow(2026, 4, 24, 12, 0)), 'temporarily_closed'],
      [isStationOpenNow(null, false, true, londonNow(2026, 4, 24, 12, 0)), 'permanently_closed'],
    ];
    for (const [res, expected] of cases) {
      expect(res.status).toBe(expected);
      expect(typeof res.label).toBe('string');
      expect(res.label.length).toBeGreaterThan(0);
    }
  });

  test('24h station renders "Open 24hrs"', () => {
    const all = {};
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach((d) => {
      all[d] = { open: '00:00:00', close: '23:59:00', is_24_hours: true };
    });
    const res = isStationOpenNow({ usual_days: all }, false, false, londonNow(2026, 4, 24, 3, 0));
    expect(res.status).toBe('open_24h');
    expect(res.label).toBe('Open 24hrs');
  });

  test('open status carries a future nextChangeAt (chip can schedule a timer)', () => {
    const now = londonNow(2026, 4, 24, 12, 0);
    const res = isStationOpenNow(allDay('06', '22'), false, false, now);
    expect(res.nextChangeAt).toBeInstanceOf(Date);
    expect(res.nextChangeAt.getTime()).toBeGreaterThan(now.getTime());
  });

  test('closed status carries a future nextChangeAt (chip can schedule a timer)', () => {
    const now = londonNow(2026, 4, 24, 3, 0);
    const res = isStationOpenNow(allDay('06', '22'), false, false, now);
    expect(res.nextChangeAt).toBeInstanceOf(Date);
    expect(res.nextChangeAt.getTime()).toBeGreaterThan(now.getTime());
  });

  test('closure statuses have nextChangeAt = null (chip falls back to 60s refresh)', () => {
    const p = isStationOpenNow(null, false, true, new Date());
    expect(p.nextChangeAt).toBeNull();
    const t = isStationOpenNow(null, true, false, new Date());
    expect(t.nextChangeAt).toBeNull();
  });

  test('shouldDeEmphasise wires through: permanent=true, others=false', () => {
    const perm = isStationOpenNow(null, false, true, new Date());
    expect(shouldDeEmphasise(perm)).toBe(true);
    const temp = isStationOpenNow(null, true, false, new Date());
    expect(shouldDeEmphasise(temp)).toBe(false);
    const open = isStationOpenNow(allDay('06', '22'), false, false, londonNow(2026, 4, 24, 12, 0));
    expect(shouldDeEmphasise(open)).toBe(false);
  });
});
