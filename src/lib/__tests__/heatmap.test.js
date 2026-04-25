const {
  extractPostcodeDistrict,
  clusterStationsByPostcode,
  clusterStationsByGrid,
  clusterStations,
  computePriceColourScale,
  formatLegendRange,
  clusterRadiusMetres,
  HEATMAP_COLOURS,
} = require('../heatmap');

const mk = (overrides = {}) => ({
  id: overrides.id || 'a',
  lat: 52.0,
  lon: -1.5,
  prices: { petrol: 140 },
  ...overrides,
});

describe('extractPostcodeDistrict', () => {
  test('pulls B12 from a full postcode field', () => {
    expect(extractPostcodeDistrict({ postcode: 'B12 8AB' })).toBe('B12');
  });
  test('pulls SW1A from address text', () => {
    expect(extractPostcodeDistrict({ address: '10 Downing St, London SW1A 2AA' })).toBe('SW1A');
  });
  test('handles bare outward code (no inward part)', () => {
    expect(extractPostcodeDistrict({ postcode: 'M1' })).toBe('M1');
  });
  test('returns null for missing postcode', () => {
    expect(extractPostcodeDistrict({ name: 'Shell' })).toBeNull();
  });
  test('returns null for non-UK string with no postcode pattern', () => {
    expect(extractPostcodeDistrict({ address: '123 Main Street, Anytown' })).toBeNull();
  });
  test('handles lowercase postcode', () => {
    expect(extractPostcodeDistrict({ postcode: 'b12 8ab' })).toBe('B12');
  });
});

describe('clusterStationsByPostcode', () => {
  test('groups stations sharing a district', () => {
    const stations = [
      mk({ id: '1', postcode: 'B12 8AB', prices: { petrol: 140 } }),
      mk({ id: '2', postcode: 'B12 9CD', prices: { petrol: 142 } }),
      mk({ id: '3', postcode: 'M1 1AA', prices: { petrol: 145 } }),
    ];
    const clusters = clusterStationsByPostcode(stations, 'petrol');
    expect(clusters).toHaveLength(2);
    const b12 = clusters.find((c) => c.label === 'B12');
    expect(b12.count).toBe(2);
    expect(b12.avgPrice).toBe(141);
  });

  test('drops stations with no postcode', () => {
    const stations = [
      mk({ id: '1', postcode: 'B12 8AB' }),
      mk({ id: '2', name: 'no postcode here' }),
    ];
    const clusters = clusterStationsByPostcode(stations, 'petrol');
    expect(clusters).toHaveLength(1);
    expect(clusters[0].count).toBe(1);
  });

  test('returns [] for empty input', () => {
    expect(clusterStationsByPostcode([], 'petrol')).toEqual([]);
    expect(clusterStationsByPostcode(null, 'petrol')).toEqual([]);
  });

  test('cluster carries the cheapest member', () => {
    const cheap = mk({ id: 'c', postcode: 'B12 8AB', prices: { petrol: 138 } });
    const dear = mk({ id: 'd', postcode: 'B12 9CD', prices: { petrol: 145 } });
    const [cluster] = clusterStationsByPostcode([cheap, dear], 'petrol');
    expect(cluster.cheapest.id).toBe('c');
  });
});

describe('clusterStationsByGrid', () => {
  test('groups two near-coincident stations into one bucket', () => {
    const stations = [
      mk({ id: '1', lat: 52.0, lon: -1.5, prices: { petrol: 140 } }),
      mk({ id: '2', lat: 52.001, lon: -1.501, prices: { petrol: 142 } }),
    ];
    const clusters = clusterStationsByGrid(stations, 'petrol', 1.5);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].count).toBe(2);
    expect(clusters[0].avgPrice).toBe(141);
  });

  test('separates distant stations', () => {
    const stations = [
      mk({ id: '1', lat: 52.0, lon: -1.5 }),
      mk({ id: '2', lat: 53.5, lon: -2.3 }),
    ];
    expect(clusterStationsByGrid(stations, 'petrol', 1.5)).toHaveLength(2);
  });

  test('skips stations with bad coordinates', () => {
    const stations = [
      mk({ id: '1', lat: 52.0, lon: -1.5 }),
      mk({ id: '2', lat: NaN, lon: -1.5 }),
    ];
    expect(clusterStationsByGrid(stations, 'petrol', 1.5)).toHaveLength(1);
  });

  test('returns [] for empty input', () => {
    expect(clusterStationsByGrid([], 'petrol')).toEqual([]);
  });

  test('handles non-finite gridKm by defaulting', () => {
    const stations = [mk({ id: '1' })];
    const clusters = clusterStationsByGrid(stations, 'petrol', 'bad');
    expect(clusters).toHaveLength(1);
  });
});

