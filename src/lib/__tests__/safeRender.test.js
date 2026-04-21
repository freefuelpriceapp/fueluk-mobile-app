const { toRenderableString } = require('../safeRender');

describe('toRenderableString', () => {
  test('nullish → empty string', () => {
    expect(toRenderableString(null)).toBe('');
    expect(toRenderableString(undefined)).toBe('');
  });

  test('strings pass through', () => {
    expect(toRenderableString('hello')).toBe('hello');
    expect(toRenderableString('')).toBe('');
  });

  test('numbers/booleans are coerced', () => {
    expect(toRenderableString(42)).toBe('42');
    expect(toRenderableString(0)).toBe('0');
    expect(toRenderableString(true)).toBe('true');
    expect(toRenderableString(false)).toBe('false');
  });

  test('brand enrichment object → name', () => {
    expect(toRenderableString({ name: 'BP', count: 12 })).toBe('BP');
  });

  test('object with label/value/title fallbacks', () => {
    expect(toRenderableString({ label: 'X' })).toBe('X');
    expect(toRenderableString({ value: 'Y' })).toBe('Y');
    expect(toRenderableString({ title: 'Z' })).toBe('Z');
  });

  test('brand-shaped object with brand field', () => {
    expect(toRenderableString({ brand: 'Esso' })).toBe('Esso');
  });

  test('unknown object → JSON string (never a raw object)', () => {
    const out = toRenderableString({ count: 3 });
    expect(typeof out).toBe('string');
    expect(out).toContain('3');
  });

  test('arrays coerce each element', () => {
    expect(toRenderableString(['a', 'b'])).toBe('a, b');
    expect(toRenderableString([{ name: 'BP' }, 'Shell'])).toBe('BP, Shell');
    expect(toRenderableString([])).toBe('');
  });
});
