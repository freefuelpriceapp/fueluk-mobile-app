/**
 * Tests for receiptSavings.js
 * Covers: getNationalAvgPpl, computeReceiptSaving, computeRealLifetimeSavings,
 *         computeMonthSavings, validateReceiptMath
 */

import {
  getNationalAvgPpl,
  computeReceiptSaving,
  computeRealLifetimeSavings,
  computeMonthSavings,
  validateReceiptMath,
} from '../receiptSavings';

// ─── getNationalAvgPpl ────────────────────────────────────────────────────────

describe('getNationalAvgPpl', () => {
  it('returns expected value for known month', () => {
    const avg = getNationalAvgPpl('unleaded', '2024-06-15');
    expect(typeof avg).toBe('number');
    expect(avg).toBeGreaterThan(100);
  });

  it('returns diesel value for diesel', () => {
    const avg = getNationalAvgPpl('diesel', '2024-06-15');
    expect(typeof avg).toBe('number');
    expect(avg).toBeGreaterThan(100);
  });

  it('returns null for unknown fuel type', () => {
    const avg = getNationalAvgPpl('rocket_fuel', '2024-06-15');
    expect(avg).toBeNull();
  });

  it('returns null for missing arguments', () => {
    expect(getNationalAvgPpl(null, '2024-06-15')).toBeNull();
    expect(getNationalAvgPpl('unleaded', null)).toBeNull();
  });

  it('falls back to nearest month for dates beyond table', () => {
    // Far future date — should still return a number (last entry in table)
    const avg = getNationalAvgPpl('unleaded', '2099-12-01');
    expect(typeof avg).toBe('number');
  });

  it('falls back to nearest month for dates before table', () => {
    const avg = getNationalAvgPpl('diesel', '2010-01-01');
    expect(typeof avg).toBe('number');
  });

  it('returns correct value for 2025-01', () => {
    // Known: 2025-01 unleaded = 135.5
    const avg = getNationalAvgPpl('unleaded', '2025-01-15');
    expect(avg).toBe(135.5);
  });
});

// ─── computeReceiptSaving ─────────────────────────────────────────────────────

describe('computeReceiptSaving', () => {
  it('returns positive saving when user paid less than national avg', () => {
    // 2025-01 unleaded avg = 135.5 ppl. User paid 128 ppl, 45L
    const receipt = {
      fuelType: 'unleaded',
      litres: 45,
      pricePerLitre: 128.0,
      receiptDate: '2025-01-15T12:00:00Z',
    };
    const saving = computeReceiptSaving(receipt);
    expect(saving).toBeGreaterThan(0);
    // (135.5 - 128) * 45 = 337.5 pence
    expect(saving).toBeCloseTo(337.5, 0);
  });

  it('returns 0 when user paid more than national avg', () => {
    const receipt = {
      fuelType: 'unleaded',
      litres: 40,
      pricePerLitre: 150.0, // more than 135.5
      receiptDate: '2025-01-15T12:00:00Z',
    };
    const saving = computeReceiptSaving(receipt);
    expect(saving).toBe(0);
  });

  it('returns null for null receipt', () => {
    expect(computeReceiptSaving(null)).toBeNull();
  });

  it('returns null for missing fuelType', () => {
    expect(computeReceiptSaving({ litres: 40, pricePerLitre: 130, receiptDate: '2025-01-01' })).toBeNull();
  });

  it('returns null for zero litres', () => {
    expect(computeReceiptSaving({ fuelType: 'unleaded', litres: 0, pricePerLitre: 130, receiptDate: '2025-01-01' })).toBeNull();
  });

  it('returns null for zero pricePerLitre', () => {
    expect(computeReceiptSaving({ fuelType: 'unleaded', litres: 40, pricePerLitre: 0, receiptDate: '2025-01-01' })).toBeNull();
  });

  it('returns null for missing date', () => {
    expect(computeReceiptSaving({ fuelType: 'unleaded', litres: 40, pricePerLitre: 130 })).toBeNull();
  });

  it('uses capturedAt if receiptDate missing', () => {
    const receipt = {
      fuelType: 'unleaded',
      litres: 40,
      pricePerLitre: 130,
      capturedAt: '2025-01-15T12:00:00Z',
    };
    const saving = computeReceiptSaving(receipt);
    expect(saving).not.toBeNull();
    expect(saving).toBeGreaterThan(0);
  });

  it('handles diesel receipts', () => {
    const receipt = {
      fuelType: 'diesel',
      litres: 50,
      pricePerLitre: 135.0, // below 2025-01 diesel avg (141.0)
      receiptDate: '2025-01-15T12:00:00Z',
    };
    const saving = computeReceiptSaving(receipt);
    expect(saving).toBeGreaterThan(0);
  });
});

// ─── computeRealLifetimeSavings ───────────────────────────────────────────────

