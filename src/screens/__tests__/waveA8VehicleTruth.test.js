/**
 * Wave A.8 — Vehicle Truth Fix
 *
 * Tests for the deterministic fuel-type resolution in the vehicle lookup flow:
 *   1. VehicleSettingsScreen handleLookup fuel-type priority logic
 *   2. Silent backfill (runVehicleTruthBackfill) in userVehicle.js
 *
 * These tests exercise the logic directly without React rendering — using the
 * same approach as prior wave tests in this directory.
 */

const { mapDvlaFuelToCanonical } = require('../../lib/dvlaFuelMapping');
const {
  runVehicleTruthBackfill,
  USER_VEHICLE_KEY,
  VEHICLE_TRUTH_BACKFILL_KEY,
} = require('../../lib/userVehicle');

// ── Shared mock setup ────────────────────────────────────────────────────────

// Mock AsyncStorage with in-memory store
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

// ── Fuel resolution priority logic ──────────────────────────────────────────
// Mirrors the logic in VehicleSettingsScreen.js handleLookup (Wave A.8)

const VALID_CATEGORIES = ['diesel', 'unleaded', 'electric'];

function resolveFuelCategory(resp, fallbackFuelType = 'unleaded') {
  let dvlaCategory = null;

  if (resp?.fuel_category && VALID_CATEGORIES.includes(resp.fuel_category)) {
    dvlaCategory = resp.fuel_category;
  } else {
    const rawFuel = resp?.fuel_type || resp?.fuelType;
    const mapped = mapDvlaFuelToCanonical(rawFuel);
    if (mapped !== null) dvlaCategory = mapped;
  }

  if (dvlaCategory === null) return { taxonomyKey: fallbackFuelType, dvlaCategory: null };
  if (dvlaCategory === 'electric') return { taxonomyKey: fallbackFuelType, dvlaCategory: 'electric' };
  return { taxonomyKey: dvlaCategory, dvlaCategory };
}

describe('Wave A.8 — handleLookup fuel-type resolution', () => {
  // ── Priority 1: fuel_category from server ──────────────────────────────────

  test('RK65XKY: fuelType DIESEL + fuel_category diesel → saves as "diesel"', () => {
    const resp = { fuelType: 'DIESEL', fuel_category: 'diesel' };
    const { taxonomyKey } = resolveFuelCategory(resp);
    expect(taxonomyKey).toBe('diesel');
  });

  test('fuel_category "unleaded" → saves as "unleaded"', () => {
    const resp = { fuelType: 'PETROL', fuel_category: 'unleaded' };
    const { taxonomyKey } = resolveFuelCategory(resp);
    expect(taxonomyKey).toBe('unleaded');
  });

  test('fuel_category "electric" → falls back to user selection (EVs have no pump key)', () => {
    const resp = { fuelType: 'ELECTRICITY', fuel_category: 'electric' };
    const { taxonomyKey, dvlaCategory } = resolveFuelCategory(resp, 'diesel');
    expect(dvlaCategory).toBe('electric');
    expect(taxonomyKey).toBe('diesel'); // user's current selection preserved
  });

  // ── Priority 2: fuel_type fallback mapping ─────────────────────────────────

  test('No fuel_category, fuelType PETROL → maps to "unleaded" via fuel_type', () => {
    const resp = { fuelType: 'PETROL', fuel_type: 'petrol' };
    const { taxonomyKey } = resolveFuelCategory(resp);
    expect(taxonomyKey).toBe('unleaded');
  });

  test('No fuel_category, fuelType HYBRID ELECTRIC → "unleaded"', () => {
    const resp = { fuelType: 'HYBRID ELECTRIC', fuel_type: 'hybrid electric' };
    const { taxonomyKey } = resolveFuelCategory(resp);
    expect(taxonomyKey).toBe('unleaded');
  });

  test('No fuel_category, fuelType ELECTRICITY → electric fallback', () => {
    const resp = { fuelType: 'ELECTRICITY', fuel_type: 'electricity' };
    const { taxonomyKey, dvlaCategory } = resolveFuelCategory(resp, 'unleaded');
    expect(dvlaCategory).toBe('electric');
    expect(taxonomyKey).toBe('unleaded');
  });

  // ── Priority 3: unknown — fall back to user selection ─────────────────────

  test('No fuel_category, unknown fuelType → falls back to user selection', () => {
    const resp = { fuelType: 'HYDROGEN', fuel_type: 'hydrogen' };
    const { taxonomyKey, dvlaCategory } = resolveFuelCategory(resp, 'diesel');
    expect(dvlaCategory).toBeNull();
    expect(taxonomyKey).toBe('diesel'); // user choice preserved
  });

  test('Empty response → falls back to user selection', () => {
    const { taxonomyKey, dvlaCategory } = resolveFuelCategory({}, 'unleaded');
    expect(dvlaCategory).toBeNull();
    expect(taxonomyKey).toBe('unleaded');
  });

  // ── Backwards compat: camelCase fuelType without fuel_category ─────────────

  test('Old backend (no fuel_category): fuelType DIESEL → still resolves diesel via fuelType', () => {
    const resp = { fuelType: 'DIESEL' }; // no fuel_type, no fuel_category
    const { taxonomyKey } = resolveFuelCategory(resp);
    expect(taxonomyKey).toBe('diesel');
  });
});

// ── Silent backfill tests ────────────────────────────────────────────────────

