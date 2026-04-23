const {
  canFlag,
  recordFlag,
  buildFlagPayload,
  fallbackUuid,
  FLAG_DEDUP_WINDOW_MS,
} = require('../flagPrice');

describe('canFlag', () => {
  test('empty / missing store → true', () => {
    expect(canFlag({}, 'S1', 'petrol')).toBe(true);
    expect(canFlag(null, 'S1', 'petrol')).toBe(true);
    expect(canFlag(undefined, 'S1', 'petrol')).toBe(true);
  });

  test('within window → false', () => {
    const now = 1_000_000;
    const store = { 'S1::petrol': now - 30 * 60 * 1000 }; // 30m ago
    expect(canFlag(store, 'S1', 'petrol', now)).toBe(false);
  });

  test('past window → true', () => {
    const now = 1_000_000;
    const store = { 'S1::petrol': now - (FLAG_DEDUP_WINDOW_MS + 1) };
    expect(canFlag(store, 'S1', 'petrol', now)).toBe(true);
  });

  test('fuel type scoped — different fuel still allowed', () => {
    const now = 1_000_000;
    const store = { 'S1::petrol': now - 60_000 };
    expect(canFlag(store, 'S1', 'diesel', now)).toBe(true);
    expect(canFlag(store, 'S1', 'petrol', now)).toBe(false);
  });

  test('non-numeric stored timestamp is treated as allowed', () => {
    const store = { 'S1::petrol': 'bogus' };
    expect(canFlag(store, 'S1', 'petrol')).toBe(true);
  });
});

describe('recordFlag', () => {
  test('adds timestamp', () => {
    const out = recordFlag({}, 'S1', 'petrol', 100);
    expect(out['S1::petrol']).toBe(100);
  });

  test('prunes entries older than 2x window', () => {
    const now = 10 * FLAG_DEDUP_WINDOW_MS;
    const store = {
      'old::petrol': now - 3 * FLAG_DEDUP_WINDOW_MS,
      'fresh::petrol': now - FLAG_DEDUP_WINDOW_MS / 2,
    };
    const out = recordFlag(store, 'S1', 'petrol', now);
    expect(out['old::petrol']).toBeUndefined();
    expect(out['fresh::petrol']).toBeDefined();
    expect(out['S1::petrol']).toBe(now);
  });

  test('does not mutate the input object', () => {
    const store = { 'S1::petrol': 500 };
    const frozen = Object.freeze(store);
    const out = recordFlag(frozen, 'S2', 'petrol', 999);
    expect(out).not.toBe(frozen);
    expect(out['S2::petrol']).toBe(999);
  });
});

describe('buildFlagPayload', () => {
  test('returns the backend-expected shape', () => {
    const p = buildFlagPayload({
      stationId: 'S1',
      fuelType: 'e10',
      deviceId: 'abc-123',
      reason: 'wrong_price',
    });
    expect(p).toEqual({
      fuel_type: 'e10',
      device_id: 'abc-123',
      reason: 'wrong_price',
    });
  });

  test('throws when missing required fields', () => {
    expect(() => buildFlagPayload({ fuelType: 'e10', deviceId: 'x', reason: 'r' })).toThrow(/stationId/);
    expect(() => buildFlagPayload({ stationId: 'S', deviceId: 'x', reason: 'r' })).toThrow(/fuelType/);
    expect(() => buildFlagPayload({ stationId: 'S', fuelType: 'e10', reason: 'r' })).toThrow(/deviceId/);
    expect(() => buildFlagPayload({ stationId: 'S', fuelType: 'e10', deviceId: 'x' })).toThrow(/reason/);
  });
});

describe('fallbackUuid', () => {
  test('matches v4 shape', () => {
    const u = fallbackUuid();
    expect(u).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  test('produces different ids on successive calls', () => {
    const a = fallbackUuid();
    const b = fallbackUuid();
    expect(a).not.toBe(b);
  });
});