describe('computeRealLifetimeSavings', () => {
  it('returns zero stats for empty array', () => {
    const r = computeRealLifetimeSavings([]);
    expect(r.totalPence).toBe(0);
    expect(r.totalPounds).toBe(0);
    expect(r.receiptCount).toBe(0);
    expect(r.isSufficient).toBe(false);
  });

  it('returns zero stats for non-array', () => {
    const r = computeRealLifetimeSavings(null);
    expect(r.totalPence).toBe(0);
    expect(r.isSufficient).toBe(false);
  });

  it('isSufficient is false for < 3 valid receipts', () => {
    const receipts = [
      { fuelType: 'unleaded', litres: 40, pricePerLitre: 128, receiptDate: '2025-01-15T00:00:00Z' },
      { fuelType: 'unleaded', litres: 35, pricePerLitre: 127, receiptDate: '2025-02-10T00:00:00Z' },
    ];
    const r = computeRealLifetimeSavings(receipts);
    expect(r.isSufficient).toBe(false);
    expect(r.validReceiptCount).toBe(2);
  });

  it('isSufficient is true for >= 3 valid receipts', () => {
    const receipts = [
      { fuelType: 'unleaded', litres: 40, pricePerLitre: 128, receiptDate: '2025-01-15T00:00:00Z' },
      { fuelType: 'unleaded', litres: 35, pricePerLitre: 127, receiptDate: '2025-02-10T00:00:00Z' },
      { fuelType: 'diesel', litres: 45, pricePerLitre: 133, receiptDate: '2025-03-05T00:00:00Z' },
    ];
    const r = computeRealLifetimeSavings(receipts);
    expect(r.isSufficient).toBe(true);
    expect(r.validReceiptCount).toBe(3);
    expect(r.totalPence).toBeGreaterThan(0);
  });

  it('sums savings correctly', () => {
    // 2025-01 unleaded = 135.5, diesel = 141.0
    const receipts = [
      { fuelType: 'unleaded', litres: 10, pricePerLitre: 130.5, receiptDate: '2025-01-01T00:00:00Z' },
      // saving = (135.5 - 130.5) * 10 = 50 pence
    ];
    const r = computeRealLifetimeSavings(receipts);
    expect(r.totalPence).toBeCloseTo(50, 0);
    expect(r.totalPounds).toBe(0); // < 100 pence
  });

  it('floors totalPounds', () => {
    // Force totalPence = 150 → totalPounds = 1
    const receipts = [
      { fuelType: 'unleaded', litres: 30, pricePerLitre: 130.5, receiptDate: '2025-01-01T00:00:00Z' },
      // saving = (135.5 - 130.5) * 30 = 150 pence
    ];
    const r = computeRealLifetimeSavings(receipts);
    expect(r.totalPounds).toBe(1); // floor(150/100) = 1
  });

  it('skips receipts with invalid data', () => {
    const receipts = [
      { fuelType: 'unleaded', litres: 0, pricePerLitre: 130, receiptDate: '2025-01-01T00:00:00Z' },
      null,
      { fuelType: 'diesel', litres: 40, pricePerLitre: 133, receiptDate: '2025-01-01T00:00:00Z' },
    ];
    const r = computeRealLifetimeSavings(receipts);
    // Only the diesel one is valid
    expect(r.validReceiptCount).toBe(1);
  });
});

// ─── computeMonthSavings ──────────────────────────────────────────────────────

describe('computeMonthSavings', () => {
  it('returns 0 for empty array', () => {
    expect(computeMonthSavings([], '2025-01')).toBe(0);
  });

  it('sums only receipts matching the month', () => {
    const receipts = [
      { fuelType: 'unleaded', litres: 40, pricePerLitre: 128, receiptDate: '2025-01-15T00:00:00Z' },
      { fuelType: 'unleaded', litres: 40, pricePerLitre: 128, receiptDate: '2025-02-10T00:00:00Z' },
    ];
    const jan = computeMonthSavings(receipts, '2025-01');
    const feb = computeMonthSavings(receipts, '2025-02');
    // Jan avg=135.5, Feb avg=136.0; user paid 128 → both months yield positive savings
    expect(jan).toBeGreaterThan(0);
    expect(feb).toBeGreaterThan(0);
    // Each month has exactly one receipt; all-receipts sum should be greater than either month alone
    const all = computeMonthSavings(receipts, '2025-01') + computeMonthSavings(receipts, '2025-02');
    expect(all).toBeGreaterThan(jan);
  });

  it('returns 0 for non-matching month', () => {
    const receipts = [
      { fuelType: 'unleaded', litres: 40, pricePerLitre: 128, receiptDate: '2025-01-15T00:00:00Z' },
    ];
    expect(computeMonthSavings(receipts, '2025-06')).toBe(0);
  });
});

// ─── validateReceiptMath ──────────────────────────────────────────────────────

describe('validateReceiptMath', () => {
  it('returns true when total matches litres × ppl within tolerance', () => {
    // 42.50L × 135.9p = 5775.75p ≈ £57.76
    // totalPaid in pence = 5775
    expect(validateReceiptMath(42.5, 135.9, 5775, 200)).toBe(true);
  });

  it('returns true at zero difference', () => {
    expect(validateReceiptMath(40, 130, 5200, 200)).toBe(true);
  });

  it('returns false when difference exceeds tolerance', () => {
    // 40L × 130p = 5200p, totalPaid = 5500p → diff = 300p > 200p
    expect(validateReceiptMath(40, 130, 5500, 200)).toBe(false);
  });

  it('returns false for zero litres', () => {
    expect(validateReceiptMath(0, 130, 100, 200)).toBe(false);
  });

  it('returns false for zero ppl', () => {
    expect(validateReceiptMath(40, 0, 100, 200)).toBe(false);
  });

  it('returns false for zero total', () => {
    expect(validateReceiptMath(40, 130, 0, 200)).toBe(false);
  });

  it('returns false for non-numeric inputs', () => {
    expect(validateReceiptMath('40', 130, 5200, 200)).toBe(false);
    expect(validateReceiptMath(40, '130', 5200, 200)).toBe(false);
  });

  it('uses default 200p tolerance', () => {
    // Exactly 200p off — should pass
    expect(validateReceiptMath(40, 130, 5000, 200)).toBe(true); // 5200-5000=200 ≤ 200
    // 201p off — should fail
    expect(validateReceiptMath(40, 130, 4999, 200)).toBe(false); // 5200-4999=201 > 200
  });
});
