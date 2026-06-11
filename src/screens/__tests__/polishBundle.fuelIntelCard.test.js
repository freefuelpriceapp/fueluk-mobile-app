/**
 * Polish Bundle — FuelIntelCard headline rotation logic tests.
 *
 * Tests the pure logic that drives which headlines appear in the
 * rotating strip. No React rendering required.
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

const store = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key) => Promise.resolve(store[key] ?? null)),
  setItem: jest.fn((key, val) => { store[key] = val; return Promise.resolve(); }),
}));

jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { apiBaseUrl: 'https://api.freefuelpriceapp.com' } } },
}));

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  })),
}));

// ── Helpers (extracted from FuelIntelCard) ───────────────────────────────────

function formatRelative(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60_000) return 'just now';
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

function isFreshData(isoString, windowMs = 30_000) {
  if (!isoString) return false;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() < windowMs;
}

function resolveCheapest(stations, fuelType) {
  if (!Array.isArray(stations) || stations.length === 0) return null;
  let best = null;
  let bestPrice = Infinity;
  for (const s of stations) {
    let price = null;
    if (fuelType === 'unleaded' || fuelType === 'petrol') {
      price = s.e10_price ?? s.petrol_price ?? null;
    } else {
      price = s[`${fuelType}_price`] ?? null;
    }
    const p = Number(price);
    if (Number.isFinite(p) && p > 0 && p < bestPrice) {
      bestPrice = p;
      best = s;
    }
  }
  return best ? { station: best, price: bestPrice } : null;
}

/**
 * Build headline lines array — mirrors FuelIntelCard logic.
 */
function buildHeadlineLines({ stations, fuelType, radiusMiles, lastUpdated, savingLabel, userVehicle }) {
  const lines = [];
  if (stations.length > 0) {
    lines.push(`Watching ${stations.length} station${stations.length !== 1 ? 's' : ''} within ${radiusMiles} miles`);
  }
  const cheapest = resolveCheapest(stations, fuelType);
  if (cheapest) {
    const name = cheapest.station.name || cheapest.station.brand || 'nearby';
    lines.push(`Cheapest near you: ${name} · ${cheapest.price.toFixed(1)}p`);
  }
  if (lastUpdated) {
    const rel = formatRelative(lastUpdated);
    if (rel) lines.push(`Updated ${rel}`);
  }
  if (savingLabel && userVehicle) {
    lines.push(savingLabel);
  }
  if (lines.length === 0) {
    lines.push('Scanning for the best prices near you');
  }
  return lines;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FuelIntelCard — headline rotation logic', () => {
  const stations = [
    { id: '1', name: 'Tesco Petrol', e10_price: 148.9, distance_miles: 0.3 },
    { id: '2', name: 'BP Garage', e10_price: 152.1, distance_miles: 0.8 },
    { id: '3', name: 'Asda', e10_price: 146.0, distance_miles: 1.2 },
  ];

  test('with stations: first line is station count', () => {
    const lines = buildHeadlineLines({
      stations,
      fuelType: 'unleaded',
      radiusMiles: 3,
      lastUpdated: null,
    });
    expect(lines[0]).toBe('Watching 3 stations within 3 miles');
  });

  test('plural: "station" vs "stations"', () => {
    const oneStation = [{ id: '1', name: 'BP', e10_price: 148.9 }];
    const lines = buildHeadlineLines({
      stations: oneStation,
      fuelType: 'unleaded',
      radiusMiles: 5,
      lastUpdated: null,
    });
    expect(lines[0]).toContain('1 station within');
    expect(lines[0]).not.toContain('stations');
  });

  test('cheapest station is included in lines', () => {
    const lines = buildHeadlineLines({
      stations,
      fuelType: 'unleaded',
      radiusMiles: 3,
      lastUpdated: null,
    });
    const cheapestLine = lines.find((l) => l.includes('Cheapest near you'));
    expect(cheapestLine).toBeDefined();
    expect(cheapestLine).toContain('Asda');
    expect(cheapestLine).toContain('146.0p');
  });

  test('cheapest resolved correctly for diesel', () => {
    const dieselStations = [
      { id: '1', name: 'Shell', diesel_price: 160.9 },
      { id: '2', name: 'Esso', diesel_price: 155.0 },
    ];
    const lines = buildHeadlineLines({
      stations: dieselStations,
      fuelType: 'diesel',
      radiusMiles: 5,
      lastUpdated: null,
    });
    const cheapestLine = lines.find((l) => l.includes('Cheapest near you'));
    expect(cheapestLine).toContain('Esso');
    expect(cheapestLine).toContain('155.0p');
  });

  test('"Updated X ago" line appears when lastUpdated is set', () => {
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const lines = buildHeadlineLines({
      stations,
      fuelType: 'unleaded',
      radiusMiles: 3,
      lastUpdated: tenMinsAgo,
    });
    const updatedLine = lines.find((l) => l.includes('Updated'));
    expect(updatedLine).toBeDefined();
    expect(updatedLine).toContain('10m ago');
  });

  test('"Updated just now" for very recent data', () => {
    const now = new Date(Date.now() - 5000).toISOString();
    const lines = buildHeadlineLines({
      stations,
      fuelType: 'unleaded',
      radiusMiles: 3,
      lastUpdated: now,
    });
    const updatedLine = lines.find((l) => l.includes('Updated'));
    expect(updatedLine).toContain('just now');
  });

  test('saving label appears when userVehicle is present', () => {
    const lines = buildHeadlineLines({
      stations,
      fuelType: 'unleaded',
      radiusMiles: 3,
      lastUpdated: null,
      savingLabel: 'Saving ~£18/mo vs nearest station',
      userVehicle: { reg: 'AB12CDE' },
    });
    expect(lines).toContain('Saving ~£18/mo vs nearest station');
  });

  test('saving label NOT shown when no userVehicle', () => {
    const lines = buildHeadlineLines({
      stations,
      fuelType: 'unleaded',
      radiusMiles: 3,
      lastUpdated: null,
      savingLabel: 'Saving ~£18/mo vs nearest station',
      userVehicle: null,
    });
    expect(lines).not.toContain('Saving ~£18/mo vs nearest station');
  });

  test('fallback "Scanning..." when no stations and no other data', () => {
    const lines = buildHeadlineLines({
      stations: [],
      fuelType: 'unleaded',
      radiusMiles: 3,
      lastUpdated: null,
    });
    expect(lines).toEqual(['Scanning for the best prices near you']);
  });
});

