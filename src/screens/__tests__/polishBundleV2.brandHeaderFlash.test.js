/**
 * Polish Bundle v2 — BrandHeader: lightning bolt icon swap verification.
 *
 * Verifies that BrandHeader.js no longer references the old custom fuel-drop
 * SVG body and that the Ionicons "flash" glyph is now present.
 * Done via source-text inspection (no JSX renderer available in Node env).
 */

const fs = require('fs');
const path = require('path');

const BRAND_HEADER_PATH = path.resolve(__dirname, '../../components/BrandHeader.js');
const source = fs.readFileSync(BRAND_HEADER_PATH, 'utf8');

describe('BrandHeader — LogoMark lightning bolt (Item 2)', () => {
  test('source file references Ionicons "flash" icon', () => {
    expect(source).toContain('"flash"');
  });

  test('source file imports Ionicons from @expo/vector-icons', () => {
    expect(source).toContain("from '@expo/vector-icons'");
    expect(source).toMatch(/Ionicons/);
  });

  test('LogoMark function is still present (props contract unchanged)', () => {
    expect(source).toContain('function LogoMark(');
  });

  test('LogoMark still accepts size and accent props', () => {
    // The function signature should include size and accent
    expect(source).toMatch(/function LogoMark\(\s*\{\s*size/);
  });

  test('outer pulse halo animation logic is still present (unchanged)', () => {
    // The pulse halo uses haloScale and haloOpacity animated values
    expect(source).toContain('haloScale');
    expect(source).toContain('haloOpacity');
  });

  test('accent + 22 halo backdrop is used in LogoMark', () => {
    // The circle with accent + '22' background is the halo backdrop
    expect(source).toContain("accent + '22'");
  });

  test('old fuel-drop custom shapes are removed from LogoMark', () => {
    // The old body used borderTopLeftRadius + borderBottomLeftRadius compositing
    // with a nested pin circle — those specific transforms are gone
    expect(source).not.toContain('rotate: \'-12deg\'');
  });
});
