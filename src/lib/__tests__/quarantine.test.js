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
    const r = evaluateStation({ is_quarantined: true, prices: { petrol: 160 } }, 'petrol');
    expect(r.quarantined).toBe(true);
    expect(r.reason).toBe('flagged_upstream');
  });
  test('too old price is quarantined', () => {
    const r = evaluateStation({ prices: { petrol: 160 }, last_updated: hoursAgo(24 * 30) }, 'petrol');
    expect(r.quarantined).toBe(true);
    expect(r.reason).toBe('too_old');
  });
  test('deviating from cohort median is quarantined', () => {
    const r = evaluateStation({ prices: { petrol: 230 }, last_updated: nowIso() }, 'petrol', 160);
    expect(r.quarantined).toBe(true);
    expect(r.reason).toBe('deviates_from_cohort');
  });
  test('happy path passes', () => {
    const r = evaluateStation({ prices: { petrol: 161 }, last_updated: nowIso() }, 'petrol', 160);
    expect(r.quarantined).toBe(false);
  });

  // Wave A.1 per-fuel implausibility floors. Mirrors backend
  // MIN_PLAUSIBLE_PRICE_BY_FIELD; B10 0AE 140p petrol case must be caught.
  test('petrol_price 140 is quarantined as out_of_range (B10 0AE hotfix)', () => {
    const r = evaluateStation({ petrol_price: 140, last_updated: nowIso() }, 'petrol');
    expect(r.quarantined).toBe(true);
    expect(r.reason).toBe('out_of_range');
  });
  test('petrol_price 169.9 (real market value) passes', () => {
    const r = evaluateStation({ petrol_price: 169.9, last_updated: nowIso() }, 'petrol');
    expect(r.quarantined).toBe(false);
  });
  test('e10_price 135 passes (lower 130 floor for E10)', () => {
    const r = evaluateStation({ e10_price: 135, last_updated: nowIso() }, 'e10');
    expect(r.quarantined).toBe(false);
  });
  test('diesel_price 138 is quarantined (below 140 floor)', () => {
    const r = evaluateStation({ diesel_price: 138, last_updated: nowIso() }, 'diesel');
    expect(r.quarantined).toBe(true);
    expect(r.reason).toBe('out_of_range');
  });
  test('super_unleaded 149 is quarantined; 150 passes', () => {
    const lo = evaluateStation({ super_unleaded_price: 149, last_updated: nowIso() }, 'super_unleaded');
    expect(lo.quarantined).toBe(true);
    expect(lo.reason).toBe('out_of_range');
    const ok = evaluateStation({ super_unleaded_price: 150, last_updated: nowIso() }, 'super_unleaded');
    expect(ok.quarantined).toBe(false);
  });
  test('premium_diesel 149 is quarantined; 210 passes', () => {
    const lo = evaluateStation({ premium_diesel_price: 149, last_updated: nowIso() }, 'premium_diesel');
    expect(lo.quarantined).toBe(true);
    const ok = evaluateStation({ premium_diesel_price: 210, last_updated: nowIso() }, 'premium_diesel');
    expect(ok.quarantined).toBe(false);
  });
  test('cohort deviation still applies on top of per-fuel floor', () => {
    const r = evaluateStation({ petrol_price: 170, last_updated: nowIso() }, 'petrol', 140);
    expect(r.quarantined).toBe(true);
    expect(r.reason).toBe('deviates_from_cohort');
  });
});

describe('filterRankable', () => {
  test('removes outliers but keeps valid stations', () => {
    const set = [
      { prices: { petrol: 160 }, last_updated: nowIso() },
      { prices: { petrol: 161 }, last_updated: nowIso() },
      { prices: { petrol: 162 }, last_updated: nowIso() },
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

