/**
 * Regression: stations from the real backend carry prices on flat
 * `<fuel>_price` fields (petrol_price, diesel_price, ...) — NOT on a
 * nested `prices` map.
 *
 * Pin mode reads them via `resolvePrice` from quarantine.js and renders
 * fine. Heatmap mode used to read them as `s?.prices?.[fuelType]
 * ?? s?.[fuelType]` which silently returned null for the actual wire
 * format, producing zero clusters and the "Heatmap data unavailable"
 * legend that survived three resilience passes.
 *
 * These tests pin both wire shapes and the mixed shape so the heatmap
 * path can never silently desync from Pin mode again.
 */
const {
  buildHeatmapClusters,
  clusterStationsByGrid,
  clusterStationsByPostcode,
  clusterStations,
  computeRegionAverages,
  clusterStationsAsMicroBlooms,
  diagnoseHeatmap,
} = require('../heatmap');

// Stations as returned by /api/v1/stations/nearby — flat fields only.
const flatStation = (id, lat, lon, petrolPrice, extras = {}) => ({
  id,
  lat,
  lon,
  petrol_price: petrolPrice,
  ...extras,
});

// Birmingham city-centre cohort with the wire-format flat fields.
const flatBirmingham = () => {
  const offsets = [
    [0.000, 0.000, 138.9, 'B1 1AA'],
    [0.005, 0.010, 139.2, 'B1 1BB'],
    [-0.010, 0.005, 140.5, 'B5 5AA'],
    [0.010, -0.005, 141.0, 'B5 5BB'],
    [0.015, 0.020, 142.0, 'B7 7AA'],
    [-0.005, 0.025, 138.5, 'B7 7BB'],
    [-0.020, -0.010, 140.1, 'B8 8AA'],
    [0.020, 0.015, 142.5, 'B8 8BB'],
    [-0.015, 0.025, 139.8, 'B9 9AA'],
    [0.025, -0.020, 141.7, 'B9 9BB'],
    [-0.025, 0.000, 138.0, 'B10 0AA'],
    [0.000, 0.030, 142.9, 'B10 0BB'],
    [0.030, 0.005, 140.3, 'B12 8AA'],
    [-0.030, -0.020, 139.5, 'B12 8BB'],
  ];
  const lat0 = 52.4665;
  const lon0 = -1.8742;
  return offsets.map((o, i) =>
    flatStation(`bham-flat-${i}`, lat0 + o[0], lon0 + o[1], o[2], { postcode: o[3] })
  );
};

describe('heatmap reads flat <fuel>_price wire-format fields', () => {
  test('clusterStationsByGrid produces clusters from petrol_price-only stations', () => {
    const stations = flatBirmingham();
    const clusters = clusterStationsByGrid(stations, 'petrol', 1.5);
    expect(clusters.length).toBeGreaterThan(0);
    for (const c of clusters) {
      expect(Number.isFinite(c.avgPrice)).toBe(true);
      expect(c.count).toBeGreaterThan(0);
    }
  });

  test('clusterStationsByPostcode produces clusters from petrol_price-only stations', () => {
    const stations = flatBirmingham();
    const clusters = clusterStationsByPostcode(stations, 'petrol');
    expect(clusters.length).toBeGreaterThan(0);
  });

  test('clusterStations auto-pick produces a non-empty result with wire-format fields', () => {
    const stations = flatBirmingham();
    const res = clusterStations(stations, 'petrol', 1.5);
    expect(res.strategy).not.toBe('none');
    expect(res.clusters.length).toBeGreaterThan(0);
  });

  test('clusterStationsAsMicroBlooms produces blooms from petrol_price-only stations', () => {
    const stations = flatBirmingham();
    const micro = clusterStationsAsMicroBlooms(stations, 'petrol');
    expect(micro.length).toBe(stations.length);
    for (const c of micro) {
      expect(Number.isFinite(c.avgPrice)).toBe(true);
      expect(c.micro).toBe(true);
    }
  });

  test('computeRegionAverages handles wire-format prices', () => {
    // Nationwide spread so at least one NUTS-1 region picks them up.
    const stations = [
      flatStation('lon-1', 51.5074, -0.1278, 145.0),
      flatStation('lon-2', 51.51, -0.13, 144.5),
      flatStation('bham-1', 52.4665, -1.8742, 139.0),
      flatStation('bham-2', 52.47, -1.87, 138.5),
      flatStation('manc-1', 53.4808, -2.2426, 141.0),
    ];
    const regions = computeRegionAverages(stations, 'petrol');
    expect(regions.length).toBeGreaterThan(0);
    for (const r of regions) {
      expect(Number.isFinite(r.avgPrice)).toBe(true);
    }
  });

  test('buildHeatmapClusters at Birmingham viewport returns ≥1 cluster from wire-format', () => {
    const stations = flatBirmingham();
    const build = buildHeatmapClusters({
      visibleStations: stations,
      filteredStations: stations,
      fuelType: 'petrol',
      viewportSpanKm: 8,
    });
    expect(build.tier).toBe('C');
    expect(build.strategy).not.toBe('none');
    expect(build.clusters.length).toBeGreaterThan(0);
  });
});

