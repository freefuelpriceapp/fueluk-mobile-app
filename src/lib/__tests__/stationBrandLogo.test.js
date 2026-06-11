/**
 * Tests for src/lib/stationBrandLogo.js
 *
 * Covers:
 *  - resolveStationLogo resolves all 15 bundled brands (case-insensitive, with whitespace)
 *  - Returns null for unknown brands
 *  - Normalises suffix variants (Tesco Express → Tesco match, Sainsbury's Local → Sainsbury's match)
 *  - normaliseBrandKey strips apostrophes, hyphens, suffixes
 *  - BUNDLED_BRAND_KEYS contains all expected keys
 *
 * PNG assets are stubbed via jest.config.js moduleNameMapper.
 */

const {
  resolveStationLogo,
  normaliseBrandKey,
  BUNDLED_BRAND_KEYS,
} = require('../stationBrandLogo');

// ---------------------------------------------------------------------------
// normaliseBrandKey
// ---------------------------------------------------------------------------
describe('normaliseBrandKey', () => {
  test('returns empty string for null/undefined/empty', () => {
    expect(normaliseBrandKey(null)).toBe('');
    expect(normaliseBrandKey(undefined)).toBe('');
    expect(normaliseBrandKey('')).toBe('');
    expect(normaliseBrandKey('   ')).toBe('');
  });

  test('lowercases and trims', () => {
    expect(normaliseBrandKey('Shell')).toBe('shell');
    expect(normaliseBrandKey('  BP  ')).toBe('bp');
  });

  test("strips apostrophes (sainsbury's → sainsburys)", () => {
    expect(normaliseBrandKey("Sainsbury's")).toBe('sainsburys');
    expect(normaliseBrandKey('Sainsbury\u2019s')).toBe('sainsburys');
  });

  test('strips hyphens (co-op → coop)', () => {
    expect(normaliseBrandKey('Co-op')).toBe('coop');
    expect(normaliseBrandKey('Co-Op')).toBe('coop');
  });

  test('strips Express suffix', () => {
    expect(normaliseBrandKey('Tesco Express')).toBe('tesco');
  });

  test('strips Extra suffix', () => {
    expect(normaliseBrandKey('Tesco Extra')).toBe('tesco');
  });

  test('strips Local suffix', () => {
    expect(normaliseBrandKey("Sainsbury's Local")).toBe('sainsburys');
  });

  test('strips Metro suffix', () => {
    expect(normaliseBrandKey('Tesco Metro')).toBe('tesco');
  });

  test('normalises Harvest Energy (two words → one key)', () => {
    expect(normaliseBrandKey('Harvest Energy')).toBe('harvestenergy');
  });

  test('normalises Applegreen', () => {
    expect(normaliseBrandKey('Applegreen')).toBe('applegreen');
  });
});

// ---------------------------------------------------------------------------
// resolveStationLogo — all 15 bundled brands
// ---------------------------------------------------------------------------
describe('resolveStationLogo — bundled brands', () => {
  const EXPECTED_BRANDS = [
    ['Tesco',          '#00539F'],
    ["Sainsbury's",    '#F06C00'],
    ['Asda',           '#78BE20'],
    ['Morrisons',      '#007A3D'],
    ['Shell',          '#FBCE07'],
    ['BP',             '#009900'],
    ['Esso',           '#CC0000'],
    ['Texaco',         '#E31937'],
    ['Gulf',           '#F15A22'],
    ['Jet',            '#CC0000'],
    ['Murco',          '#004B8D'],
    ['Applegreen',     '#00A650'],
    ['Costco',         '#CC0033'],
    ['Co-op',          '#00B5B0'],
    ['Harvest Energy', '#FF6600'],
  ];

  test.each(EXPECTED_BRANDS)('%s resolves to a logo object with bg %s', (name, expectedBg) => {
    const result = resolveStationLogo(name);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('source');
    expect(result).toHaveProperty('bg', expectedBg);
  });

  test('resolves case-insensitively (lowercase input)', () => {
    expect(resolveStationLogo('shell')).not.toBeNull();
    expect(resolveStationLogo('TESCO')).not.toBeNull();
    expect(resolveStationLogo('bp')).not.toBeNull();
  });

  test('resolves with extra whitespace', () => {
    expect(resolveStationLogo('  Shell  ')).not.toBeNull();
    expect(resolveStationLogo(' Tesco ')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveStationLogo — suffix normalisation
// ---------------------------------------------------------------------------
describe('resolveStationLogo — suffix normalisation', () => {
  test('Tesco Express resolves to Tesco logo (bg #00539F)', () => {
    const result = resolveStationLogo('Tesco Express');
    expect(result).not.toBeNull();
    expect(result.bg).toBe('#00539F');
  });

  test('Tesco Extra resolves to Tesco logo', () => {
    const result = resolveStationLogo('Tesco Extra');
    expect(result).not.toBeNull();
    expect(result.bg).toBe('#00539F');
  });

  test("Sainsbury's Local resolves to Sainsbury's logo (bg #F06C00)", () => {
    const result = resolveStationLogo("Sainsbury's Local");
    expect(result).not.toBeNull();
    expect(result.bg).toBe('#F06C00');
  });

  test('Sainsburys Local (no apostrophe) also resolves', () => {
    const result = resolveStationLogo('Sainsburys Local');
    expect(result).not.toBeNull();
    expect(result.bg).toBe('#F06C00');
  });
});

// ---------------------------------------------------------------------------
// resolveStationLogo — unknown brands return null
// ---------------------------------------------------------------------------
describe('resolveStationLogo — unknown brands', () => {
  test('returns null for empty string', () => {
    expect(resolveStationLogo('')).toBeNull();
  });

  test('returns null for null/undefined', () => {
    expect(resolveStationLogo(null)).toBeNull();
    expect(resolveStationLogo(undefined)).toBeNull();
  });

  test('returns null for completely unknown brands', () => {
    expect(resolveStationLogo('Unknown Brand XYZ')).toBeNull();
    expect(resolveStationLogo('EV Charging Co')).toBeNull();
    expect(resolveStationLogo('Petrol Station')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// BUNDLED_BRAND_KEYS
// ---------------------------------------------------------------------------
describe('BUNDLED_BRAND_KEYS', () => {
  test('contains exactly 15 keys', () => {
    expect(BUNDLED_BRAND_KEYS).toHaveLength(15);
  });

  test('is frozen (immutable)', () => {
    expect(Object.isFrozen(BUNDLED_BRAND_KEYS)).toBe(true);
  });

  test('contains all expected normalised keys', () => {
    const expected = [
      'tesco', 'sainsburys', 'asda', 'morrisons', 'shell',
      'bp', 'esso', 'texaco', 'gulf', 'jet',
      'murco', 'applegreen', 'costco', 'coop', 'harvestenergy',
    ];
    for (const key of expected) {
      expect(BUNDLED_BRAND_KEYS).toContain(key);
    }
  });
});
