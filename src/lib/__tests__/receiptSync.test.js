/**
 * Tests for receiptSync.js
 * Covers: buildGroundTruthTuple, getSyncConsent, setSyncConsent, syncReceiptAnonymously
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { apiBaseUrl: 'https://test.example.com' } },
}));

// Mock global fetch
global.fetch = jest.fn();

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildGroundTruthTuple,
  getSyncConsent,
  setSyncConsent,
  syncReceiptAnonymously,
  SYNC_CONSENT_KEY,
} from '../receiptSync';

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── buildGroundTruthTuple ────────────────────────────────────────────────────

describe('buildGroundTruthTuple', () => {
  it('builds tuple from full receipt', () => {
    const receipt = {
      stationBrand: 'Asda',
      stationPostcode: 'B10 0HH',
      pricePerLitre: 132.9,
      fuelType: 'unleaded',
      receiptDate: '2025-01-15T12:00:00Z',
    };
    const tuple = buildGroundTruthTuple(receipt);
    expect(tuple).not.toBeNull();
    expect(tuple.brand).toBe('Asda');
    expect(tuple.postcode_outcode).toBe('B10');  // outcode only
    expect(tuple.p_per_l).toBe(132.9);
    expect(tuple.fuel_type).toBe('unleaded');
    expect(tuple.receipt_date).toBe('2025-01-15'); // date only
  });

  it('strips full postcode to outcode', () => {
    const receipt = {
      stationBrand: 'BP',
      stationPostcode: 'SW1A 1AA',
      pricePerLitre: 140.0,
      fuelType: 'diesel',
      receiptDate: '2025-02-01T00:00:00Z',
    };
    const tuple = buildGroundTruthTuple(receipt);
    expect(tuple.postcode_outcode).toBe('SW1A');
  });

  it('handles null postcode', () => {
    const receipt = {
      stationBrand: 'Shell',
      stationPostcode: null,
      pricePerLitre: 135.0,
      fuelType: 'unleaded',
      receiptDate: '2025-01-10T00:00:00Z',
    };
    const tuple = buildGroundTruthTuple(receipt);
    expect(tuple).not.toBeNull();
    expect(tuple.postcode_outcode).toBeNull();
  });

  it('returns null for null receipt', () => {
    expect(buildGroundTruthTuple(null)).toBeNull();
  });

  it('returns null for missing fuelType', () => {
    expect(buildGroundTruthTuple({ stationBrand: 'BP', pricePerLitre: 135, receiptDate: '2025-01-01' })).toBeNull();
  });

  it('returns null for zero pricePerLitre', () => {
    expect(buildGroundTruthTuple({ fuelType: 'unleaded', pricePerLitre: 0, receiptDate: '2025-01-01' })).toBeNull();
  });

  it('returns null for missing receiptDate', () => {
    expect(buildGroundTruthTuple({ fuelType: 'unleaded', pricePerLitre: 135 })).toBeNull();
  });

  it('does NOT include station name, image, or device ID', () => {
    const receipt = {
      stationName: 'Asda Express Birmingham',
      stationBrand: 'Asda',
      stationPostcode: 'B10 0HH',
      pricePerLitre: 130.0,
      fuelType: 'unleaded',
      receiptDate: '2025-01-15T00:00:00Z',
      imageUri: 'file://receipt.jpg',
      id: 'device-uuid',
    };
    const tuple = buildGroundTruthTuple(receipt);
    expect(tuple).not.toHaveProperty('stationName');
    expect(tuple).not.toHaveProperty('imageUri');
    expect(tuple).not.toHaveProperty('id');
    expect(tuple).not.toHaveProperty('totalPaid');
    expect(tuple).not.toHaveProperty('litres');
  });
});

// ─── getSyncConsent / setSyncConsent ──────────────────────────────────────────

describe('getSyncConsent', () => {
  it('returns false when not set', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    expect(await getSyncConsent()).toBe(false);
  });

  it('returns false when set to "false"', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('false');
    expect(await getSyncConsent()).toBe(false);
  });

  it('returns true when set to "true"', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('true');
    expect(await getSyncConsent()).toBe(true);
  });

  it('returns false on AsyncStorage error', async () => {
    AsyncStorage.getItem.mockRejectedValueOnce(new Error('io error'));
    expect(await getSyncConsent()).toBe(false);
  });
});

describe('setSyncConsent', () => {
  it('writes "true" string for true value', async () => {
    AsyncStorage.setItem.mockResolvedValueOnce(undefined);
    await setSyncConsent(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(SYNC_CONSENT_KEY, 'true');
  });

  it('writes "false" string for false value', async () => {
    AsyncStorage.setItem.mockResolvedValueOnce(undefined);
    await setSyncConsent(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(SYNC_CONSENT_KEY, 'false');
  });

  it('handles AsyncStorage error silently', async () => {
    AsyncStorage.setItem.mockRejectedValueOnce(new Error('disk full'));
    await expect(setSyncConsent(true)).resolves.toBeUndefined();
  });
});

// ─── syncReceiptAnonymously ───────────────────────────────────────────────────

describe('syncReceiptAnonymously', () => {
  const validReceipt = {
    stationBrand: 'BP',
    stationPostcode: 'M1 1AE',
    pricePerLitre: 133.0,
    fuelType: 'unleaded',
    receiptDate: '2025-01-10T00:00:00Z',
  };

  it('skips when consent is false', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('false');
    const result = await syncReceiptAnonymously(validReceipt);
    expect(result.skipped).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('posts to /api/v1/receipts/groundtruth when consent true and returns ok', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('true');
    fetch.mockResolvedValueOnce({ status: 204, ok: true });
    const result = await syncReceiptAnonymously(validReceipt);
    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      'https://test.example.com/api/v1/receipts/groundtruth',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('returns ok: false on 5xx without crashing', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('true');
    fetch.mockResolvedValueOnce({ status: 500, ok: false });
    const result = await syncReceiptAnonymously(validReceipt);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('500');
  });

  it('returns ok: false on network error without crashing', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('true');
    fetch.mockRejectedValueOnce(new Error('network timeout'));
    const result = await syncReceiptAnonymously(validReceipt);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('network timeout');
  });

  it('skips for receipt with insufficient data', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('true');
    const result = await syncReceiptAnonymously({ fuelType: null });
    expect(result.skipped).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
});
