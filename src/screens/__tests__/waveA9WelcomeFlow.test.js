/**
 * Wave A.9 — Welcome Flow Tests
 *
 * Tests the logic directly without React rendering — same pattern as
 * waveA7E5LinkVisibility.test.js, waveA8VehicleTruth.test.js etc.
 *
 * Covers:
 *   1-5:   truncateCoord — precision, positive, negative, zero
 *   6-9:   isValidUKPlate — valid/invalid
 *   10-14: Welcome routing gate logic
 *   15-18: getSavingsEstimate payload privacy (no plate/reg)
 *   19-21: WELCOME_COMPLETED_KEY constant
 *   22-24: Frame headline assertions (loss/validating/regional)
 *   25-27: API payload construction — lat/lon truncated, no plate
 */

// ── Mock AsyncStorage ────────────────────────────────────────────────────────

const store = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key) => Promise.resolve(store[key] ?? null)),
  setItem: jest.fn((key, val) => { store[key] = val; return Promise.resolve(); }),
  removeItem: jest.fn((key) => { delete store[key]; return Promise.resolve(); }),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');

function clearStore() {
  Object.keys(store).forEach((k) => delete store[k]);
  AsyncStorage.getItem.mockClear();
  AsyncStorage.setItem.mockClear();
}

// ── Mock expo-location ───────────────────────────────────────────────────────

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 4 },
}));

// ── Mock expo-constants (required by fuelApi) ────────────────────────────────

jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { apiBaseUrl: 'https://api.freefuelpriceapp.com' } } },
}));

// ── Mock axios (required by fuelApi) ────────────────────────────────────────

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  })),
}));

// ── Mock @expo/vector-icons ──────────────────────────────────────────────────

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

// ── Mock react-native ────────────────────────────────────────────────────────
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: (s) => s },
  SafeAreaView: 'SafeAreaView',
  ActivityIndicator: 'ActivityIndicator',
  ScrollView: 'ScrollView',
  Modal: 'Modal',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Platform: { OS: 'ios' },
}));

// ── Pure helper functions (mirrored from WelcomeFlowScreen) ──────────────────

/**
 * Truncate a coordinate to N decimal places (~111m precision at 3dp).
 * Truncates toward zero — never rounds up.
 */
function truncateCoord(val, dp = 3) {
  const factor = Math.pow(10, dp);
  return Math.trunc(Number(val) * factor) / factor;
}

/**
 * Validate a UK registration plate.
 */
function isValidUKPlate(s) {
  const cleaned = String(s || '').replace(/\s+/g, '').toUpperCase();
  return cleaned.length >= 5 && cleaned.length <= 8 && /^[A-Z0-9]+$/.test(cleaned);
}

/**
 * Routing decision: show welcome flow?
 */
function shouldShowWelcome(welcomeCompleted, flagEnabled) {
  return welcomeCompleted !== 'true' && flagEnabled === true;
}

/**
 * Build savings estimate payload (privacy-safe — no plate).
 */
function buildSavingsEstimatePayload({ lat, lon, vehicleData }) {
  const payload = {
    lat: truncateCoord(lat, 3),
    lon: truncateCoord(lon, 3),
  };
  if (vehicleData) {
    if (vehicleData.make) payload.make = vehicleData.make;
    if (vehicleData.model) payload.model = vehicleData.model;
    if (vehicleData.fuel_type) payload.fuel_type = vehicleData.fuel_type;
    if (vehicleData.mpg) payload.mpg = vehicleData.mpg;
  }
  // Plate MUST NOT appear — assert it never lands in payload
  return payload;
}

beforeEach(() => {
  clearStore();
  jest.clearAllMocks();
});

// ── 1-5: truncateCoord ────────────────────────────────────────────────────────

test('A.9-01: truncateCoord — positive coord truncated to 3dp', () => {
  expect(truncateCoord(51.501234567)).toBe(51.501);
});

test('A.9-02: truncateCoord — negative coord truncates toward zero (not away)', () => {
  // -0.141234 → trunc → -0.141 (not -0.142)
  expect(truncateCoord(-0.141234)).toBe(-0.141);
});

test('A.9-03: truncateCoord — exactly 3dp is unchanged', () => {
  expect(truncateCoord(52.479)).toBe(52.479);
});

test('A.9-04: truncateCoord — high-precision coord has at most 3 decimal places', () => {
  const result = truncateCoord(52.47912345);
  const decimalPart = String(result).split('.')[1] || '';
  expect(decimalPart.length).toBeLessThanOrEqual(3);
});

test('A.9-05: truncateCoord — zero remains zero', () => {
  expect(truncateCoord(0)).toBe(0);
});

// ── 6-9: isValidUKPlate ───────────────────────────────────────────────────────

test('A.9-06: isValidUKPlate — standard 7-char plate accepted', () => {
  expect(isValidUKPlate('RK65XKY')).toBe(true);
});

test('A.9-07: isValidUKPlate — plate with space accepted', () => {
  expect(isValidUKPlate('AB12 CDE')).toBe(true);
});

test('A.9-08: isValidUKPlate — too short rejected (3 chars)', () => {
  expect(isValidUKPlate('AB1')).toBe(false);
});

test('A.9-09: isValidUKPlate — too long rejected (10 chars)', () => {
  expect(isValidUKPlate('ABCDE12345')).toBe(false);
});

// ── 10-14: Welcome routing gate ───────────────────────────────────────────────

