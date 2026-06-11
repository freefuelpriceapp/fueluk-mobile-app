/**
 * Polish Bundle v2 — StationBrandLogo component integration tests.
 *
 * Because the test environment is Node (no JSX/RN renderer), these tests
 * verify the lib integration layer that the component depends on.
 *
 * PNG assets are stubbed via jest.config.js moduleNameMapper.
 */

const {
  resolveStationLogo,
  normaliseBrandKey,
} = require('../../lib/stationBrandLogo');

describe('StationBrandLogo — lib integration (component source)', () => {
  test('Tesco yields a logo with bg colour #00539F', () => {
    const result = resolveStationLogo('Tesco');
    expect(result).not.toBeNull();
    expect(result.bg).toBe('#00539F');
    expect(result.source).toBeDefined();
  });

  test('Shell yields a logo with bg colour #FBCE07', () => {
    const result = resolveStationLogo('Shell');
    expect(result).not.toBeNull();
    expect(result.bg).toBe('#FBCE07');
  });

  test('unknown brand returns null (triggers letter-fallback path in component)', () => {
    expect(resolveStationLogo('UnknownBrandXYZ')).toBeNull();
  });

  test('undefined/null brand returns null', () => {
    expect(resolveStationLogo(undefined)).toBeNull();
    expect(resolveStationLogo('')).toBeNull();
  });

  test('component lib normalises brand names for display', () => {
    // Ensure the key used in component matches display expectation
    expect(normaliseBrandKey('Tesco Express')).toBe('tesco');
    expect(normaliseBrandKey("Sainsbury's Local")).toBe('sainsburys');
    expect(normaliseBrandKey('Co-op')).toBe('coop');
    expect(normaliseBrandKey('BP')).toBe('bp');
  });
});
