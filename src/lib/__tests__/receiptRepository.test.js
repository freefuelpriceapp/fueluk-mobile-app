/**
 * Tests for receiptRepository.js
 * Covers: createReceipt, generateId, extractOutcode, groupReceiptsByMonth,
 *         pruneExpiredImages, saveReceipt/loadReceipts (mocked AsyncStorage), FIFO cap
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createReceipt,
  generateId,
  extractOutcode,
  groupReceiptsByMonth,
  pruneExpiredImages,
  saveReceipt,
  loadReceipts,
  updateReceipt,
  deleteReceipt,
  RECEIPT_MAX_ENTRIES,
  RECEIPTS_KEY,
  IMAGE_EXPIRY_DAYS,
} from '../receiptRepository';

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── generateId ──────────────────────────────────────────────────────────────

describe('generateId', () => {
  it('returns a UUID-shaped string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('generates unique IDs each call', () => {
    const ids = new Set(Array.from({ length: 20 }, generateId));
    expect(ids.size).toBe(20);
  });
});

// ─── createReceipt ───────────────────────────────────────────────────────────

describe('createReceipt', () => {
  it('fills defaults for missing fields', () => {
    const r = createReceipt({});
    expect(r.id).toBeDefined();
    expect(r.fuelType).toBe('unleaded');
    expect(r.litres).toBe(0);
    expect(r.pricePerLitre).toBe(0);
    expect(r.totalPaid).toBe(0);
    expect(r.manuallyEdited).toBe(false);
    expect(r.syncedAt).toBeNull();
    expect(r.imageUri).toBeNull();
    expect(r.stationPostcode).toBeNull();
  });

  it('preserves provided fields', () => {
    const r = createReceipt({
      fuelType: 'diesel',
      litres: 40.0,
      pricePerLitre: 136.5,
      totalPaid: 5460,
      stationName: 'Asda',
      manuallyEdited: true,
    });
    expect(r.fuelType).toBe('diesel');
    expect(r.litres).toBe(40.0);
    expect(r.pricePerLitre).toBe(136.5);
    expect(r.totalPaid).toBe(5460);
    expect(r.stationName).toBe('Asda');
    expect(r.manuallyEdited).toBe(true);
  });

  it('accepts custom id', () => {
    const r = createReceipt({ id: 'my-id' });
    expect(r.id).toBe('my-id');
  });

  it('uses provided capturedAt', () => {
    const ts = '2024-06-01T10:00:00.000Z';
    const r = createReceipt({ capturedAt: ts });
    expect(r.capturedAt).toBe(ts);
  });
});

// ─── extractOutcode ───────────────────────────────────────────────────────────

describe('extractOutcode', () => {
  it('extracts outcode from full postcode', () => {
    expect(extractOutcode('B10 0HH')).toBe('B10');
    expect(extractOutcode('SW1A 1AA')).toBe('SW1A');
    expect(extractOutcode('EC1A 1BB')).toBe('EC1A');
    expect(extractOutcode('M1 1AE')).toBe('M1');
  });

  it('handles compact postcodes', () => {
    expect(extractOutcode('B100HH')).toBe('B10');
  });

  it('uppercases input', () => {
    expect(extractOutcode('b10 0hh')).toBe('B10');
  });

  it('returns null for null/undefined/empty', () => {
    expect(extractOutcode(null)).toBeNull();
    expect(extractOutcode(undefined)).toBeNull();
    expect(extractOutcode('')).toBeNull();
  });

  it('returns null for non-string', () => {
    expect(extractOutcode(12345)).toBeNull();
  });
});

// ─── pruneExpiredImages ────────────────────────────────────────────────────────

describe('pruneExpiredImages', () => {
  it('nullifies imageUri for receipts older than 90 days', () => {
    const old = createReceipt({
      capturedAt: new Date(Date.now() - (IMAGE_EXPIRY_DAYS + 1) * 86400000).toISOString(),
      imageUri: 'file://old.jpg',
    });
    const pruned = pruneExpiredImages([old]);
    expect(pruned[0].imageUri).toBeNull();
  });

  it('preserves imageUri for recent receipts', () => {
    const recent = createReceipt({
      capturedAt: new Date().toISOString(),
      imageUri: 'file://new.jpg',
    });
    const pruned = pruneExpiredImages([recent]);
    expect(pruned[0].imageUri).toBe('file://new.jpg');
  });

  it('ignores receipts with no imageUri', () => {
    const r = createReceipt({ capturedAt: new Date().toISOString(), imageUri: null });
    const pruned = pruneExpiredImages([r]);
    expect(pruned[0].imageUri).toBeNull();
  });

  it('handles empty array', () => {
    expect(pruneExpiredImages([])).toEqual([]);
  });
});

// ─── groupReceiptsByMonth ──────────────────────────────────────────────────────

describe('groupReceiptsByMonth', () => {
  it('groups receipts into months newest first', () => {
    const receipts = [
      createReceipt({ receiptDate: '2024-01-15T00:00:00.000Z', id: '1' }),
      createReceipt({ receiptDate: '2024-02-10T00:00:00.000Z', id: '2' }),
      createReceipt({ receiptDate: '2024-01-28T00:00:00.000Z', id: '3' }),
    ];
    const groups = groupReceiptsByMonth(receipts);
    expect(groups.length).toBe(2);
    expect(groups[0].monthKey).toBe('2024-02');
    expect(groups[1].monthKey).toBe('2024-01');
    expect(groups[1].receipts.length).toBe(2);
  });

  it('returns empty array for empty input', () => {
    expect(groupReceiptsByMonth([])).toEqual([]);
  });

  it('handles receipts with invalid dates gracefully', () => {
    const r = { id: 'x', receiptDate: 'not-a-date', capturedAt: 'not-a-date' };
    const groups = groupReceiptsByMonth([r]);
    expect(Array.isArray(groups)).toBe(true);
    expect(groups.length).toBe(0); // invalid date receipts are skipped
  });
});

// ─── loadReceipts ─────────────────────────────────────────────────────────────

describe('loadReceipts', () => {
  it('returns empty array when storage is empty', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    const result = await loadReceipts();
    expect(result).toEqual([]);
  });

  it('returns parsed receipts', async () => {
    const receipts = [createReceipt({ id: 'a' }), createReceipt({ id: 'b' })];
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(receipts));
    const result = await loadReceipts();
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('a');
  });

  it('returns empty array on AsyncStorage error', async () => {
    AsyncStorage.getItem.mockRejectedValueOnce(new Error('disk full'));
    const result = await loadReceipts();
    expect(result).toEqual([]);
  });

  it('returns empty array for non-array stored value', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({ not: 'array' }));
    const result = await loadReceipts();
    expect(result).toEqual([]);
  });
});

// ─── saveReceipt ─────────────────────────────────────────────────────────────

describe('saveReceipt', () => {
  it('appends receipt and calls setItem', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([]));
    AsyncStorage.setItem.mockResolvedValueOnce(undefined);
    const receipt = createReceipt({ id: 'new' });
    const result = await saveReceipt(receipt);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('new');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      RECEIPTS_KEY,
      expect.stringContaining('"id":"new"')
    );
  });

  it('enforces RECEIPT_MAX_ENTRIES FIFO cap', async () => {
    const full = Array.from({ length: RECEIPT_MAX_ENTRIES }, (_, i) =>
      createReceipt({ id: `old-${i}` })
    );
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(full));
    AsyncStorage.setItem.mockResolvedValueOnce(undefined);
    const newest = createReceipt({ id: 'newest' });
    const result = await saveReceipt(newest);
    expect(result.length).toBe(RECEIPT_MAX_ENTRIES);
    expect(result[result.length - 1].id).toBe('newest');
    // First (oldest) entry was evicted
    expect(result.find((r) => r.id === 'old-0')).toBeUndefined();
  });
});

// ─── updateReceipt ────────────────────────────────────────────────────────────

describe('updateReceipt', () => {
  it('applies patches to matching receipt', async () => {
    const receipts = [createReceipt({ id: 'r1', stationName: 'Old Name' })];
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(receipts));
    AsyncStorage.setItem.mockResolvedValueOnce(undefined);
    const result = await updateReceipt('r1', { stationName: 'New Name', manuallyEdited: true });
    expect(result[0].stationName).toBe('New Name');
    expect(result[0].manuallyEdited).toBe(true);
  });

  it('throws when id not found', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([]));
    await expect(updateReceipt('missing', {})).rejects.toThrow('Receipt not found');
  });
});

// ─── deleteReceipt ────────────────────────────────────────────────────────────

describe('deleteReceipt', () => {
  it('removes the receipt with given id', async () => {
    const receipts = [
      createReceipt({ id: 'keep' }),
      createReceipt({ id: 'delete-me' }),
    ];
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(receipts));
    AsyncStorage.setItem.mockResolvedValueOnce(undefined);
    const result = await deleteReceipt('delete-me');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('keep');
  });
});
