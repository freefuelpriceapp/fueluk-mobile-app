const {
  computeRegionAverages,
  selectViewportTier,
  selectAutoFocusCluster,
  computeBloomRings,
  intensityRankFor,
} = require('../heatmap');

const mkStation = (lat, lng, price, extras = {}) => ({
  id: extras.id || `${lat}-${lng}`,
  lat,
  lon: lng,
  prices: { petrol: price },
  ...extras,
});

describe('computeRegionAverages', () => {
  test('groups stations into the right region by centroid distance', () => {
    const stations = [
      mkStation(51.51, -0.13, 140, { id: 'l1' }), // London
      mkStation(51.52, -0.10, 142, { id: 'l2' }),
      mkStation(53.80, -2.70, 150, { id: 'nw1' }), // North West
    ];
    const out = computeRegionAverages(stations, 'petrol', { lowDataThreshold: 1 });
    const lon = out.find((r) => r.id === 'region:LDN');
    const nw = out.find((r) => r.id === 'region:NW');
    expect(lon.count).toBe(2);
    expect(lon.avgPrice).toBe(141);
    expect(nw.count).toBe(1);
  });

  test('regions with no stations are dropped entirely', () => {
    const stations = [mkStation(51.51, -0.13, 140)];
    const out = computeRegionAverages(stations, 'petrol', { lowDataThreshold: 1 });
    const ids = out.map((r) => r.id);
    expect(ids).toContain('region:LDN');
    expect(ids).not.toContain('region:NE');
    expect(ids).not.toContain('region:SCT');
  });

  test('lowData flag set when station count below threshold', () => {
    const stations = [mkStation(51.51, -0.13, 140)];
    const out = computeRegionAverages(stations, 'petrol', { lowDataThreshold: 5 });
    const lon = out.find((r) => r.id === 'region:LDN');
    expect(lon.lowData).toBe(true);
  });

  test('lowData false once threshold met', () => {
    const stations = Array.from({ length: 6 }, (_, i) =>
      mkStation(51.51 + i * 0.001, -0.13, 140 + i, { id: `s${i}` })
    );
    const out = computeRegionAverages(stations, 'petrol', { lowDataThreshold: 5 });
    const lon = out.find((r) => r.id === 'region:LDN');
    expect(lon.lowData).toBe(false);
    expect(lon.count).toBe(6);
  });

  test('drops region when no station has the requested fuel type', () => {
    const stations = [
      { id: 'a', lat: 51.51, lon: -0.13, prices: { diesel: 145 } },
    ];
    const out = computeRegionAverages(stations, 'petrol');
    expect(out.find((r) => r.id === 'region:LDN')).toBeUndefined();
  });

  test('returns [] for empty / null input', () => {
    expect(computeRegionAverages([], 'petrol')).toEqual([]);
    expect(computeRegionAverages(null, 'petrol')).toEqual([]);
  });

  test('clusters carry tier marker "region"', () => {
    const stations = [mkStation(51.51, -0.13, 140)];
    const out = computeRegionAverages(stations, 'petrol', { lowDataThreshold: 1 });
    expect(out[0].tier).toBe('region');
  });

  test('cluster carries cheapest member station', () => {
    const stations = [
      mkStation(51.50, -0.12, 145, { id: 'a' }),
      mkStation(51.52, -0.10, 138, { id: 'b' }),
      mkStation(51.49, -0.15, 140, { id: 'c' }),
    ];
    const out = computeRegionAverages(stations, 'petrol', { lowDataThreshold: 1 });
    const lon = out.find((r) => r.id === 'region:LDN');
    expect(lon.cheapest.id).toBe('b');
  });

  test('skips stations with bad coordinates', () => {
    const stations = [
      mkStation(51.51, -0.13, 140, { id: 'a' }),
      { id: 'b', lat: NaN, lon: -0.10, prices: { petrol: 142 } },
    ];
    const out = computeRegionAverages(stations, 'petrol', { lowDataThreshold: 1 });
    const lon = out.find((r) => r.id === 'region:LDN');
    expect(lon.count).toBe(1);
  });

  test('a Birmingham station goes to West Midlands not London', () => {
    const stations = [mkStation(52.48, -1.90, 140, { id: 'b1' })];
    const out = computeRegionAverages(stations, 'petrol', { lowDataThreshold: 1 });
    const ids = out.map((r) => r.id);
    expect(ids).toContain('region:WM');
  });
});

describe('selectViewportTier', () => {
  test('span > 300km → tier A (country)', () => {
    expect(selectViewportTier(500)).toBe('A');
    expect(selectViewportTier(301)).toBe('A');
  });

  test('span 50–300km → tier B (regional)', () => {
    expect(selectViewportTier(150)).toBe('B');
    expect(selectViewportTier(50)).toBe('B');
    expect(selectViewportTier(300)).toBe('B');
  });

  test('span < 50km → tier C (local)', () => {
    expect(selectViewportTier(30)).toBe('C');
    expect(selectViewportTier(5)).toBe('C');
  });

  test('non-finite span defaults to A', () => {
    expect(selectViewportTier(NaN)).toBe('A');
    expect(selectViewportTier(undefined)).toBe('A');
  });

  test('zero or negative span defaults to A', () => {
    expect(selectViewportTier(0)).toBe('A');
    expect(selectViewportTier(-10)).toBe('A');
  });

  test('exact tier boundaries', () => {
    expect(selectViewportTier(300.0001)).toBe('A');
    expect(selectViewportTier(49.99)).toBe('C');
  });
});

