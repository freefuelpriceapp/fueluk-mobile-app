const { describePersonalisation } = require('../personalisation');

describe('describePersonalisation', () => {
  test('returns null for null/invalid input', () => {
    expect(describePersonalisation(null)).toBeNull();
    expect(describePersonalisation(undefined)).toBeNull();
    expect(describePersonalisation('bad')).toBeNull();
    expect(describePersonalisation({})).toBeNull();
  });

  test('full DVLA shape: year + make + fuel + mpg + dvla source', () => {
    const d = describePersonalisation({
      year: 2022,
      make: 'mercedes',
      fuel_type: 'e10',
      mpg: 45,
      mpg_source: 'dvla',
    });
    expect(d.present).toBe(true);
    expect(d.headline).toBe('Personalised to your 2022 Mercedes');
    expect(d.detail).toBe('E10 · 45 mpg');
    expect(d.verifiedMpg).toBe(true);
    expect(d.defaultMpg).toBe(false);
    expect(d.accessibilityLabel).toContain('Personalised to your 2022 Mercedes');
    expect(d.accessibilityLabel).toContain('verified from DVLA');
  });

  test('manual shape without year', () => {
    const d = describePersonalisation({
      make: 'Ford',
      fuel_type: 'diesel',
      mpg: 55,
      source: 'manual',
    });
    expect(d.headline).toBe('Personalised to your Ford');
    expect(d.detail).toBe('Diesel · 55 mpg');
    expect(d.verifiedMpg).toBe(false);
  });

  test('default mpg source labels as "UK average mpg"', () => {
    const d = describePersonalisation({
      fuel_type: 'e10',
      mpg: 45,
      mpg_source: 'default_e10',
    });
    expect(d.defaultMpg).toBe(true);
    expect(d.detail).toBe('E10 · UK average mpg');
    expect(d.headline).toBe('Personalised for E10');
  });

  test('fuel only — still returns a usable chip', () => {
    const d = describePersonalisation({ fuel_type: 'petrol' });
    expect(d.present).toBe(true);
    expect(d.headline).toBe('Personalised for Petrol');
    expect(d.detail).toBe('Petrol');
  });

  test('make only', () => {
    const d = describePersonalisation({ make: 'bmw' });
    expect(d.headline).toBe('Personalised to your Bmw');
    expect(d.detail).toBeNull();
  });

  test('mpg only', () => {
    const d = describePersonalisation({ mpg: 42.7 });
    expect(d.present).toBe(true);
    expect(d.detail).toBe('43 mpg');
  });

  test('empty strings treated as absent', () => {
    expect(describePersonalisation({
      make: '',
      fuel_type: '   ',
      year: '',
    })).toBeNull();
  });

  test('non-finite mpg ignored', () => {
    const d = describePersonalisation({
      make: 'Ford',
      mpg: NaN,
    });
    expect(d.detail).toBeNull();
    expect(d.headline).toBe('Personalised to your Ford');
  });

  test('fuel normalisation handles b7 → Diesel', () => {
    const d = describePersonalisation({ fuel_type: 'b7', mpg: 50 });
    expect(d.detail).toBe('Diesel · 50 mpg');
  });
});
