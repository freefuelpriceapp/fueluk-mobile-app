/**
 * Polish Bundle v3 — BrandHeader: bespoke fuel-nozzle SVG mark verification.
 *
 * Verifies that BrandHeader.js no longer references the stock Ionicons "flash"
 * glyph (removed in v3) and now uses a bespoke react-native-svg nozzle path.
 * Done via source-text inspection (no JSX renderer available in Node env).
 */

const fs = require('fs');
const path = require('path');

const BRAND_HEADER_PATH = path.resolve(__dirname, '../../components/BrandHeader.js');
const source = fs.readFileSync(BRAND_HEADER_PATH, 'utf8');

describe('BrandHeader — LogoMark bespoke SVG nozzle (v3)', () => {
  test('stock Ionicons "flash" glyph is no longer used in LogoMark', () => {
    // The flash glyph was the v2 placeholder; v3 replaces it with bespoke SVG
    expect(source).not.toContain('"flash"');
  });

  test('imports react-native-svg Svg, Path, Circle', () => {
    expect(source).toContain("from 'react-native-svg'");
    expect(source).toMatch(/Svg/);
    expect(source).toMatch(/Path/);
    expect(source).toMatch(/Circle/);
  });

  test('LogoMark function is still present (props contract unchanged)', () => {
    expect(source).toContain('function LogoMark(');
  });

  test('LogoMark still accepts size and accent props', () => {
    expect(source).toMatch(/function LogoMark\(\s*\{\s*size/);
  });

  test('LogoMark SVG uses a bespoke path (fuel nozzle handle line)', () => {
    // Handle: vertical stroke M12 22 L12 10
    expect(source).toContain('M12 22 L12 10');
  });

  test('LogoMark SVG includes spark Circle element', () => {
    // Spark dot at tip of nozzle: cx=28 cy=7
    expect(source).toContain('cx="28"');
    expect(source).toContain('cy="7"');
  });

  test('outer pulse halo animation logic is still present (unchanged)', () => {
    expect(source).toContain('haloScale');
    expect(source).toContain('haloOpacity');
  });

  test('accent + 22 halo backdrop is used in LogoMark', () => {
    expect(source).toContain("accent + '22'");
  });

  test('accessibility label FuelUK is present on LogoMark wrapper', () => {
    expect(source).toContain('accessibilityLabel="FuelUK"');
  });

  test('AmbientParticles import has been removed from BrandHeader', () => {
    expect(source).not.toContain("AmbientParticles");
  });

  test('enableParticles prop has been removed from BrandHeader', () => {
    expect(source).not.toContain('enableParticles');
  });
});
