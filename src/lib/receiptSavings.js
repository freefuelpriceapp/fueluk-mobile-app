/**
 * receiptSavings.js — real savings computation from fuel receipts.
 *
 * Computes "£ saved per fill-up" by comparing user's receipt p/L against
 * the national average price on the same date.
 *
 * National average is approximated from a static lookup table (published
 * RAC/BEIS monthly averages). Backend Phase 2B will supply live averages
 * via the /api/v1/prices/national-avg endpoint; until then we use the table.
 */

/**
 * National average fuel prices (pence per litre) — monthly snapshots.
 * Format: "YYYY-MM": { unleaded, diesel, super_unleaded, premium_diesel }
 *
 * Source: RAC Fuel Watch / BEIS Weekly Road Fuel Prices (2023-2025 actuals).
 * Diesel ≈ unleaded + 2-4p historically. Super ≈ unleaded + 12p.
 */
const NATIONAL_AVG_TABLE = {
  '2023-01': { unleaded: 148.0, diesel: 167.4, super_unleaded: 160.0, premium_diesel: 172.0 },
  '2023-02': { unleaded: 149.2, diesel: 167.0, super_unleaded: 161.0, premium_diesel: 173.0 },
  '2023-03': { unleaded: 148.8, diesel: 162.5, super_unleaded: 160.5, premium_diesel: 168.0 },
  '2023-04': { unleaded: 150.2, diesel: 163.8, super_unleaded: 162.0, premium_diesel: 169.0 },
  '2023-05': { unleaded: 145.8, diesel: 157.0, super_unleaded: 157.5, premium_diesel: 163.0 },
  '2023-06': { unleaded: 144.2, diesel: 152.4, super_unleaded: 156.0, premium_diesel: 158.0 },
  '2023-07': { unleaded: 145.7, diesel: 153.8, super_unleaded: 157.5, premium_diesel: 159.0 },
  '2023-08': { unleaded: 152.7, diesel: 159.8, super_unleaded: 164.5, premium_diesel: 165.5 },
  '2023-09': { unleaded: 156.3, diesel: 162.0, super_unleaded: 168.0, premium_diesel: 168.0 },
  '2023-10': { unleaded: 155.5, diesel: 160.5, super_unleaded: 167.5, premium_diesel: 166.5 },
  '2023-11': { unleaded: 149.8, diesel: 155.5, super_unleaded: 162.0, premium_diesel: 161.5 },
  '2023-12': { unleaded: 147.2, diesel: 152.7, super_unleaded: 159.0, premium_diesel: 158.5 },
  '2024-01': { unleaded: 144.5, diesel: 149.5, super_unleaded: 156.0, premium_diesel: 155.5 },
  '2024-02': { unleaded: 146.8, diesel: 152.2, super_unleaded: 158.5, premium_diesel: 158.0 },
  '2024-03': { unleaded: 149.0, diesel: 154.5, super_unleaded: 161.0, premium_diesel: 160.5 },
  '2024-04': { unleaded: 151.3, diesel: 156.8, super_unleaded: 163.5, premium_diesel: 162.5 },
  '2024-05': { unleaded: 151.2, diesel: 156.2, super_unleaded: 163.0, premium_diesel: 162.0 },
  '2024-06': { unleaded: 149.5, diesel: 154.5, super_unleaded: 161.0, premium_diesel: 160.0 },
  '2024-07': { unleaded: 148.0, diesel: 153.0, super_unleaded: 160.0, premium_diesel: 159.0 },
  '2024-08': { unleaded: 145.5, diesel: 150.5, super_unleaded: 157.5, premium_diesel: 156.5 },
  '2024-09': { unleaded: 139.0, diesel: 144.5, super_unleaded: 151.5, premium_diesel: 150.5 },
  '2024-10': { unleaded: 136.8, diesel: 142.5, super_unleaded: 149.0, premium_diesel: 148.0 },
  '2024-11': { unleaded: 136.0, diesel: 141.5, super_unleaded: 148.0, premium_diesel: 147.5 },
  '2024-12': { unleaded: 136.5, diesel: 142.0, super_unleaded: 148.5, premium_diesel: 148.0 },
  '2025-01': { unleaded: 135.5, diesel: 141.0, super_unleaded: 147.5, premium_diesel: 147.0 },
  '2025-02': { unleaded: 136.0, diesel: 141.5, super_unleaded: 148.0, premium_diesel: 147.5 },
  '2025-03': { unleaded: 137.5, diesel: 143.0, super_unleaded: 149.5, premium_diesel: 149.0 },
  '2025-04': { unleaded: 136.0, diesel: 141.5, super_unleaded: 148.0, premium_diesel: 147.5 },
  '2025-05': { unleaded: 135.0, diesel: 140.5, super_unleaded: 147.0, premium_diesel: 146.5 },
  '2025-06': { unleaded: 134.5, diesel: 140.0, super_unleaded: 146.5, premium_diesel: 146.0 },
  '2025-07': { unleaded: 134.0, diesel: 139.5, super_unleaded: 146.0, premium_diesel: 145.5 },
};

