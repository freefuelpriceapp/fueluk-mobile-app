const { brandToString, safeText, sanitizeStation, sanitizeStations } = require('../brand');

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

  test('extracts label / value fallbacks', () => {
    expect(brandToString({ label: 'Texaco' })).toBe('Texaco');
    expect(brandToString({ value: 'Gulf' })).toBe('Gulf');
  });

  test('returns empty string for objects without recognisable keys', () => {
    expect(brandToString({ count: 3 })).toBe('');
    expect(brandToString({})).toBe('');
  });

  test('walks arrays until it finds a usable name', () => {
    expect(brandToString([null, { name: 'Shell' }])).toBe('Shell');
    expect(brandToString([])).toBe('');
  });

  test('coerces numbers and booleans', () => {
    expect(brandToString(42)).toBe('42');
    expect(brandToString(true)).toBe('true');
  });
});

describe('safeText', () => {
  test('nullish → empty string', () => {
    expect(safeText(null)).toBe('');
    expect(safeText(undefined)).toBe('');
  });
  test('strings pass through', () => {
    expect(safeText('hello')).toBe('hello');
  });
  test('object with name/label/value → extracted', () => {
    expect(safeText({ name: 'X' })).toBe('X');
    expect(safeText({ label: 'Y' })).toBe('Y');
    expect(safeText({ value: 'Z' })).toBe('Z');
  });
  test('object without known keys → empty string (not object stringification)', () => {
    expect(safeText({ count: 5 })).toBe('');
  });
});

describe('sanitizeStation', () => {
  test('coerces brand object to string', () => {
    const input = { id: 1, name: 'Main St', brand: { name: 'BP', count: 8 } };
    const out = sanitizeStation(input);
    expect(out.brand).toBe('BP');
    expect(out.name).toBe('Main St');
    expect(out.id).toBe(1);
  });

  test('coerces name object to empty string', () => {
    const out = sanitizeStation({ id: 1, name: { name: 'x', count: 1 }, brand: 'Shell' });
    expect(out.name).toBe('x');
    expect(out.brand).toBe('Shell');
  });

  test('idempotent', () => {
    const a = sanitizeStation({ id: 1, brand: 'Shell', name: 'Test' });
    const b = sanitizeStation(a);
    expect(b).toEqual(a);
  });

  test('non-object passes through', () => {
    expect(sanitizeStation(null)).toBe(null);
    expect(sanitizeStation(undefined)).toBe(undefined);
  });
});

describe('sanitizeStations', () => {
  test('maps across array', () => {
    const out = sanitizeStations([
      { id: 1, brand: { name: 'BP', count: 2 }, name: 'A' },
      { id: 2, brand: 'Shell', name: 'B' },
    ]);
    expect(out[0].brand).toBe('BP');
    expect(out[1].brand).toBe('Shell');
  });

  test('non-array passes through', () => {
    expect(sanitizeStations(null)).toBe(null);
    expect(sanitizeStations({ foo: 1 })).toEqual({ foo: 1 });
  });
});
