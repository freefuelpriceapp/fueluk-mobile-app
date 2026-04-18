/**
 * Unit tests for src/lib/quarantine.js
 * Run: `npx jest src/lib/__tests__/quarantine.test.js`
 */

const { evaluateStation, filterRankable, isQuarantined } = require('../quarantine');

const nowIso = () => new Date().toISOString();
const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();

describe('evaluateStation', () => {
  test('missing price is quarantined', () => {
    const r = evaluateStation({ prices: {} }, 'petrol');
    expect(r.quarantined).toBe(true);
    expect(r.reason).toBe('missing_price');
  });
  test('price out of range is quarantined', () => {
    const r = evaluateStation({ prices: { petrol: 30 }, last_updated: nowIso() }, 'petrol');
    expect(r.quarantined).toBe(true);
    expect(r.reason).toBe('out_of_range');
  });
  test('upstream flag is quarantined', () => {
    const r = evaluateStation({ is_quarantined: true, prices: { petrol: 150 } }, 'petrol');
    expect(r.quarantined).toBe(true);
    expect(r.reason).toBe('flagged_upstream');
  });
  test('too old price is quarantined', () => {
    const r = evaluateStation({ prices: { petrol: 150 }, last_updated: hoursAgo(24 * 30) }, 'petrol');
    expect(r.quarantined).toBe(true);
    expect(r.reason).toBe('too_old');
  });
  test('deviating from cohort median is quarantined', () => {
    const r = evaluateStation({ prices: { petrol: 220 }, last_updated: nowIso() }, 'petrol', 140);
    expect(r.quarantined).toBe(true);
    expect(r.reason).toBe('deviates_from_cohort');
  });
  test('happy path passes', () => {
    const r = evaluateStation({ prices: { petrol: 141 }, last_updated: nowIso() }, 'petrol', 140);
    expect(r.quarantined).toBe(false);
  });
});

describe('filterRankable', () => {
  test('removes outliers but keeps valid stations', () => {
    const set = [
      { prices: { petrol: 140 }, last_updated: nowIso() },
      { prices: { petrol: 141 }, last_updated: nowIso() },
      { prices: { petrol: 142 }, last_updated: nowIso() },
      { prices: { petrol: 250 }, last_updated: nowIso() },
    ];
    const out = filterRankable(set, 'petrol');
    expect(out.length).toBe(3);
  });
  test('empty / invalid input returns []', () => {
    expect(filterRankable([], 'petrol')).toEqual([]);
    expect(filterRankable(null, 'petrol')).toEqual([]);
  });
});

describe('isQuarantined', () => {
  test('true for obviously bad station', () => {
    expect(isQuarantined({ prices: {} }, 'petrol')).toBe(true);
  });
  test('false for healthy station', () => {
    expect(
      isQuarantined({ prices: { petrol: 150 }, last_updated: nowIso() }, 'petrol'),
    ).toBe(false);
  });
});