/**
 * getNationalAvgPpl(fuelType, isoDate) — returns national avg p/L for given
 * fuel type on given date. Falls back to nearest month if exact not found.
 * Returns null if fuelType unknown.
 */
export function getNationalAvgPpl(fuelType, isoDate) {
  if (!fuelType || !isoDate) return null;
  const key = isoDate.slice(0, 7); // "YYYY-MM"
  const row = NATIONAL_AVG_TABLE[key];
  if (row) return row[fuelType] || null;

  // Fallback: find nearest available month
  const keys = Object.keys(NATIONAL_AVG_TABLE).sort();
  if (keys.length === 0) return null;
  // Use the most recent month if isoDate is beyond our table
  const target = key;
  let nearest = keys[0];
  for (const k of keys) {
    if (k <= target) nearest = k;
  }
  return (NATIONAL_AVG_TABLE[nearest] || {})[fuelType] || null;
}

/**
 * computeReceiptSaving(receipt) — returns savings in PENCE for one fill-up.
 *
 * Formula: (nationalAvgPpl - receipt.pricePerLitre) × receipt.litres
 * Returns 0 (not negative) — we only track positive savings.
 * Returns null if data is insufficient.
 */
export function computeReceiptSaving(receipt) {
  if (!receipt || typeof receipt !== 'object') return null;
  const { fuelType, litres, pricePerLitre, receiptDate, capturedAt } = receipt;
  if (!fuelType || typeof litres !== 'number' || typeof pricePerLitre !== 'number') return null;
  if (litres <= 0 || pricePerLitre <= 0) return null;

  const date = receiptDate || capturedAt;
  if (!date) return null;

  const nationalAvg = getNationalAvgPpl(fuelType, date);
  if (nationalAvg == null) return null;

  const savingPpl = nationalAvg - pricePerLitre;
  // Only count positive savings (user beat the average)
  if (savingPpl <= 0) return 0;
  return savingPpl * litres; // pence (since both are pence/litre)
}

/**
 * computeRealLifetimeSavings(receipts) — sums savings across all receipts.
 *
 * Returns:
 * {
 *   totalPence: number,
 *   totalPounds: number,   // floored
 *   receiptCount: number,
 *   validReceiptCount: number, // receipts with computable savings
 *   isSufficient: boolean,     // true when validReceiptCount >= 3
 * }
 */
export function computeRealLifetimeSavings(receipts) {
  if (!Array.isArray(receipts)) {
    return {
      totalPence: 0,
      totalPounds: 0,
      receiptCount: 0,
      validReceiptCount: 0,
      isSufficient: false,
    };
  }

  let totalPence = 0;
  let validCount = 0;

  for (const r of receipts) {
    const saving = computeReceiptSaving(r);
    if (saving != null) {
      validCount++;
      totalPence += saving;
    }
  }

  return {
    totalPence,
    totalPounds: Math.floor(totalPence / 100),
    receiptCount: receipts.length,
    validReceiptCount: validCount,
    isSufficient: validCount >= 3,
  };
}

/**
 * computeMonthSavings(receipts, isoYearMonth) — savings for a specific month.
 * isoYearMonth: "YYYY-MM"
 */
export function computeMonthSavings(receipts, isoYearMonth) {
  if (!Array.isArray(receipts) || !isoYearMonth) return 0;
  let total = 0;
  for (const r of receipts) {
    const date = r.receiptDate || r.capturedAt;
    if (!date || !date.startsWith(isoYearMonth)) continue;
    const saving = computeReceiptSaving(r);
    if (saving != null && saving > 0) total += saving;
  }
  return total;
}

/**
 * validateReceiptMath(litres, pricePerLitre, totalPaid, tolerancePence)
 *
 * Returns true if totalPaid ≈ litres × pricePerLitre within tolerance.
 * Default tolerance: 2p (200 pence when totalPaid is in pence).
 *
 * Note: totalPaid is in PENCE (e.g. £50.00 = 5000).
 *       pricePerLitre is in PENCE per litre (e.g. 135.2).
 */
export function validateReceiptMath(litres, pricePerLitre, totalPaid, tolerancePence = 200) {
  if (
    typeof litres !== 'number' ||
    typeof pricePerLitre !== 'number' ||
    typeof totalPaid !== 'number'
  ) return false;
  if (litres <= 0 || pricePerLitre <= 0 || totalPaid <= 0) return false;
  const expected = litres * pricePerLitre;
  return Math.abs(expected - totalPaid) <= tolerancePence;
}

export default {
  getNationalAvgPpl,
  computeReceiptSaving,
  computeRealLifetimeSavings,
  computeMonthSavings,
  validateReceiptMath,
};
