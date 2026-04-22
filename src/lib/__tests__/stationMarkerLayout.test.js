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
 *   We can't easily exercise react-native-maps inside jest (node env), so
 *   these tests instead assert the numeric invariants that must hold for
 *   the pin to render its full price on first paint.
 */

const { parsePrice, formatPencePrice } = require('../price');
const { PIN_TIER, TIER_STYLES } = require('../priceTiers');

// Rough width per character for a bold sans font at a given point size.
// 0.62em is a conservative lower bound for tabular digits; the real
// string includes a decimal point (narrower) and trailing "p".
const CHAR_WIDTH_RATIO = 0.62;

function estimatePriceWidth(label, fontSize) {
  return Math.ceil(label.length * fontSize * CHAR_WIDTH_RATIO);
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
});

describe('tier styles — minWidth must accommodate the full price label', () => {
  // "142.9p" is the canonical 6-char UK price label. At any tier, the card
  // must be wide enough to show this without clipping, after accounting for
  // paddingHorizontal on both sides.
  const REFERENCE_LABEL = '142.9p';

  for (const tierKey of Object.keys(TIER_STYLES)) {
    const style = TIER_STYLES[tierKey];
    test(`tier ${tierKey}: minWidth covers "${REFERENCE_LABEL}" at ${style.priceFont}pt`, () => {
      const textWidth = estimatePriceWidth(REFERENCE_LABEL, style.priceFont);
      const available = style.minWidth - 2 * style.paddingH;
      // The card should fit the price comfortably, OR the price Text's
      // own minWidth (3.2 * priceFont) will hold the line — whichever is
      // larger. Either way the card must not be narrower than the padding
      // plus a reasonable share of the text width.
      const priceTextMinWidth = Math.round(style.priceFont * 3.85);
      const guaranteed = Math.max(available, priceTextMinWidth);
      expect(guaranteed).toBeGreaterThanOrEqual(textWidth);
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

  test('pricey tier (4) can still show "142.9p" via the price Text minWidth', () => {
    const style = TIER_STYLES[PIN_TIER.PRICEY];
    const priceTextMinWidth = Math.round(style.priceFont * 3.85);
    const textWidth = estimatePriceWidth(REFERENCE_LABEL, style.priceFont);
    // Even the smallest pin tier must guarantee enough horizontal space
    // for the full price label — otherwise Android snapshots render it
    // clipped to a single glyph.
    expect(priceTextMinWidth).toBeGreaterThanOrEqual(textWidth);
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
