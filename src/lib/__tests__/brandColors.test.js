const { brandColor, brandShortName, BRAND_DEFAULT_COLOR } = require('../brandColors');

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

  test('empty / null returns empty string', () => {
    expect(brandShortName(null)).toBe('');
    expect(brandShortName(undefined)).toBe('');
    expect(brandShortName('')).toBe('');
  });
});
