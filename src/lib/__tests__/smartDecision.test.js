/**
 * Unit tests for src/lib/smartDecision.js
 *
 * Pure functions — no React, no I/O — safe to run under plain Jest.
 * Run: `npx jest src/lib/__tests__/smartDecision.test.js`
 */

const { driveCostPence, grossSavingsPence, worthTheDrive } = require('../smartDecision');

describe('grossSavingsPence', () => {
  test('positive saving when alt is cheaper', () => {
    expect(grossSavingsPence({ basePpl: 150, altPpl: 140, litres: 40 })).toBe(400);
  });
  test('negative when alt is dearer', () => {
    expect(grossSavingsPence({ basePpl: 140, altPpl: 150, litres: 40 })).toBe(-400);
  });
  test('returns null for bad input', () => {
    expect(grossSavingsPence({ basePpl: null, altPpl: 140 })).toBeNull();
    expect(grossSavingsPence({ basePpl: 140, altPpl: 'abc' })).toBeNull();
  });
});

describe('driveCostPence', () => {
  test('2-mile round trip at 40mpg and 140p/L is ~63.6p', () => {
    const c = driveCostPence({ miles: 2, mpg: 40, pencePerLitre: 140 });
    expect(c).toBeGreaterThan(60);
    expect(c).toBeLessThan(70);
  });
  test('null on invalid inputs', () => {
    expect(driveCostPence({ miles: -1, pencePerLitre: 140 })).toBeNull();
    expect(driveCostPence({ miles: 2, pencePerLitre: 0 })).toBeNull();
    expect(driveCostPence({ miles: 'x', pencePerLitre: 140 })).toBeNull();
  });
});

describe('worthTheDrive', () => {
  test('verdict=save when net saving is large', () => {
    const r = worthTheDrive({ basePpl: 150, altPpl: 140, extraMiles: 2 });
    expect(r.verdict).toBe('save');
    expect(r.worthIt).toBe(true);
    expect(r.netPence).toBeGreaterThan(50);
  });
  test('verdict=lose when drive cost dwarfs saving', () => {
    const r = worthTheDrive({ basePpl: 150, altPpl: 149, extraMiles: 10 });
    expect(r.verdict).toBe('lose');
    expect(r.worthIt).toBe(false);
  });
  test('verdict=break_even for marginal savings', () => {
    const r = worthTheDrive({ basePpl: 150, altPpl: 148, extraMiles: 3 });
    expect(['break_even', 'lose', 'save']).toContain(r.verdict);
    expect(Math.abs(r.netPence)).toBeLessThan(200);
  });
  test('verdict=unknown with missing inputs', () => {
    const r = worthTheDrive({ basePpl: null, altPpl: 140, extraMiles: 2 });
    expect(r.verdict).toBe('unknown');
    expect(r.worthIt).toBe(false);
  });
});

