const { UK_REGIONS, haversineKm } = require('../ukRegions');

describe('UK_REGIONS', () => {
  test('contains exactly 12 NUTS-1 regions', () => {
    expect(UK_REGIONS).toHaveLength(12);
  });

  test('every region has id, label, lat, lng, radiusKm', () => {
    for (const r of UK_REGIONS) {
      expect(typeof r.id).toBe('string');
      expect(typeof r.label).toBe('string');
      expect(Number.isFinite(r.lat)).toBe(true);
      expect(Number.isFinite(r.lng)).toBe(true);
      expect(r.radiusKm).toBeGreaterThan(0);
    }
  });

  test('region ids are unique', () => {
    const ids = UK_REGIONS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('all centroids are inside a UK-shaped lat/lng box', () => {
    for (const r of UK_REGIONS) {
      expect(r.lat).toBeGreaterThanOrEqual(49);
      expect(r.lat).toBeLessThanOrEqual(61);
      expect(r.lng).toBeGreaterThanOrEqual(-9);
      expect(r.lng).toBeLessThanOrEqual(2);
    }
  });

  test('region structure snapshot', () => {
    expect(UK_REGIONS.map((r) => r.id)).toEqual([
      'NE', 'NW', 'YH', 'EM', 'WM', 'EE',
      'LDN', 'SE', 'SW', 'WLS', 'SCT', 'NI',
    ]);
  });
});

describe('haversineKm', () => {
  test('returns 0 for the same point', () => {
    expect(haversineKm(51.5, -0.1, 51.5, -0.1)).toBe(0);
  });

  test('London → Edinburgh is ~530km (within 30km tolerance)', () => {
    const d = haversineKm(51.5074, -0.1278, 55.9533, -3.1883);
    expect(d).toBeGreaterThan(500);
    expect(d).toBeLessThan(560);
  });

  test('returns Infinity for non-finite input', () => {
    expect(haversineKm(NaN, 0, 0, 0)).toBe(Infinity);
    expect(haversineKm(0, 0, 0, NaN)).toBe(Infinity);
  });
});
