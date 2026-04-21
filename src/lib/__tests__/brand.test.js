const { brandToString } = require('../brand');

describe('brandToString', () => {
  test('returns empty string for nullish', () => {
    expect(brandToString(null)).toBe('');
    expect(brandToString(undefined)).toBe('');
  });

  test('passes strings through', () => {
    expect(brandToString('Shell')).toBe('Shell');
    expect(brandToString('')).toBe('');
  });

  test('extracts name from { name, count } shape', () => {
    expect(brandToString({ name: 'BP', count: 12 })).toBe('BP');
  });

  test('extracts brand field from enrichment object', () => {
    expect(brandToString({ brand: 'Esso', avgPpl: 140 })).toBe('Esso');
  });

  test('returns empty string for objects without name/brand', () => {
    expect(brandToString({ count: 3 })).toBe('');
    expect(brandToString({})).toBe('');
  });

  test('coerces numbers and booleans', () => {
    expect(brandToString(42)).toBe('42');
    expect(brandToString(true)).toBe('true');
  });
});
