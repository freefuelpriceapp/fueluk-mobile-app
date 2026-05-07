/**
 * Tests for src/lib/ukBankHolidays.js
 *
 * Audit item C3/E7: bundle a 3-year UK bank holiday calendar and expose
 * isUkBankHoliday() for wiring into stationStatus.isStationOpenNow().
 *
 * Key dates tested:
 *   Easter Monday 2026 = 6 April 2026 (E&W + NI, not a standard Scotland BH)
 *   Christmas Day 2026 = 25 December 2026 (all regions)
 *   St Andrew's Day     = 30 November (Scotland only)
 *   St Patrick's Day    = 17 March (Northern Ireland only)
 *   Regular Tuesday     = 10 March 2026 (not a bank holiday anywhere)
 */

const {
  UK_BANK_HOLIDAYS_2026_2028,
  isUkBankHoliday,
} = require('../ukBankHolidays');

// ─── UK_BANK_HOLIDAYS_2026_2028 structure ──────────────────────────────────

describe('UK_BANK_HOLIDAYS_2026_2028', () => {
  it('exports a calendar object with three region keys', () => {
    expect(UK_BANK_HOLIDAYS_2026_2028).toBeDefined();
    expect(UK_BANK_HOLIDAYS_2026_2028['england-and-wales']).toBeDefined();
    expect(UK_BANK_HOLIDAYS_2026_2028['scotland']).toBeDefined();
    expect(UK_BANK_HOLIDAYS_2026_2028['northern-ireland']).toBeDefined();
  });

  it('all dates are valid ISO YYYY-MM-DD strings in 2026–2028', () => {
    const isoRe = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    for (const region of ['england-and-wales', 'scotland', 'northern-ireland']) {
      for (const d of UK_BANK_HOLIDAYS_2026_2028[region]) {
        expect(d).toMatch(isoRe);
        const year = parseInt(d.slice(0, 4), 10);
        expect(year).toBeGreaterThanOrEqual(2026);
        expect(year).toBeLessThanOrEqual(2028);
      }
    }
  });

  it('has at least 8 England & Wales bank holidays per year', () => {
    const ew = UK_BANK_HOLIDAYS_2026_2028['england-and-wales'];
    for (const year of [2026, 2027, 2028]) {
      const count = ew.filter((d) => d.startsWith(String(year))).length;
      expect(count).toBeGreaterThanOrEqual(8);
    }
  });
});

// ─── isUkBankHoliday — England & Wales ─────────────────────────────────────

describe('isUkBankHoliday — England & Wales (default region)', () => {
  it('Test 1: Easter Monday 2026 (Apr 6) is a bank holiday in E&W', () => {
    expect(isUkBankHoliday('2026-04-06')).toBe(true);
  });

  it('Test 2: Christmas Day 2026 (Dec 25) is a bank holiday in E&W', () => {
    expect(isUkBankHoliday('2026-12-25')).toBe(true);
  });

  it('Test 3: Regular Tuesday 2026-03-10 is NOT a bank holiday', () => {
    expect(isUkBankHoliday('2026-03-10')).toBe(false);
  });

  it('Test 8: accepts a Date object (Easter Monday 2026 as Date)', () => {
    // Use UTC constructor to ensure YYYY-MM-DD = 2026-05-04 for Early May BH
    const d = new Date(Date.UTC(2026, 4, 4, 12, 0, 0)); // May 4 2026 UTC
    expect(isUkBankHoliday(d)).toBe(true);
  });

  it('Test 9: date before 2026 range returns false gracefully', () => {
    expect(isUkBankHoliday('2025-01-01')).toBe(false);
  });

  it('New Year\'s Day 2027 is a bank holiday in E&W', () => {
    expect(isUkBankHoliday('2027-01-01')).toBe(true);
  });

  it('Good Friday 2028 (Apr 14) is a bank holiday in E&W', () => {
    expect(isUkBankHoliday('2028-04-14')).toBe(true);
  });

  it('A random day not in 2026–2028 range returns false', () => {
    expect(isUkBankHoliday('2030-01-01')).toBe(false);
  });

  it('undefined/null input returns false without throwing', () => {
    expect(isUkBankHoliday(null)).toBe(false);
    expect(isUkBankHoliday(undefined)).toBe(false);
  });
});

// ─── isUkBankHoliday — Scotland ─────────────────────────────────────────────

describe('isUkBankHoliday — Scotland', () => {
  it('Test 4: St Andrew\'s Day 2026 (Nov 30) IS a bank holiday in Scotland', () => {
    expect(isUkBankHoliday('2026-11-30', 'scotland')).toBe(true);
  });

  it('Test 5: St Andrew\'s Day 2026 (Nov 30) is NOT a bank holiday in E&W', () => {
    expect(isUkBankHoliday('2026-11-30', 'england-and-wales')).toBe(false);
  });

  it('Scotland has 2 January as a bank holiday (2026-01-02)', () => {
    expect(isUkBankHoliday('2026-01-02', 'scotland')).toBe(true);
    expect(isUkBankHoliday('2026-01-02', 'england-and-wales')).toBe(false);
  });

  it('Easter Monday 2026 is NOT a standard Scotland bank holiday', () => {
    // Scotland does not observe Easter Monday as a bank holiday
    expect(isUkBankHoliday('2026-04-06', 'scotland')).toBe(false);
  });
});

// ─── isUkBankHoliday — Northern Ireland ─────────────────────────────────────

describe('isUkBankHoliday — Northern Ireland', () => {
  it('Test 6: St Patrick\'s Day 2026 (Mar 17) IS a bank holiday in Northern Ireland', () => {
    expect(isUkBankHoliday('2026-03-17', 'northern-ireland')).toBe(true);
  });

  it('Test 7: St Patrick\'s Day 2026 (Mar 17) is NOT a bank holiday in E&W', () => {
    expect(isUkBankHoliday('2026-03-17', 'england-and-wales')).toBe(false);
  });

  it('Battle of the Boyne 2026 (Jul 12) IS a bank holiday in NI', () => {
    expect(isUkBankHoliday('2026-07-12', 'northern-ireland')).toBe(true);
    expect(isUkBankHoliday('2026-07-12', 'england-and-wales')).toBe(false);
  });

  it('Easter Monday 2026 IS a bank holiday in Northern Ireland', () => {
    expect(isUkBankHoliday('2026-04-06', 'northern-ireland')).toBe(true);
  });
});

// ─── Edge cases ──────────────────────────────────────────────────────────────

describe('isUkBankHoliday — edge cases', () => {
  it('unknown region returns false (safe default)', () => {
    expect(isUkBankHoliday('2026-04-06', 'wales-only')).toBe(false);
  });

  it('handles ISO datetime string (slices to YYYY-MM-DD)', () => {
    expect(isUkBankHoliday('2026-04-06T10:00:00Z')).toBe(true);
    expect(isUkBankHoliday('2026-03-10T10:00:00Z')).toBe(false);
  });

  it('Boxing Day 2026 (Dec 28 — substitute for 26 Dec Sat) is a BH', () => {
    expect(isUkBankHoliday('2026-12-28')).toBe(true);
    // Dec 26 itself is NOT in the 2026 calendar (it's a Saturday)
    expect(isUkBankHoliday('2026-12-26')).toBe(false);
  });
});