describe('mixed-shape stations (some flat, some nested) all contribute', () => {
  test('clusterStationsByGrid reads both shapes', () => {
    const stations = [
      flatStation('a', 52.46, -1.87, 140),
      { id: 'b', lat: 52.47, lon: -1.86, prices: { petrol: 141 } },
      flatStation('c', 52.48, -1.88, 142),
    ];
    const clusters = clusterStationsByGrid(stations, 'petrol', 1.5);
    expect(clusters.length).toBeGreaterThan(0);
    const totalCount = clusters.reduce((acc, c) => acc + c.count, 0);
    expect(totalCount).toBe(3);
  });
});

describe('non-petrol fuels with wire-format suffixed fields', () => {
  test('diesel_price field is read for diesel fuel selection', () => {
    const stations = [
      { id: 'd1', lat: 52.46, lon: -1.87, diesel_price: 148.5 },
      { id: 'd2', lat: 52.47, lon: -1.86, diesel_price: 149.0 },
      { id: 'd3', lat: 52.48, lon: -1.88, diesel_price: 147.2 },
    ];
    const clusters = clusterStationsByGrid(stations, 'diesel', 1.5);
    expect(clusters.length).toBeGreaterThan(0);
    expect(clusters[0].avgPrice).toBeGreaterThan(140);
  });

  test('e10_price wire field is read for e10 fuel', () => {
    const stations = [
      { id: 'e1', lat: 52.46, lon: -1.87, e10_price: 137.0 },
      { id: 'e2', lat: 52.47, lon: -1.86, e10_price: 137.5 },
    ];
    const res = clusterStations(stations, 'e10', 1.5);
    expect(res.clusters.length).toBeGreaterThan(0);
  });
});

describe('diagnoseHeatmap exposes the wire-format mismatch', () => {
  test('reports filteredPriced > 0 when wire-format prices are readable', () => {
    const stations = flatBirmingham();
    const build = buildHeatmapClusters({
      visibleStations: stations,
      filteredStations: stations,
      fuelType: 'petrol',
      viewportSpanKm: 8,
    });
    const diag = diagnoseHeatmap({
      viewportSpanKm: 8,
      visibleStations: stations,
      filteredStations: stations,
      fuelType: 'petrol',
      build,
    });
    expect(diag.filteredCount).toBe(stations.length);
    expect(diag.filteredPriced).toBe(stations.length);
    expect(diag.visiblePriced).toBe(stations.length);
    expect(diag.fuelType).toBe('petrol');
    expect(diag.clusterCount).toBeGreaterThan(0);
  });

  test('flags the failure mode: stations exist but no fuel-specific price', () => {
    // Stations only carry diesel_price but the user picked petrol — the
    // heatmap should report 0 priced stations (so any future regression
    // surfaces clearly in the diag log).
    const stations = [
      { id: 'd1', lat: 52.46, lon: -1.87, diesel_price: 149 },
      { id: 'd2', lat: 52.47, lon: -1.86, diesel_price: 148 },
    ];
    const build = buildHeatmapClusters({
      visibleStations: stations,
      filteredStations: stations,
      fuelType: 'petrol',
      viewportSpanKm: 8,
    });
    const diag = diagnoseHeatmap({
      viewportSpanKm: 8,
      visibleStations: stations,
      filteredStations: stations,
      fuelType: 'petrol',
      build,
    });
    expect(diag.filteredCount).toBe(2);
    expect(diag.filteredPriced).toBe(0);
    expect(diag.clusterCount).toBe(0);
  });
});
