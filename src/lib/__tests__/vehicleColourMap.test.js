const {
  colourFromDvla,
  colourLabelFromDvla,
  VEHICLE_COLOURS,
  DEFAULT_COLOUR,
} = require('../vehicleColourMap');

describe('colourFromDvla', () => {
  test('resolves canonical DVLA colours to hex', () => {
    expect(colourFromDvla('SILVER')).toBe(VEHICLE_COLOURS.silver);
    expect(colourFromDvla('Black')).toBe(VEHICLE_COLOURS.black);
    expect(colourFromDvla('blue')).toBe(VEHICLE_COLOURS.blue);
    expect(colourFromDvla('RED')).toBe(VEHICLE_COLOURS.red);
  });

  test('handles US spelling "gray" as alias for grey', () => {
    expect(colourFromDvla('GRAY')).toBe(VEHICLE_COLOURS.grey);
  });

  test('trims whitespace and is case-insensitive', () => {
    expect(colourFromDvla('  White  ')).toBe(VEHICLE_COLOURS.white);
    expect(colourFromDvla('bRoNzE')).toBe(VEHICLE_COLOURS.bronze);
  });

  test('returns default grey for unknown colours', () => {
    expect(colourFromDvla('CERULEAN')).toBe(DEFAULT_COLOUR);
    expect(colourFromDvla('')).toBe(DEFAULT_COLOUR);
    expect(colourFromDvla(null)).toBe(DEFAULT_COLOUR);
    expect(colourFromDvla(undefined)).toBe(DEFAULT_COLOUR);
    expect(colourFromDvla(42)).toBe(DEFAULT_COLOUR);
  });

  test('every swatch is a 7-char #RRGGBB hex', () => {
    for (const hex of Object.values(VEHICLE_COLOURS)) {
      expect(hex).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});

describe('colourLabelFromDvla', () => {
  test('title-cases known colours for screen-reader output', () => {
    expect(colourLabelFromDvla('SILVER')).toBe('Silver');
    expect(colourLabelFromDvla('blue')).toBe('Blue');
  });

  test('returns "Unknown colour" for missing / unknown input', () => {
    expect(colourLabelFromDvla('')).toBe('Unknown colour');
    expect(colourLabelFromDvla(null)).toBe('Unknown colour');
    expect(colourLabelFromDvla('CERULEAN')).toBe('Unknown colour');
  });
});
