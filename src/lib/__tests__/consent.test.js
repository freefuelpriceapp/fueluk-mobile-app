/**
 * consent.test.js — pure helpers around the consent record.
 */

const {
  CONSENT_KEY,
  CONSENT_TTL_MONTHS,
  computeExpiry,
  buildGrantRecord,
  buildDeclineRecord,
  resolveStatus,
  shouldInitTelemetry,
} = require('../consent');

describe('storage key + TTL', () => {
  test('key is namespaced and TTL is 12 months', () => {
    expect(CONSENT_KEY).toBe('@fueluk/consent_v1');
    expect(CONSENT_TTL_MONTHS).toBe(12);
  });
});

describe('computeExpiry', () => {
  test('returns ISO string 12 months after grant', () => {
    const granted = new Date('2026-05-07T12:00:00.000Z').toISOString();
    const expiry = computeExpiry(granted);
    const exp = new Date(expiry);
    expect(exp.getUTCFullYear()).toBe(2027);
    expect(exp.getUTCMonth()).toBe(4); // May
    expect(exp.getUTCDate()).toBe(7);
  });

  test('respects a custom ttlMonths', () => {
    const granted = new Date('2026-05-07T00:00:00.000Z').toISOString();
    const expiry = computeExpiry(granted, 1);
    expect(new Date(expiry).getUTCMonth()).toBe(5); // June
  });

  test('returns null for invalid input', () => {
    expect(computeExpiry('not-a-date')).toBeNull();
  });
});

describe('buildGrantRecord / buildDeclineRecord', () => {
  test('grant record has consent=granted and a future expiresAt', () => {
    const now = new Date('2026-05-07T12:00:00.000Z');
    const r = buildGrantRecord(now);
    expect(r.consent).toBe('granted');
    expect(r.grantedAt).toBe(now.toISOString());
    expect(new Date(r.expiresAt).getTime()).toBeGreaterThan(now.getTime());
  });

  test('decline record has consent=declined and an expiry', () => {
    const now = new Date('2026-05-07T12:00:00.000Z');
    const r = buildDeclineRecord(now);
    expect(r.consent).toBe('declined');
    expect(r.grantedAt).toBe(now.toISOString());
    expect(new Date(r.expiresAt).getTime()).toBeGreaterThan(now.getTime());
  });
});

describe('resolveStatus', () => {
  test('null / unrecognised → unset', () => {
    expect(resolveStatus(null)).toBe('unset');
    expect(resolveStatus(undefined)).toBe('unset');
    expect(resolveStatus({})).toBe('unset');
    expect(resolveStatus({ consent: 'maybe' })).toBe('unset');
  });

  test('granted record before expiry stays granted', () => {
    const now = new Date('2026-05-07T12:00:00.000Z');
    const r = buildGrantRecord(now);
    expect(resolveStatus(r, now.getTime() + 1000)).toBe('granted');
  });

  test('declined record before expiry stays declined', () => {
    const now = new Date('2026-05-07T12:00:00.000Z');
    const r = buildDeclineRecord(now);
    expect(resolveStatus(r, now.getTime() + 1000)).toBe('declined');
  });

  test('record past its expiry resolves to expired', () => {
    const granted = new Date('2026-05-07T12:00:00.000Z');
    const r = buildGrantRecord(granted);
    const future = new Date('2027-05-08T00:00:00.000Z').getTime();
    expect(resolveStatus(r, future)).toBe('expired');
  });

  test('record without expiresAt is treated as still active', () => {
    expect(
      resolveStatus({ consent: 'granted', grantedAt: '2026-01-01T00:00:00Z' })
    ).toBe('granted');
  });
});

describe('shouldInitTelemetry', () => {
  test('only granted + non-expired returns true', () => {
    const now = new Date('2026-05-07T12:00:00.000Z');
    expect(shouldInitTelemetry(buildGrantRecord(now))).toBe(true);
    expect(shouldInitTelemetry(buildDeclineRecord(now))).toBe(false);
    expect(shouldInitTelemetry(null)).toBe(false);
  });

  test('expired grant does NOT enable telemetry', () => {
    const granted = new Date('2024-05-07T12:00:00.000Z').toISOString();
    const r = {
      consent: 'granted',
      grantedAt: granted,
      expiresAt: new Date('2025-05-07T12:00:00.000Z').toISOString(),
    };
    expect(shouldInitTelemetry(r)).toBe(false);
  });
});