describe('FuelIntelCard — fresh data detection', () => {
  test('isFreshData returns true for data within 30s', () => {
    const recent = new Date(Date.now() - 10_000).toISOString();
    expect(isFreshData(recent, 30_000)).toBe(true);
  });

  test('isFreshData returns false for data older than 30s', () => {
    const old = new Date(Date.now() - 60_000).toISOString();
    expect(isFreshData(old, 30_000)).toBe(false);
  });

  test('isFreshData returns false for null', () => {
    expect(isFreshData(null)).toBe(false);
  });

  test('isFreshData returns false for invalid date', () => {
    expect(isFreshData('not-a-date')).toBe(false);
  });
});

describe('FuelIntelCard — E5 prompt gating', () => {
  // Gate: show E5 prompt when no vehicle, or vehicle year < 2002, or recently opened
  function shouldShowE5Prompt({ userVehicle, e5RecentlyOpened = false }) {
    const vehicleYear = userVehicle?.yearOfManufacture ?? userVehicle?.year ?? null;
    return !userVehicle || (vehicleYear && vehicleYear < 2002) || e5RecentlyOpened;
  }

  test('no vehicle → show E5 prompt', () => {
    expect(shouldShowE5Prompt({ userVehicle: null })).toBe(true);
  });

  test('pre-2002 vehicle → show E5 prompt', () => {
    expect(shouldShowE5Prompt({ userVehicle: { yearOfManufacture: 1999 } })).toBe(true);
  });

  test('2002 vehicle → NOT shown (edge: exactly 2002)', () => {
    expect(shouldShowE5Prompt({ userVehicle: { yearOfManufacture: 2002 } })).toBe(false);
  });

  test('modern vehicle (2019) → NOT shown', () => {
    expect(shouldShowE5Prompt({ userVehicle: { yearOfManufacture: 2019 } })).toBe(false);
  });

  test('modern vehicle but e5RecentlyOpened → shown', () => {
    expect(shouldShowE5Prompt({ userVehicle: { yearOfManufacture: 2019 }, e5RecentlyOpened: true })).toBe(true);
  });
});
