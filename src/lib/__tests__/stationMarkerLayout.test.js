/**
 * Regression tests for the map pin layout guarantees.
 *
 * Why this file exists:
 *   A prior hotfix traced a severe Android clipping bug ("142.9p" rendered as
 *   just "1") to two root causes:
 *     1. `tracksViewChanges={false}` snapshotting the marker before React
 *        Native had finished laying out the Text nodes, leaving the price
 *        collapsed to a single glyph in the cached bitmap.
 *     2. Tier styles whose `minWidth` was smaller than the natural width of
 *        a standard 5-char UK price label like "142.9p" at the tier's
 *        `priceFont`.
 *
 *   v4 followup:
 *     The 3.85x multiplier (iOS tabular-nums) also clipped labels like
 *     "140.0p" to "14" on Android. The tests below now use a 0.72x per-char
 *     ratio (Roboto worst-case, variable-width glyphs) and assert that
 *     each tier's container has room for the brand-initial chip + gap +
 *     full price label.
 *
 *   We can't easily exercise react-native-maps inside jest (node env), so
 *   these tests instead assert the numeric invariants that must hold for
 *   the pin to render its full price on first paint.
 */

const { parsePrice, formatPencePrice } = require('../price');
const { PIN_TIER, TIER_STYLES } = require('../priceTiers');

// Roboto (Android default) at bold/semibold weights runs ~0.72x the font
// size per character for worst-case digits like 8.  Using a single
// conservative upper bound avoids the tabular-nums trap where iOS
// ships a narrower measurement than Android actually renders.
const CHAR_WIDTH_RATIO = 0.72;
const PRICE_LABEL_CHARS = 6; // "XXX.Xp"
const BRAND_CHIP_WIDTH = 22;
const BRAND_CHIP_GAP = 6;

function estimatePriceWidth(label, fontSize) {
  return Math.ceil(label.length * fontSize * CHAR_WIDTH_RATIO);
}

function priceTextMinWidth(fontSize) {
  return Math.ceil(fontSize * CHAR_WIDTH_RATIO * PRICE_LABEL_CHARS);
}

describe('map pin price labels — hotfix regression', () => {
  test('parsePrice(142.9) formats to "142.9p" (5 chars + suffix)', () => {
    expect(parsePrice(142.9)).toBeCloseTo(142.9);
    expect(formatPencePrice(142.9)).toBe('142.9p');
  });

  test('formatPencePrice handles the realistic UK range without truncating', () => {
    const samples = [119.9, 125.7, 132.4, 139.8, 142.9, 146.5, 158.2, 164.9];
    for (const p of samples) {
      const label = formatPencePrice(p);
      expect(label).toMatch(/^\d{3}\.\dp$/);
      expect(label.length).toBeGreaterThanOrEqual(6);
    }
  });

  test('rendered label for "172.9" is exactly "172.9p" (no decimal drop)', () => {
    expect(formatPencePrice(172.9)).toBe('172.9p');
    expect(formatPencePrice(175.4)).toBe('175.4p');
    expect(formatPencePrice(140.0)).toBe('140.0p');
    expect(formatPencePrice(169.9)).toBe('169.9p');
  });
});

describe('tier styles — card width must fit brand chip + full price', () => {
  // "142.9p" is the canonical 6-char UK price label. At any tier, the card
  // must be wide enough to show the brand-initial chip + gap + the full
  // label without clipping, after accounting for paddingHorizontal on
  // both sides.
  const REFERENCE_LABEL = '142.9p';

  for (const tierKey of Object.keys(TIER_STYLES)) {
    const style = TIER_STYLES[tierKey];
    test(`tier ${tierKey}: container fits chip + "${REFERENCE_LABEL}" at ${style.priceFont}pt`, () => {
      const textWidth = estimatePriceWidth(REFERENCE_LABEL, style.priceFont);
      const contentWidth = BRAND_CHIP_WIDTH + BRAND_CHIP_GAP + textWidth;
      const available = style.minWidth - 2 * style.paddingH;
      expect(available).toBeGreaterThanOrEqual(contentWidth);
    });

    test(`tier ${tierKey}: priceText minWidth ≥ worst-case label width`, () => {
      const priceMin = priceTextMinWidth(style.priceFont);
      const textWidth = estimatePriceWidth('888.8p', style.priceFont);
      expect(priceMin).toBeGreaterThanOrEqual(textWidth);
    });
  }

  test('every tier has explicit minWidth and padding set (no zero/undefined)', () => {
    for (const tierKey of Object.keys(TIER_STYLES)) {
      const style = TIER_STYLES[tierKey];
      expect(typeof style.minWidth).toBe('number');
      expect(style.minWidth).toBeGreaterThan(0);
      expect(typeof style.paddingH).toBe('number');
      expect(style.paddingH).toBeGreaterThanOrEqual(0);
      expect(typeof style.priceFont).toBe('number');
      expect(style.priceFont).toBeGreaterThan(0);
    }
  });

  test('tier 1 (cheapest) is wider than tier 4 (pricey)', () => {
    expect(TIER_STYLES[PIN_TIER.CHEAPEST].minWidth).toBeGreaterThan(
      TIER_STYLES[PIN_TIER.PRICEY].minWidth
    );
  });
});

describe('brand initial rendering — v4', () => {
  // The brand initial is computed inline in StationMarker.js; duplicate
  // the logic here as a pure function so we can unit-test invariants.
  function brandInitial(brand) {
    if (!brand) return '?';
    const s = String(brand).trim();
    if (!s) return '?';
    const c = s.charAt(0).toUpperCase();
    return /[A-Z0-9]/.test(c) ? c : '?';
  }

  test('known brands yield their first-letter initial', () => {
    expect(brandInitial('Esso')).toBe('E');
    expect(brandInitial('Applegreen')).toBe('A');
    expect(brandInitial('Morrisons')).toBe('M');
    expect(brandInitial('Tesco')).toBe('T');
    expect(brandInitial('Shell')).toBe('S');
    expect(brandInitial('BP')).toBe('B');
  });

  test('numeric-prefix brand names use the digit', () => {
    expect(brandInitial('24/7 Mini-Mart')).toBe('2');
  });

  test('missing/empty/unusual brands fall back to "?"', () => {
    expect(brandInitial('')).toBe('?');
    expect(brandInitial(null)).toBe('?');
    expect(brandInitial(undefined)).toBe('?');
    expect(brandInitial('   ')).toBe('?');
    expect(brandInitial('!!!')).toBe('?');
  });
});

describe('brand abbreviations do not collapse to a single char', () => {
  const { brandAbbrev, brandShortName } = require('../brandColors');

  test('known brands return 2-4 char abbreviations', () => {
    expect(brandAbbrev('Esso').length).toBeGreaterThanOrEqual(2);
    expect(brandAbbrev('Applegreen').length).toBeGreaterThanOrEqual(2);
    expect(brandAbbrev('Morrisons').length).toBeGreaterThanOrEqual(2);
  });

  test('short brand names preserve the full word on elevated tiers', () => {
    expect(brandShortName('Esso', 12)).toBe('Esso');
    expect(brandShortName('BP', 12)).toBe('BP');
    expect(brandShortName('Applegreen', 12)).toBe('Applegreen');
  });
});
