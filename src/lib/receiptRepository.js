/**
 * receiptRepository.js — device-local receipt storage for Phase 2A Fuel Log.
 *
 * AsyncStorage key: `@fueluk/receipts_v1`
 * Capped at RECEIPT_MAX_ENTRIES (1000). FIFO eviction on overflow.
 *
 * Each receipt conforms to the shape defined in the Phase 2A architecture doc.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const RECEIPTS_KEY = '@fueluk/receipts_v1';
export const RECEIPT_MAX_ENTRIES = 1000;
export const IMAGE_EXPIRY_DAYS = 90;

/** Valid fuel types */
export const FUEL_TYPES = [
  'unleaded',
  'super_unleaded',
  'diesel',
  'premium_diesel',
];

/**
 * generateId() — simple UUID v4 using Math.random for JS-only compatibility.
 * Expo environment doesn't guarantee crypto.randomUUID without polyfill.
 */
export function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * createReceipt(fields) — builds a receipt object with defaults.
 * Caller must supply at minimum: fuelType, litres, pricePerLitre, totalPaid.
 */
export function createReceipt(fields = {}) {
  const now = new Date().toISOString();
  return {
    id: fields.id || generateId(),
    capturedAt: fields.capturedAt || now,
    receiptDate: fields.receiptDate || now,
    stationName: fields.stationName || '',
    stationBrand: fields.stationBrand || '',
    stationPostcode: fields.stationPostcode || null,
    fuelType: fields.fuelType || 'unleaded',
    litres: typeof fields.litres === 'number' ? fields.litres : 0,
    pricePerLitre: typeof fields.pricePerLitre === 'number' ? fields.pricePerLitre : 0,
    totalPaid: typeof fields.totalPaid === 'number' ? fields.totalPaid : 0,
    imageUri: fields.imageUri || null,
    ocrConfidence: typeof fields.ocrConfidence === 'number' ? fields.ocrConfidence : 0,
    manuallyEdited: fields.manuallyEdited === true,
    syncedAt: fields.syncedAt || null,
  };
}

/**
 * loadReceipts() — returns array of receipts from AsyncStorage.
 * Prunes expired images (>90 days) from imageUri fields.
 * Returns [] on error.
 */
export async function loadReceipts() {
  try {
    const raw = await AsyncStorage.getItem(RECEIPTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const receipts = Array.isArray(parsed) ? parsed : [];
    return pruneExpiredImages(receipts);
  } catch (_e) {
    return [];
  }
}

/**
 * saveReceipt(receipt) — appends a receipt.
 * Returns updated list. Enforces RECEIPT_MAX_ENTRIES cap (FIFO eviction).
 */
export async function saveReceipt(receipt) {
  const current = await loadReceipts();
  const updated = [...current, receipt];
  const capped =
    updated.length > RECEIPT_MAX_ENTRIES
      ? updated.slice(updated.length - RECEIPT_MAX_ENTRIES)
      : updated;
  await AsyncStorage.setItem(RECEIPTS_KEY, JSON.stringify(capped));
  return capped;
}

/**
 * updateReceipt(id, patches) — immutable update. Returns updated list.
 * Throws if id not found (caller should handle).
 */
export async function updateReceipt(id, patches) {
  const current = await loadReceipts();
  const idx = current.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error(`Receipt not found: ${id}`);
  const updated = [
    ...current.slice(0, idx),
    { ...current[idx], ...patches },
    ...current.slice(idx + 1),
  ];
  await AsyncStorage.setItem(RECEIPTS_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * deleteReceipt(id) — removes a receipt by id. Returns updated list.
 */
export async function deleteReceipt(id) {
  const current = await loadReceipts();
  const updated = current.filter((r) => r.id !== id);
  await AsyncStorage.setItem(RECEIPTS_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * pruneExpiredImages(receipts) — nullifies imageUri for receipts older than 90 days.
 * Modifies the field in-place on each receipt object (they're plain objects).
 */
export function pruneExpiredImages(receipts) {
  const cutoff = Date.now() - IMAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return receipts.map((r) => {
    if (!r.imageUri) return r;
    const capturedMs = r.capturedAt ? Date.parse(r.capturedAt) : 0;
    if (Number.isFinite(capturedMs) && capturedMs < cutoff) {
      return { ...r, imageUri: null };
    }
    return r;
  });
}

/**
 * extractOutcode(postcode) — returns the outcode portion of a UK postcode.
 * E.g. "B10 0HH" → "B10". Returns null for null/invalid input.
 */
export function extractOutcode(postcode) {
  if (!postcode || typeof postcode !== 'string') return null;
  const trimmed = postcode.trim().toUpperCase();
  // UK postcodes: outcode is everything before the final space
  const spaceIdx = trimmed.lastIndexOf(' ');
  if (spaceIdx > 0) return trimmed.slice(0, spaceIdx);
  // Compact postcode — outcode is all but last 3 chars (e.g. "B100HH" → "B10")
  if (trimmed.length > 3) return trimmed.slice(0, trimmed.length - 3);
  return null;
}

/**
 * groupReceiptsByMonth(receipts) — groups newest-first by "YYYY-MM" key.
 * Returns array of { monthKey: string, label: string, receipts: [] }
 */
export function groupReceiptsByMonth(receipts) {
  const groups = {};
  const sorted = [...receipts].sort(
    (a, b) => Date.parse(b.receiptDate || b.capturedAt) - Date.parse(a.receiptDate || a.capturedAt)
  );
  for (const r of sorted) {
    const d = new Date(r.receiptDate || r.capturedAt);
    if (isNaN(d)) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) {
      groups[key] = {
        monthKey: key,
        label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
        receipts: [],
      };
    }
    groups[key].receipts.push(r);
  }
  return Object.values(groups).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}