describe('clusterStations (auto-pick strategy)', () => {
  test('picks postcode when ≥60% of stations have one', () => {
    const stations = [
      mk({ id: '1', postcode: 'B12 8AB' }),
      mk({ id: '2', postcode: 'B12 9CD' }),
      mk({ id: '3', name: 'no code' }),
    ];
    const { strategy } = clusterStations(stations, 'petrol');
    expect(strategy).toBe('postcode');
  });

  test('falls back to grid when postcodes are sparse', () => {
    const stations = [
      mk({ id: '1', postcode: 'B12 8AB' }),
      mk({ id: '2', name: 'no code' }),
      mk({ id: '3', name: 'no code' }),
      mk({ id: '4', name: 'no code' }),
    ];
    const { strategy } = clusterStations(stations, 'petrol');
    expect(strategy).toBe('grid');
  });

  test('returns none for empty input', () => {
    expect(clusterStations([], 'petrol').strategy).toBe('none');
  });
});

describe('computePriceColourScale', () => {
  test('maps a varied cohort across all 5 colours', () => {
    const clusters = [
      { avgPrice: 130 }, { avgPrice: 135 }, { avgPrice: 140 },
      { avgPrice: 145 }, { avgPrice: 150 },
    ];
    const scale = computePriceColourScale(clusters);
    expect(scale.uniform).toBe(false);
    expect(scale(130)).toBe(HEATMAP_COLOURS.cheapest);
    expect(scale(150)).toBe(HEATMAP_COLOURS.expensive);
    expect(scale(140)).toBe(HEATMAP_COLOURS.mid);
  });

  test('collapses to amber when spread is below threshold', () => {
    const clusters = [
      { avgPrice: 140.0 }, { avgPrice: 140.2 }, { avgPrice: 140.4 },
    ];
    const scale = computePriceColourScale(clusters);
    expect(scale.uniform).toBe(true);
    expect(scale(140.0)).toBe(HEATMAP_COLOURS.uniform);
    expect(scale(140.4)).toBe(HEATMAP_COLOURS.uniform);
  });

  test('handles single-cluster input', () => {
    const scale = computePriceColourScale([{ avgPrice: 140 }]);
    expect(scale.uniform).toBe(true);
    expect(scale(140)).toBe(HEATMAP_COLOURS.uniform);
  });

  test('handles empty input', () => {
    const scale = computePriceColourScale([]);
    expect(scale.uniform).toBe(true);
    expect(scale.min).toBeNull();
    expect(scale(140)).toBe(HEATMAP_COLOURS.uniform);
  });

  test('non-finite price returns mid', () => {
    const scale = computePriceColourScale([{ avgPrice: 130 }, { avgPrice: 150 }]);
    expect(scale(NaN)).toBe(HEATMAP_COLOURS.mid);
  });
});

describe('formatLegendRange', () => {
  test('formats "138p — 145p"', () => {
    expect(formatLegendRange(138.2, 145.4)).toBe('138p — 145p');
  });
  test('returns single value when min === max', () => {
    expect(formatLegendRange(140, 140.3)).toBe('140p');
  });
  test('returns null for non-finite input', () => {
    expect(formatLegendRange(null, 145)).toBeNull();
    expect(formatLegendRange(140, NaN)).toBeNull();
  });
});

describe('clusterRadiusMetres', () => {
  test('grows with count', () => {
    expect(clusterRadiusMetres(10)).toBeGreaterThan(clusterRadiusMetres(2));
  });
  test('caps at 2000m', () => {
    expect(clusterRadiusMetres(10000)).toBe(2000);
  });
  test('falls back gracefully for non-finite count', () => {
    expect(clusterRadiusMetres(NaN)).toBe(600);
    expect(clusterRadiusMetres(0)).toBe(600);
  });
});
