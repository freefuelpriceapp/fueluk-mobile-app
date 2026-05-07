/**
 * Wave A.8 — Unit tests for src/lib/dvlaFuelMapping.js
 *
 * Covers all canonical DVLA fuel categories, edge cases, and garbage strings.
 */
import { mapDvlaFuelToCanonical, fuelCategoryToTaxonomyKey } from '../dvlaFuelMapping';

describe('mapDvlaFuelToCanonical', () => {
  // ── Diesel ──────────────────────────────────────────────────────────────────
  test('DIESEL → "diesel"', () => {
    expect(mapDvlaFuelToCanonical('DIESEL')).toBe('diesel');
  });

  test('diesel (lowercase) → "diesel"', () => {
    expect(mapDvlaFuelToCanonical('diesel')).toBe('diesel');
  });

  // ── Petrol / Gasoline ────────────────────────────────────────────────────────
  test('PETROL → "unleaded"', () => {
    expect(mapDvlaFuelToCanonical('PETROL')).toBe('unleaded');
  });

  test('GASOLINE → "unleaded"', () => {
    expect(mapDvlaFuelToCanonical('GASOLINE')).toBe('unleaded');
  });

  // ── Hybrids → unleaded (burn 95-RON at the pump) ────────────────────────────
  test('HYBRID ELECTRIC → "unleaded"', () => {
    expect(mapDvlaFuelToCanonical('HYBRID ELECTRIC')).toBe('unleaded');
  });

  test('HYBRID → "unleaded"', () => {
    expect(mapDvlaFuelToCanonical('HYBRID')).toBe('unleaded');
  });

  test('PHEV → "unleaded"', () => {
    expect(mapDvlaFuelToCanonical('PHEV')).toBe('unleaded');
  });

  test('PETROL/ELECTRIC → "unleaded"', () => {
    expect(mapDvlaFuelToCanonical('PETROL/ELECTRIC')).toBe('unleaded');
  });

  test('PETROL / ELECTRIC (with spaces) → "unleaded"', () => {
    expect(mapDvlaFuelToCanonical('PETROL / ELECTRIC')).toBe('unleaded');
  });

  // ── Pure electric ────────────────────────────────────────────────────────────
  test('ELECTRICITY → "electric"', () => {
    expect(mapDvlaFuelToCanonical('ELECTRICITY')).toBe('electric');
  });

  test('ELECTRIC → "electric"', () => {
    expect(mapDvlaFuelToCanonical('ELECTRIC')).toBe('electric');
  });

  test('EV → "electric"', () => {
    expect(mapDvlaFuelToCanonical('EV')).toBe('electric');
  });

  test('BEV → "electric"', () => {
    expect(mapDvlaFuelToCanonical('BEV')).toBe('electric');
  });

  // ── Unknown / fallback ───────────────────────────────────────────────────────
  test('empty string → null', () => {
    expect(mapDvlaFuelToCanonical('')).toBeNull();
  });

  test('null → null', () => {
    expect(mapDvlaFuelToCanonical(null)).toBeNull();
  });

  test('undefined → null', () => {
    expect(mapDvlaFuelToCanonical(undefined)).toBeNull();
  });

  test('garbage string → null', () => {
    expect(mapDvlaFuelToCanonical('HYDROGEN')).toBeNull();
    expect(mapDvlaFuelToCanonical('UNKNOWN')).toBeNull();
    expect(mapDvlaFuelToCanonical('!!!!')).toBeNull();
  });

  // ── Case insensitivity ───────────────────────────────────────────────────────
  test('mixed case "Diesel" → "diesel"', () => {
    expect(mapDvlaFuelToCanonical('Diesel')).toBe('diesel');
  });

  test('mixed case "Petrol" → "unleaded"', () => {
    expect(mapDvlaFuelToCanonical('Petrol')).toBe('unleaded');
  });
});

describe('fuelCategoryToTaxonomyKey', () => {
  test('"diesel" → "diesel"', () => {
    expect(fuelCategoryToTaxonomyKey('diesel')).toBe('diesel');
  });

  test('"unleaded" → "unleaded"', () => {
    expect(fuelCategoryToTaxonomyKey('unleaded')).toBe('unleaded');
  });

  test('"electric" → null (EVs have no pump fuel key)', () => {
    expect(fuelCategoryToTaxonomyKey('electric')).toBeNull();
  });

  test('null → null', () => {
    expect(fuelCategoryToTaxonomyKey(null)).toBeNull();
  });

  test('unknown → null', () => {
    expect(fuelCategoryToTaxonomyKey('unknown')).toBeNull();
  });
});
