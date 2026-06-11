/**
 * Polish Bundle v3.1 — BrandHeader: pistol-grip fuel-nozzle SVG mark.
 *
 * Verifies that BrandHeader.js uses a bespoke react-native-svg single closed
 * pistol-grip nozzle silhouette (the v3 multi-primitive version was rejected
 * by the user as a "deflated curl"; v3.1 redraws as one filled path so the
 * grip / barrel / spout read as one connected gun-shaped silhouette).
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

  test('imports react-native-svg Svg and Path', () => {
    expect(source).toContain("from 'react-native-svg'");
    expect(source).toMatch(/Svg/);
    expect(source).toMatch(/Path/);
  });

  test('LogoMark function is still present (props contract unchanged)', () => {
    expect(source).toContain('function LogoMark(');
  });

  test('LogoMark still accepts size and accent props', () => {
    expect(source).toMatch(/function LogoMark\(\s*\{\s*size/);
  });

  test('LogoMark SVG uses a single closed pistol-grip silhouette path', () => {
    // The new silhouette begins at the top-left of the barrel at M 7 9 and
    // closes the shape with Z. We check for the start coord and a Z close.
    expect(source).toMatch(/M\s*7\s+9/);
    expect(source).toMatch(/\bZ\b/);
  });

  test('LogoMark SVG includes a fuel droplet below the spout', () => {
    // Droplet is a small cubic-curve Path near the top-right of the viewBox.
    expect(source).toMatch(/droplet/i);
    expect(source).toMatch(/C\s*26\.6\s+17/);
  });

  test('LogoMark SVG includes a trigger-guard cut-out', () => {
    // Dark notch in front of the grip — communicates "trigger" cue.
    expect(source).toMatch(/trigger guard/i);
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
