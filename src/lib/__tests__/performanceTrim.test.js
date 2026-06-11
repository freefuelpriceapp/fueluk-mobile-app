/**
 * performanceTrim — heuristic Super Unleaded prompt gating
 *
 * Validates the trim-pattern matching so we expand the E5/Super prompt to
 * known performance variants without nagging the average E10 driver.
 */
const {
  isPerformanceTrim,
  shouldShowSuperPrompt,
} = require('../performanceTrim');

describe('isPerformanceTrim — positive matches', () => {
  const PERFORMANCE_CARS = [
    { make: 'BMW',        model: 'M3' },
    { make: 'BMW',        model: '335i',  trim: 'M Sport' },
    { make: 'BMW',        model: 'M5',    trim: 'Competition' },
    { make: 'Audi',       model: 'RS3' },
    { make: 'Audi',       model: 'S3' },
    { make: 'Audi',       model: 'R8' },
    { make: 'Mercedes',   model: 'C63',   trim: 'AMG' },
    { make: 'Mercedes',   model: 'A45',   trim: 'AMG' },
    { make: 'Volkswagen', model: 'Golf',  trim: 'GTI' },
    { make: 'Volkswagen', model: 'Golf',  trim: 'R' },
    { make: 'Porsche',    model: '911',   trim: 'Carrera' },
    { make: 'Porsche',    model: '718',   trim: 'GT4' },
    { make: 'Honda',      model: 'Civic', trim: 'Type R' },
    { make: 'Hyundai',    model: 'i30',   trim: 'N' },
    { make: 'Ford',       model: 'Focus', trim: 'ST' },
    { make: 'Ford',       model: 'Focus', trim: 'RS' },
    { make: 'Ford',       model: 'Fiesta',trim: 'ST' },
    { make: 'Vauxhall',   model: 'Astra', trim: 'VXR' },
    { make: 'Mini',       model: 'Cooper',trim: 'S' },
    { make: 'Mini',       model: 'JCW' },
    { make: 'Cupra',      model: 'Leon' },
    { make: 'Renault',    model: 'Megane',trim: 'RS' },
    { make: 'Subaru',     model: 'Impreza', trim: 'WRX STI' },
    { make: 'Nissan',     model: 'GT-R' },
    { make: 'Nissan',     model: '370Z',  trim: 'Nismo' },
    { make: 'Toyota',     model: 'GR Yaris' },
    { make: 'Toyota',     model: 'Supra' },
    { make: 'Alfa Romeo', model: 'Giulia',trim: 'Quadrifoglio' },
  ];

  test.each(PERFORMANCE_CARS)('detects %p as performance', (vehicle) => {
    expect(isPerformanceTrim(vehicle)).toBe(true);
  });
});

describe('isPerformanceTrim — negative matches (the modal UK driver)', () => {
  const REGULAR_CARS = [
    { make: 'Ford',       model: 'Fiesta',  trim: '1.0 Zetec' },
    { make: 'Volkswagen', model: 'Polo',    trim: 'Match' },
    { make: 'Toyota',     model: 'Yaris',   trim: 'Icon' },
    { make: 'Audi',       model: 'A3',      trim: 'Sport' },
    { make: 'Audi',       model: 'A3',      trim: 'S-Line' }, // S-Line is trim cosmetics, not engine
    { make: 'BMW',        model: '320d',    trim: 'SE' },
    { make: 'Honda',      model: 'Jazz',    trim: 'SE' },
    { make: 'Hyundai',    model: 'i20',     trim: 'SE' },
    { make: 'Kia',        model: 'Ceed',    trim: '2' },
    { make: 'Vauxhall',   model: 'Corsa',   trim: 'SE' },
    { make: 'Mini',       model: 'One',     trim: '' },
    { make: 'Citroen',    model: 'C3',      trim: 'Feel' },
    { make: 'Peugeot',    model: '208',     trim: 'Active' },
    { make: 'Skoda',      model: 'Fabia',   trim: 'SE' },
    { make: 'Seat',       model: 'Ibiza',   trim: 'SE' },
    { make: 'Renault',    model: 'Clio',    trim: 'Iconic' },
    { make: 'Tesla',      model: 'Model 3', trim: 'Long Range' }, // EV, but corpus shouldn't false-match
  ];

  test.each(REGULAR_CARS)('does NOT flag %p as performance', (vehicle) => {
    expect(isPerformanceTrim(vehicle)).toBe(false);
  });
});

describe('isPerformanceTrim — defensive inputs', () => {
  test('null / undefined / empty vehicle returns false', () => {
    expect(isPerformanceTrim(null)).toBe(false);
    expect(isPerformanceTrim(undefined)).toBe(false);
    expect(isPerformanceTrim({})).toBe(false);
  });

  test('non-string trim fields are ignored without throwing', () => {
    expect(isPerformanceTrim({ make: 'BMW', trim: 12345 })).toBe(false);
    expect(isPerformanceTrim({ make: null, model: undefined })).toBe(false);
  });

  test('is case-insensitive', () => {
    expect(isPerformanceTrim({ make: 'audi', model: 'rs3' })).toBe(true);
    expect(isPerformanceTrim({ make: 'BMW', model: 'M3' })).toBe(true);
    expect(isPerformanceTrim({ make: 'bmw', model: 'm3' })).toBe(true);
  });
});

describe('shouldShowSuperPrompt — combined gating', () => {
  test('no vehicle profile → always show', () => {
    expect(shouldShowSuperPrompt(null)).toBe(true);
    expect(shouldShowSuperPrompt(undefined)).toBe(true);
  });

  test('pre-2002 vehicle → show (legacy E5 requirement)', () => {
    expect(shouldShowSuperPrompt({ year: 1998, make: 'Ford', model: 'Fiesta' })).toBe(true);
    expect(shouldShowSuperPrompt({ year: '1999', make: 'Mini', model: 'Cooper' })).toBe(true);
  });

  test('performance trim → show even if modern car', () => {
    expect(shouldShowSuperPrompt({ year: 2023, make: 'BMW', model: 'M3' })).toBe(true);
    expect(shouldShowSuperPrompt({ year: 2024, make: 'Honda', model: 'Civic', trim: 'Type R' })).toBe(true);
  });

  test('modern non-performance vehicle → hide (keep UI quiet)', () => {
    expect(shouldShowSuperPrompt({ year: 2019, make: 'Audi', model: 'A3' })).toBe(false);
    expect(shouldShowSuperPrompt({ year: 2022, make: 'Ford', model: 'Fiesta', trim: 'Zetec' })).toBe(false);
    expect(shouldShowSuperPrompt({ year: 2021, make: 'Toyota', model: 'Yaris' })).toBe(false);
  });

  test('monthOfFirstRegistration is parsed for the pre-2002 check', () => {
    expect(shouldShowSuperPrompt({ monthOfFirstRegistration: '1999-04', make: 'Ford', model: 'Fiesta' })).toBe(true);
    expect(shouldShowSuperPrompt({ monthOfFirstRegistration: '2019-09', make: 'Ford', model: 'Fiesta' })).toBe(false);
  });
});