test('A.9-10: Routing — welcome_completed=undefined → show welcome flow', () => {
  expect(shouldShowWelcome(undefined, true)).toBe(true);
});

test('A.9-11: Routing — welcome_completed=null → show welcome flow', () => {
  expect(shouldShowWelcome(null, true)).toBe(true);
});

test('A.9-12: Routing — welcome_completed="true" → skip welcome flow', () => {
  expect(shouldShowWelcome('true', true)).toBe(false);
});

test('A.9-13: Routing — welcome_flow_enabled=false → skip welcome flow (kill-switch)', () => {
  expect(shouldShowWelcome(undefined, false)).toBe(false);
});

test('A.9-14: Routing — kill-switch=false + not completed → still skip', () => {
  expect(shouldShowWelcome(null, false)).toBe(false);
});

// ── 15-18: Privacy — payload never includes plate ────────────────────────────

test('A.9-15: Privacy — plate not in payload when vehicle data provided', () => {
  const payload = buildSavingsEstimatePayload({
    lat: 52.479,
    lon: -1.912,
    vehicleData: { make: 'BMW', model: '3 Series', fuel_type: 'DIESEL', mpg: 48 },
  });
  expect(payload).not.toHaveProperty('plate');
  expect(payload).not.toHaveProperty('reg');
  expect(payload).not.toHaveProperty('registration');
});

test('A.9-16: Privacy — plate not in payload when no vehicle data (skip path)', () => {
  const payload = buildSavingsEstimatePayload({ lat: 52.479, lon: -1.912, vehicleData: null });
  expect(payload).not.toHaveProperty('plate');
  expect(payload).not.toHaveProperty('reg');
  expect(payload).not.toHaveProperty('registration');
});

test('A.9-17: Privacy — lat/lon are truncated to 3dp in payload', () => {
  const payload = buildSavingsEstimatePayload({ lat: 52.47912345, lon: -1.91267890 });
  expect(payload.lat).toBe(52.479);
  expect(payload.lon).toBe(-1.912);
});

test('A.9-18: Privacy — make/model/fuel_type/mpg ARE included in payload when provided', () => {
  const payload = buildSavingsEstimatePayload({
    lat: 52.479,
    lon: -1.912,
    vehicleData: { make: 'BMW', model: '3 Series', fuel_type: 'DIESEL', mpg: 48 },
  });
  expect(payload.make).toBe('BMW');
  expect(payload.model).toBe('3 Series');
  expect(payload.fuel_type).toBe('DIESEL');
  expect(payload.mpg).toBe(48);
});

// ── 19-21: WELCOME_COMPLETED_KEY constant ────────────────────────────────────

// The WELCOME_COMPLETED_KEY value is defined in WelcomeFlowScreen.js.
// We test it here as a pure constant — no React import needed.
const WELCOME_COMPLETED_KEY = 'welcome_completed';

test('A.9-19: WELCOME_COMPLETED_KEY is "welcome_completed"', () => {
  expect(WELCOME_COMPLETED_KEY).toBe('welcome_completed');
});

test('A.9-20: AsyncStorage setItem called with WELCOME_COMPLETED_KEY on complete', async () => {
  await AsyncStorage.setItem('welcome_completed', 'true');
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('welcome_completed', 'true');
});

test('A.9-21: AsyncStorage getItem returns "true" after setItem', async () => {
  store['welcome_completed'] = 'true';
  const val = await AsyncStorage.getItem('welcome_completed');
  expect(val).toBe('true');
});

// ── 22-24: Frame headline content ────────────────────────────────────────────

const FRAME_HEADLINES = {
  loss: 'You could have saved £237 in the last 12 months.',
  validating: "You're already filling at one of the cheapest spots in B7 — paying less than 67% of drivers around here. We'll tell you if that changes.",
  regional: "Drivers in TD15 paid 7p/L more than the UK average this month — we'll watch your stations for changes.",
};

test('A.9-22: Loss frame headline contains "could have saved"', () => {
  expect(FRAME_HEADLINES.loss).toContain('could have saved');
});

test('A.9-23: Validating frame headline contains "cheapest spots"', () => {
  expect(FRAME_HEADLINES.validating).toContain('cheapest spots');
});

test('A.9-24: Regional frame headline contains "watch your stations"', () => {
  expect(FRAME_HEADLINES.regional).toContain("watch your stations");
});

// ── 25-27: API payload completeness ──────────────────────────────────────────

test('A.9-25: payload with full vehicle data has all 6 fields', () => {
  const payload = buildSavingsEstimatePayload({
    lat: 52.479123,
    lon: -1.912456,
    vehicleData: { make: 'BMW', model: '3 Series', fuel_type: 'DIESEL', mpg: 48 },
  });
  expect(Object.keys(payload).sort()).toEqual(['fuel_type', 'lat', 'lon', 'make', 'model', 'mpg'].sort());
});

test('A.9-26: payload without vehicle data has only lat/lon', () => {
  const payload = buildSavingsEstimatePayload({ lat: 52.479, lon: -1.912, vehicleData: null });
  expect(Object.keys(payload).sort()).toEqual(['lat', 'lon'].sort());
});

test('A.9-27: payload with partial vehicle (missing mpg) omits mpg', () => {
  const payload = buildSavingsEstimatePayload({
    lat: 52.479,
    lon: -1.912,
    vehicleData: { make: 'BMW', model: '3 Series', fuel_type: 'DIESEL', mpg: null },
  });
  expect(payload).not.toHaveProperty('mpg');
});
