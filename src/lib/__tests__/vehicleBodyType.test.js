const {
  resolveBodyType,
  guessBodyTypeFromModel,
  normaliseBodyType,
  DEFAULT_BODY_TYPE,
} = require('../vehicleBodyType');

describe('guessBodyTypeFromModel', () => {
  test('maps common UK nameplates to the expected body type', () => {
    expect(guessBodyTypeFromModel('Golf')).toBe('hatchback');
    expect(guessBodyTypeFromModel('Fiesta')).toBe('hatchback');
    expect(guessBodyTypeFromModel('Qashqai')).toBe('suv');
    expect(guessBodyTypeFromModel('E-Class')).toBe('saloon');
    expect(guessBodyTypeFromModel('Transit')).toBe('van');
    expect(guessBodyTypeFromModel('Hilux')).toBe('pickup');
    expect(guessBodyTypeFromModel('Octavia')).toBe('estate');
  });

  test('first-token match handles trim suffixes like "3-Series Touring"', () => {
    expect(guessBodyTypeFromModel('3-Series Touring')).toBe('saloon');
    expect(guessBodyTypeFromModel('Focus ST-Line')).toBe('hatchback');
  });

  test('contains match catches "Focus estate"', () => {
    expect(guessBodyTypeFromModel('Focus Estate')).toBe('hatchback');
  });

  test('unknown model falls back to the default body type', () => {
    expect(guessBodyTypeFromModel('XYZ-9000')).toBe(DEFAULT_BODY_TYPE);
    expect(guessBodyTypeFromModel('')).toBe(DEFAULT_BODY_TYPE);
    expect(guessBodyTypeFromModel(null)).toBe(DEFAULT_BODY_TYPE);
  });

  test('is case-insensitive and trims whitespace', () => {
    expect(guessBodyTypeFromModel('  QASHQAI  ')).toBe('suv');
    expect(guessBodyTypeFromModel('golf')).toBe('hatchback');
  });
});

describe('normaliseBodyType', () => {
  test('accepts canonical body types as-is', () => {
    expect(normaliseBodyType('saloon')).toBe('saloon');
    expect(normaliseBodyType('SUV')).toBe('suv');
    expect(normaliseBodyType('Hatchback')).toBe('hatchback');
  });

  test('maps DVLA aliases to canonical types', () => {
    expect(normaliseBodyType('Sedan')).toBe('saloon');
    expect(normaliseBodyType('4x4')).toBe('suv');
    expect(normaliseBodyType('MPV')).toBe('suv');
    expect(normaliseBodyType('Cabriolet')).toBe('convertible');
    expect(normaliseBodyType('Tourer')).toBe('estate');
    expect(normaliseBodyType('truck')).toBe('pickup');
  });

  test('returns null for non-strings and unrecognised types', () => {
    expect(normaliseBodyType('rocketship')).toBeNull();
    expect(normaliseBodyType('')).toBeNull();
    expect(normaliseBodyType(null)).toBeNull();
    expect(normaliseBodyType(42)).toBeNull();
  });
});

describe('resolveBodyType', () => {
  test('prefers explicit body_type over model-name heuristic', () => {
    expect(resolveBodyType({ body_type: 'Estate', model: 'Qashqai' })).toBe('estate');
  });

  test('accepts camelCase bodyType as well', () => {
    expect(resolveBodyType({ bodyType: 'suv', model: 'Golf' })).toBe('suv');
  });

  test('falls back to model heuristic when no body type present', () => {
    expect(resolveBodyType({ model: 'Qashqai' })).toBe('suv');
  });

  test('falls back to default when vehicle is unusable', () => {
    expect(resolveBodyType(null)).toBe(DEFAULT_BODY_TYPE);
    expect(resolveBodyType(undefined)).toBe(DEFAULT_BODY_TYPE);
    expect(resolveBodyType({})).toBe(DEFAULT_BODY_TYPE);
  });
});
