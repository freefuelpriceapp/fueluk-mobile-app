/**
 * Tests for src/lib/fuelTaxonomy.js
 *
 * Audit items B-04, B-05, B-11: AlertsScreen used to render `undefined` for
 * super_unleaded and premium_diesel because its local FUEL_LABELS map only
 * had keys {petrol, diesel, e10}. The taxonomy module is the single source
 * of truth that fixes that — these tests pin down the contract.
 */

const {
  FUEL_KEYS,
  FUEL_LABELS,
  BACKEND_FIELD_FOR_KEY,
  labelForFuelKey,
} = require('../fuelTaxonomy');

describe('fuelTaxonomy', () => {
  describe('FUEL_KEYS', () => {
    it('includes the four canonical consumer-facing fuel keys', () => {
      expect(FUEL_KEYS).toEqual([
        'unleaded',
        'super_unleaded',
        'diesel',
        'premium_diesel',
      ]);
    });
  });

  describe('FUEL_LABELS', () => {
    it.each([
      ['unleaded',        'Petrol'],
      ['super_unleaded',  'Premium 97/99'],
      ['diesel',          'Diesel'],
      ['premium_diesel',  'Premium Diesel'],
    ])('returns a non-empty label for %s (regression: %s rendered as undefined)', (key, expected) => {
      expect(FUEL_LABELS[key]).toBe(expected);
      expect(FUEL_LABELS[key]).not.toBe(undefined);
    });

    it('also covers legacy aliases so backend payloads never render undefined', () => {
      // The wire format may still send petrol/e10/e5/premiumDiesel — every
      // key that has shown up historically must produce a real label.
      expect(FUEL_LABELS.petrol).toBe('Petrol');
      expect(FUEL_LABELS.e10).toBeTruthy();
      expect(FUEL_LABELS.e5).toBeTruthy();
      expect(FUEL_LABELS.premiumDiesel).toBe('Premium Diesel');
    });
  });

  describe('BACKEND_FIELD_FOR_KEY', () => {
    it('maps each canonical key to the backend response field', () => {
      expect(BACKEND_FIELD_FOR_KEY.unleaded).toBe('petrol_price');
      expect(BACKEND_FIELD_FOR_KEY.super_unleaded).toBe('super_unleaded_price');
      expect(BACKEND_FIELD_FOR_KEY.diesel).toBe('diesel_price');
      expect(BACKEND_FIELD_FOR_KEY.premium_diesel).toBe('premium_diesel_price');
    });
  });

  describe('labelForFuelKey', () => {
    it('returns the canonical label for known keys', () => {
      expect(labelForFuelKey('unleaded')).toBe('Petrol');
      expect(labelForFuelKey('super_unleaded')).toBe('Premium 97/99');
      expect(labelForFuelKey('diesel')).toBe('Diesel');
      expect(labelForFuelKey('premium_diesel')).toBe('Premium Diesel');
    });

    it('falls back to a title-cased label for unknown keys (no undefined)', () => {
      expect(labelForFuelKey('hydrogen')).toBe('Hydrogen');
      expect(labelForFuelKey('cng_blend')).toBe('Cng Blend');
    });

    it('handles null/undefined defensively', () => {
      expect(labelForFuelKey(null)).toBe('');
      expect(labelForFuelKey(undefined)).toBe('');
    });
  });

  describe('AlertsScreen regression — full label coverage', () => {
    // The original AlertsScreen had:
    //   const FUEL_LABELS = { petrol: 'Petrol', diesel: 'Diesel', e10: 'E10' };
    // Anything else rendered as `undefined`. Now every taxonomy key + every
    // legacy alias must produce a non-empty label.
    const allKeysEverSeen = [
      'unleaded',
      'super_unleaded',
      'diesel',
      'premium_diesel',
      'petrol',
      'e10',
      'e5',
      'premiumDiesel',
    ];

    it.each(allKeysEverSeen)('label for %s is a non-empty string', (key) => {
      const label = labelForFuelKey(key);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toBe('undefined');
    });
  });
});
