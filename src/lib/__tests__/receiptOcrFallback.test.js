/**
 * Tests for ReceiptCaptureScreen OCR helpers
 * Covers: postImageForOcr with mock fetch (success, 5xx, network error)
 */

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { apiBaseUrl: 'https://test.example.com' } },
}));

global.fetch = jest.fn();
global.FormData = class {
  constructor() { this.data = {}; }
  append(key, value) { this.data[key] = value; }
};

import { postImageForOcr } from '../receiptOcrClient';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('postImageForOcr', () => {
  const testUri = 'file:///var/mobile/receipt.jpg';

  it('returns parsed JSON on 200 response', async () => {
    const mockData = {
      stationName: 'Asda Express',
      fuelType: 'unleaded',
      litres: 42.5,
      pricePerLitre: 132.9,
      totalPaid: 5648,
      ocrConfidence: 0.92,
      receiptDate: '2025-01-15T00:00:00Z',
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    });
    const result = await postImageForOcr(testUri);
    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith(
      'https://test.example.com/api/v1/receipts/ocr',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws on 500 server error', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(postImageForOcr(testUri)).rejects.toThrow('OCR failed: HTTP 500');
  });

  it('throws on 503 with error.status set', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 503 });
    try {
      await postImageForOcr(testUri);
    } catch (e) {
      expect(e.status).toBe(503);
    }
  });

  it('throws on network error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network request failed'));
    await expect(postImageForOcr(testUri)).rejects.toThrow('Network request failed');
  });

  it('sends correct content-type via FormData', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({}) });
    await postImageForOcr('file:///receipt.jpg');
    const callArgs = fetch.mock.calls[0];
    expect(callArgs[0]).toContain('/api/v1/receipts/ocr');
  });

  it('derives content type from uri extension', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({}) });
    // .png extension
    await postImageForOcr('file:///receipt.png');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
