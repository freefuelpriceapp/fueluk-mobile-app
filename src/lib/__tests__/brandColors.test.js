const { brandColor, brandShortName, brandAbbrev, BRAND_DEFAULT_COLOR } = require('../brandColors');

describe('brandColor', () => {
  test('returns exact hex for known brands', () => {
    expect(brandColor('BP')).toBe('#00914C');
    expect(brandColor('Shell')).toBe('#FCC515');
    expect(brandColor('Tesco')).toBe('#00539F');
    expect(brandColor('Asda')).toBe('#7DC242');
    expect(brandColor('Morrisons')).toBe('#FDD600');
    expect(brandColor('Esso')).toBe('#EE1C25');
    expect(brandColor('Jet')).toBe('#E10600');
    expect(brandColor('Texaco')).toBe('#C8102E');
    expect(brandColor('Applegreen')).toBe('#6BBE45');
    expect(brandColor('Costco')).toBe('#E31837');
    expect(brandColor('Gulf')).toBe('#F37021');
    expect(brandColor('Valero')).toBe('#0033A0');
    expect(brandColor('Murco')).toBe('#E30613');
    expect(brandColor('Harvest')).toBe('#4A90E2');
  });

  test('is case-insensitive', () => {
    expect(brandColor('bp')).toBe('#00914C');
    expect(brandColor('SHELL')).toBe('#FCC515');
    expect(brandColor('tesco')).toBe('#00539F');
  });

  test("handles Sainsbury's alias", () => {
    expect(brandColor("Sainsbury's")).toBe('#F06C00');
    expect(brandColor('Sainsburys')).toBe('#F06C00');
    expect(brandColor('sainsbury')).toBe('#F06C00');
  });

  test('EG On The Move matches Applegreen colour', () => {
    expect(brandColor('EG On The Move')).toBe('#6BBE45');
    expect(brandColor('Applegreen')).toBe('#6BBE45');
  });

  test('substring fallback finds a known token', () => {
    expect(brandColor('Shell V-Power')).toBe('#FCC515');
    expect(brandColor('Harvest Energy')).toBe('#4A90E2');
    expect(brandColor('Applegreen PLC')).toBe('#6BBE45');
  });

  test('unknown brand returns default grey', () => {
    expect(brandColor('SomeUnknownBrand')).toBe('#6B7280');
    expect(brandColor('xyz')).toBe('#6B7280');
    expect(BRAND_DEFAULT_COLOR).toBe('#6B7280');
  });

  test('null / empty returns default', () => {
    expect(brandColor(null)).toBe('#6B7280');
    expect(brandColor(undefined)).toBe('#6B7280');
    expect(brandColor('')).toBe('#6B7280');
    expect(brandColor('   ')).toBe('#6B7280');
  });
});

describe('brandShortName', () => {
  test('returns the full brand when shorter than limit', () => {
    expect(brandShortName('BP', 8)).toBe('BP');
    expect(brandShortName('Shell', 8)).toBe('Shell');
  });

  test('truncates with ellipsis when longer than limit', () => {
    expect(brandShortName('Applegreen', 8)).toBe('Applegr…');
    expect(brandShortName('EG On The Move', 8)).toBe('EG On T…');
  });

  test('accommodates 12-char max for elevated tier pins', () => {
    // Core CRITICAL case from the v3 brief: "Applegreen" must render in
    // full on cheapest/cheap pins without truncation.
    expect(brandShortName('Applegreen', 12)).toBe('Applegreen');
    expect(brandShortName("Sainsbury's", 12)).toBe("Sainsbury's");
    expect(brandShortName('Morrisons', 12)).toBe('Morrisons');
    expect(brandShortName('BP', 12)).toBe('BP');
    expect(brandShortName('Shell', 12)).toBe('Shell');
    expect(brandShortName('Tesco', 12)).toBe('Tesco');
    expect(brandShortName('ASDA', 12)).toBe('ASDA');
  });

  test('empty / null returns empty string', () => {
    expect(brandShortName(null)).toBe('');
    expect(brandShortName(undefined)).toBe('');
    expect(brandShortName('')).toBe('');
  });
});

describe('brandAbbrev', () => {
  test('returns short abbreviations for known brands', () => {
    expect(brandAbbrev('BP')).toBe('BP');
    expect(brandAbbrev('Shell')).toBe('SHL');
    expect(brandAbbrev('Tesco')).toBe('TSC');
    expect(brandAbbrev('Applegreen')).toBe('APG');
    expect(brandAbbrev('Morrisons')).toBe('MRS');
  });

  test('is case-insensitive and handles aliases', () => {
    expect(brandAbbrev('bp')).toBe('BP');
    expect(brandAbbrev("Sainsbury's")).toBe('SNS');
    expect(brandAbbrev('Sainsburys')).toBe('SNS');
    expect(brandAbbrev('EG On The Move')).toBe('EG');
  });

  test('falls back to first 3 upper-cased chars for unknown brands', () => {
    expect(brandAbbrev('Weirdbrand')).toBe('WEI');
  });

  test('empty / null returns empty string', () => {
    expect(brandAbbrev(null)).toBe('');
    expect(brandAbbrev('')).toBe('');
  });
});