describe('selectAutoFocusCluster', () => {
  const C = (id, lat, lon, price, count = 10) => ({
    id, lat, lon, avgPrice: price, count,
  });

  test('picks absolute cheapest when no user location', () => {
    const clusters = [
      C('a', 51.5, -0.1, 145),
      C('b', 53.5, -2.3, 138),
      C('c', 52.5, -1.8, 142),
    ];
    expect(selectAutoFocusCluster(clusters, null).id).toBe('b');
  });

  test('excludes clusters below station-count threshold', () => {
    const clusters = [
      C('a', 51.5, -0.1, 130, 2),  // very cheap but only 2 stations
      C('b', 53.5, -2.3, 138, 10),
    ];
    expect(selectAutoFocusCluster(clusters, null).id).toBe('b');
  });

  test('respects custom minStations option', () => {
    const clusters = [
      C('a', 51.5, -0.1, 130, 3),
      C('b', 53.5, -2.3, 138, 10),
    ];
    expect(selectAutoFocusCluster(clusters, null, { minStations: 3 }).id).toBe('a');
  });

  test('proximity weighting picks nearer when prices similar', () => {
    const clusters = [
      C('far', 57.0, -4.2, 138, 10),    // Scotland
      C('near', 52.5, -1.8, 138.2, 10), // West Midlands
    ];
    const userLoc = { lat: 52.4, lng: -1.9 }; // Birmingham
    expect(selectAutoFocusCluster(clusters, userLoc).id).toBe('near');
  });

  test('proximity does NOT pick a worse-priced cluster when gap is large', () => {
    const clusters = [
      C('far_cheap', 57.0, -4.2, 130, 10),
      C('near_pricey', 52.5, -1.8, 150, 10),
    ];
    const userLoc = { lat: 52.4, lng: -1.9 };
    // 70% weight on price means ~20p cheaper wins despite distance.
    expect(selectAutoFocusCluster(clusters, userLoc).id).toBe('far_cheap');
  });

  test('returns null for empty / null input', () => {
    expect(selectAutoFocusCluster([], null)).toBeNull();
    expect(selectAutoFocusCluster(null, null)).toBeNull();
  });

  test('returns null when nothing meets station threshold', () => {
    const clusters = [C('a', 51.5, -0.1, 130, 1)];
    expect(selectAutoFocusCluster(clusters, null)).toBeNull();
  });

  test('handles user location with lon vs lng key', () => {
    const clusters = [
      C('far', 57.0, -4.2, 138, 10),
      C('near', 52.5, -1.8, 138.2, 10),
    ];
    expect(
      selectAutoFocusCluster(clusters, { lat: 52.4, lon: -1.9 }).id
    ).toBe('near');
  });
});

describe('computeBloomRings', () => {
  const cluster = { lat: 51.5, lon: -0.1, count: 10 };

  test('returns 4 concentric rings outer→inner', () => {
    const rings = computeBloomRings(cluster, 2);
    expect(rings).toHaveLength(4);
    for (let i = 1; i < rings.length; i += 1) {
      expect(rings[i].radius).toBeLessThan(rings[i - 1].radius);
      expect(rings[i].opacity).toBeGreaterThan(rings[i - 1].opacity);
    }
  });

  test('cheap rank (0) blooms larger and brighter than expensive rank (4)', () => {
    const cheap = computeBloomRings(cluster, 0);
    const pricey = computeBloomRings(cluster, 4);
    expect(cheap[0].radius).toBeGreaterThan(pricey[0].radius);
    expect(cheap[3].opacity).toBeGreaterThan(pricey[3].opacity);
  });

  test('uses radiusKm when present (region tier)', () => {
    const region = { lat: 51.5, lon: -0.1, count: 10, radiusKm: 30 };
    const rings = computeBloomRings(region, 2);
    expect(rings[0].radius).toBeGreaterThan(20000); // ~30km × 1.0 × 1.0
  });

  test('returns [] for invalid cluster', () => {
    expect(computeBloomRings(null, 2)).toEqual([]);
    expect(computeBloomRings({ lat: NaN, lon: 0, count: 1 }, 2)).toEqual([]);
  });

  test('clamps out-of-range intensity rank', () => {
    const tooLow = computeBloomRings(cluster, -3);
    const tooHigh = computeBloomRings(cluster, 99);
    const cheap = computeBloomRings(cluster, 0);
    const pricey = computeBloomRings(cluster, 4);
    expect(tooLow[0].radius).toBe(cheap[0].radius);
    expect(tooHigh[0].radius).toBe(pricey[0].radius);
  });

  test('opacity values stay within [0, 1]', () => {
    for (const rank of [0, 1, 2, 3, 4]) {
      const rings = computeBloomRings(cluster, rank);
      for (const r of rings) {
        expect(r.opacity).toBeGreaterThanOrEqual(0);
        expect(r.opacity).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('intensityRankFor', () => {
  const clusters = [
    { avgPrice: 130 }, { avgPrice: 135 }, { avgPrice: 140 },
    { avgPrice: 145 }, { avgPrice: 150 },
  ];

  test('cheapest price → rank 0', () => {
    expect(intensityRankFor(130, clusters)).toBe(0);
  });

  test('priciest price → rank 4', () => {
    expect(intensityRankFor(150, clusters)).toBe(4);
  });

  test('mid price → rank 2', () => {
    expect(intensityRankFor(140, clusters)).toBe(2);
  });

  test('flat cohort → mid rank', () => {
    expect(intensityRankFor(140, [{ avgPrice: 140 }])).toBe(2);
  });
});