describe('Wave A.8 — runVehicleTruthBackfill', () => {
  beforeEach(() => {
    clearStore();
  });

  test('Backfill corrects DVLA-sourced vehicle saved as "unleaded" when DVLA returns DIESEL', async () => {
    // Arrange: a vehicle saved from a DVLA lookup but incorrectly as unleaded
    const savedVehicle = {
      reg: 'RK65XKY',
      fuel_type: 'unleaded',
      source: 'dvla',
      make: 'VOLKSWAGEN',
      model: 'GOLF',
    };
    store[USER_VEHICLE_KEY] = JSON.stringify(savedVehicle);

    // Mock DVLA returns diesel
    const lookupVehicleFn = jest.fn().mockResolvedValue({
      fuelType: 'DIESEL',
      fuel_type: 'diesel',
      fuel_category: 'diesel',
    });

    await runVehicleTruthBackfill({ lookupVehicleFn });

    // Assert the record was corrected
    const raw = store[USER_VEHICLE_KEY];
    expect(raw).toBeDefined();
    const updated = JSON.parse(raw);
    expect(updated.fuel_type).toBe('diesel');
    expect(updated.reg).toBe('RK65XKY');
  });

  test('Backfill does NOT touch manual-source vehicles', async () => {
    const savedVehicle = {
      reg: 'AB12CDE',
      fuel_type: 'unleaded',
      source: 'manual', // user explicitly chose
    };
    store[USER_VEHICLE_KEY] = JSON.stringify(savedVehicle);

    const lookupVehicleFn = jest.fn().mockResolvedValue({
      fuelType: 'DIESEL',
      fuel_category: 'diesel',
    });

    await runVehicleTruthBackfill({ lookupVehicleFn });

    // lookupVehicleFn should NOT have been called
    expect(lookupVehicleFn).not.toHaveBeenCalled();

    // And stored value should be unchanged
    const updated = JSON.parse(store[USER_VEHICLE_KEY]);
    expect(updated.fuel_type).toBe('unleaded');
  });

  test('Backfill does not update when fuel_type already matches DVLA', async () => {
    const savedVehicle = {
      reg: 'RK65XKY',
      fuel_type: 'diesel',
      source: 'dvla',
    };
    store[USER_VEHICLE_KEY] = JSON.stringify(savedVehicle);

    const lookupVehicleFn = jest.fn().mockResolvedValue({
      fuel_category: 'diesel',
    });

    await runVehicleTruthBackfill({ lookupVehicleFn });

    // setItem should NOT have been called (no change needed)
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
      USER_VEHICLE_KEY,
      expect.anything()
    );
  });

  test('Backfill does not run when feature flag is disabled', async () => {
    store[VEHICLE_TRUTH_BACKFILL_KEY] = 'false';

    const savedVehicle = {
      reg: 'RK65XKY',
      fuel_type: 'unleaded',
      source: 'dvla',
    };
    store[USER_VEHICLE_KEY] = JSON.stringify(savedVehicle);

    const lookupVehicleFn = jest.fn().mockResolvedValue({
      fuel_category: 'diesel',
    });

    await runVehicleTruthBackfill({ lookupVehicleFn });

    expect(lookupVehicleFn).not.toHaveBeenCalled();
  });

  test('Backfill does not run when no vehicle saved', async () => {
    // store is empty

    const lookupVehicleFn = jest.fn();

    await runVehicleTruthBackfill({ lookupVehicleFn });

    expect(lookupVehicleFn).not.toHaveBeenCalled();
  });

  test('Backfill does not run when vehicle has no reg', async () => {
    store[USER_VEHICLE_KEY] = JSON.stringify({
      fuel_type: 'unleaded',
      source: 'dvla',
      // no reg
    });

    const lookupVehicleFn = jest.fn();

    await runVehicleTruthBackfill({ lookupVehicleFn });

    expect(lookupVehicleFn).not.toHaveBeenCalled();
  });

  test('Backfill does not overwrite when DVLA returns unknown fuel type', async () => {
    store[USER_VEHICLE_KEY] = JSON.stringify({
      reg: 'ZZ99ZZZ',
      fuel_type: 'unleaded',
      source: 'dvla',
    });

    const lookupVehicleFn = jest.fn().mockResolvedValue({
      fuelType: 'HYDROGEN',
      fuel_type: 'hydrogen',
      fuel_category: null,
    });

    await runVehicleTruthBackfill({ lookupVehicleFn });

    // Unknown DVLA type — should not overwrite
    const updated = JSON.parse(store[USER_VEHICLE_KEY]);
    expect(updated.fuel_type).toBe('unleaded');
  });

  test('Backfill logs "vehicle_truth_corrected" diagnostic on correction', async () => {
    store[USER_VEHICLE_KEY] = JSON.stringify({
      reg: 'RK65XKY',
      fuel_type: 'unleaded',
      source: 'dvla',
    });

    const lookupVehicleFn = jest.fn().mockResolvedValue({
      fuel_category: 'diesel',
    });

    await runVehicleTruthBackfill({ lookupVehicleFn });

    // Check the diagnostics log was written
    const logRaw = store['diagnostics_log'];
    expect(logRaw).toBeDefined();
    const log = JSON.parse(logRaw);
    expect(log.length).toBeGreaterThan(0);
    expect(log[0].event).toBe('vehicle_truth_corrected');
    expect(log[0].reg).toBe('RK65XKY');
    expect(log[0].was).toBe('unleaded');
    expect(log[0].now).toBe('diesel');
  });

  test('Backfill is safe even when lookupVehicleFn throws', async () => {
    store[USER_VEHICLE_KEY] = JSON.stringify({
      reg: 'RK65XKY',
      fuel_type: 'unleaded',
      source: 'dvla',
    });

    const lookupVehicleFn = jest.fn().mockRejectedValue(new Error('network error'));

    // Should not throw
    await expect(runVehicleTruthBackfill({ lookupVehicleFn })).resolves.toBeUndefined();
  });
});
