import {
  formatVehicleHeader,
  formatMake,
  formatModel,
  formatEngine,
  formatFuel,
  formatColour,
} from '../formatVehicleHeader';

describe('formatMake', () => {
  test('title-cases all-caps make', () => {
    expect(formatMake('FORD')).toBe('Ford');
    expect(formatMake('VOLKSWAGEN')).toBe('Volkswagen');
  });

  test('multi-word makes use overrides', () => {
    expect(formatMake('LAND ROVER')).toBe('Land Rover');
    expect(formatMake('RANGE ROVER')).toBe('Range Rover');
    expect(formatMake('MERCEDES-BENZ')).toBe('Mercedes-Benz');
    expect(formatMake('MERCEDES BENZ')).toBe('Mercedes-Benz');
    expect(formatMake('ALFA ROMEO')).toBe('Alfa Romeo');
  });

  test('preserves all-caps acronym makes', () => {
    expect(formatMake('BMW')).toBe('BMW');
    expect(formatMake('MG')).toBe('MG');
    expect(formatMake('MINI')).toBe('MINI');
    expect(formatMake('DS')).toBe('DS');
  });

  test('returns null for empty/invalid input', () => {
    expect(formatMake(null)).toBeNull();
    expect(formatMake('')).toBeNull();
    expect(formatMake('   ')).toBeNull();
    expect(formatMake(undefined)).toBeNull();
  });
});

describe('formatModel', () => {
  test('title-cases multi-word model', () => {
    expect(formatModel('RANGE ROVER SPORT')).toBe('Range Rover Sport');
  });

  test('preserves alphanumeric trim tokens like 320D, M3', () => {
    expect(formatModel('320D')).toBe('320D');
    expect(formatModel('M3')).toBe('M3');
    expect(formatModel('A45 AMG')).toBe('A45 AMG');
  });

  test('preserves common short trim suffixes', () => {
    expect(formatModel('GOLF GTI')).toBe('Golf GTI');
    expect(formatModel('FOCUS RS')).toBe('Focus RS');
  });

  test('returns null for empty', () => {
    expect(formatModel(null)).toBeNull();
    expect(formatModel('')).toBeNull();
  });
});

describe('formatEngine', () => {
  test('converts cc to L with one decimal', () => {
    expect(formatEngine(4999)).toBe('5.0L');
    expect(formatEngine(1560)).toBe('1.6L');
    expect(formatEngine(1995)).toBe('2.0L');
    expect(formatEngine(998)).toBe('1.0L');
  });

  test('returns null for missing/zero', () => {
    expect(formatEngine(null)).toBeNull();
    expect(formatEngine(undefined)).toBeNull();
    expect(formatEngine(0)).toBeNull();
  });
});

describe('formatFuel', () => {
  test('maps known fuel types', () => {
    expect(formatFuel('PETROL')).toBe('Petrol');
    expect(formatFuel('DIESEL')).toBe('Diesel');
    expect(formatFuel('ELECTRICITY')).toBe('Electric');
    expect(formatFuel('HYBRID ELECTRIC')).toBe('Hybrid');
    expect(formatFuel('PETROL/ELECTRIC')).toBe('Hybrid');
  });

  test('returns null for missing', () => {
    expect(formatFuel(null)).toBeNull();
    expect(formatFuel('')).toBeNull();
  });
});

describe('formatColour', () => {
  test('title-cases all-caps colour', () => {
    expect(formatColour('BLUE')).toBe('Blue');
    expect(formatColour('METALLIC SILVER')).toBe('Metallic Silver');
  });
});

describe('formatVehicleHeader', () => {
  test('all fields present (preferred shape)', () => {
    const v = {
      make: 'LAND ROVER',
      model: 'RANGE ROVER SPORT',
      fuelType: 'PETROL',
      engineCapacity: 4999,
      colour: 'BLUE',
      yearOfManufacture: 2016,
    };
    expect(formatVehicleHeader(v)).toBe('Land Rover Range Rover Sport \u00B7 5.0L Petrol \u00B7 Blue \u00B7 2016');
  });

  test('model missing — drops model, keeps the rest', () => {
    const v = {
      make: 'LAND ROVER',
      model: null,
      fuelType: 'PETROL',
      engineCapacity: 4999,
      colour: 'BLUE',
      yearOfManufacture: 2016,
    };
    expect(formatVehicleHeader(v)).toBe('Land Rover \u00B7 5.0L Petrol \u00B7 Blue \u00B7 2016');
  });

  test('make-only', () => {
    expect(formatVehicleHeader({ make: 'FORD' })).toBe('Ford');
  });

  test('make + year only when engine/fuel/colour all missing', () => {
    expect(formatVehicleHeader({ make: 'LAND ROVER', yearOfManufacture: 2016 }))
      .toBe('Land Rover \u00B7 2016');
  });

  test('BMW preserves caps', () => {
    const v = {
      make: 'BMW',
      model: '320D',
      fuelType: 'DIESEL',
      engineCapacity: 1995,
      colour: 'BLACK',
      yearOfManufacture: 2019,
    };
    expect(formatVehicleHeader(v)).toBe('BMW 320D \u00B7 2.0L Diesel \u00B7 Black \u00B7 2019');
  });

  test('MG preserves caps', () => {
    expect(formatVehicleHeader({ make: 'MG', model: 'ZS' })).toBe('MG ZS');
  });

  test('MINI preserves caps', () => {
    expect(formatVehicleHeader({ make: 'MINI', model: 'COOPER' })).toBe('MINI Cooper');
  });

  test('Mercedes-Benz override', () => {
    expect(formatVehicleHeader({ make: 'MERCEDES-BENZ', model: 'A CLASS' }))
      .toBe('Mercedes-Benz A Class');
  });

  test('all-electric (ELECTRICITY)', () => {
    const v = {
      make: 'TESLA',
      model: 'MODEL 3',
      fuelType: 'ELECTRICITY',
      engineCapacity: null,
      colour: 'WHITE',
      yearOfManufacture: 2022,
    };
    expect(formatVehicleHeader(v)).toBe('Tesla Model 3 \u00B7 Electric \u00B7 White \u00B7 2022');
  });

  test('zero engine cc — engine omitted, fuel kept', () => {
    const v = {
      make: 'TESLA',
      model: 'MODEL S',
      fuelType: 'ELECTRICITY',
      engineCapacity: 0,
      yearOfManufacture: 2021,
    };
    expect(formatVehicleHeader(v)).toBe('Tesla Model S \u00B7 Electric \u00B7 2021');
  });

  test('snake_case wire fields are accepted', () => {
    const v = {
      make: 'FORD',
      model: 'FOCUS',
      fuel_type: 'PETROL',
      engine_capacity: 1560,
      color: 'RED',
      year: 2018,
    };
    expect(formatVehicleHeader(v)).toBe('Ford Focus \u00B7 1.6L Petrol \u00B7 Red \u00B7 2018');
  });

  test('future-proof: spec.variant prefers "{model} {variant}"', () => {
    const v = {
      make: 'LAND ROVER',
      model: 'RANGE ROVER SPORT',
      fuelType: 'PETROL',
      engineCapacity: 4999,
      colour: 'BLUE',
      yearOfManufacture: 2016,
      spec: { variant: 'SVR' },
    };
    expect(formatVehicleHeader(v))
      .toBe('Land Rover Range Rover Sport SVR \u00B7 5.0L Petrol \u00B7 Blue \u00B7 2016');
  });

  test('spec.variant undefined is safe (optional chaining)', () => {
    const v = {
      make: 'BMW',
      model: 'M3',
      // no spec
    };
    expect(formatVehicleHeader(v)).toBe('BMW M3');
  });

  test('returns null when make missing', () => {
    expect(formatVehicleHeader({ model: 'FOCUS' })).toBeNull();
    expect(formatVehicleHeader(null)).toBeNull();
    expect(formatVehicleHeader(undefined)).toBeNull();
    expect(formatVehicleHeader({})).toBeNull();
  });

  test('never returns empty string when make present', () => {
    const r = formatVehicleHeader({ make: 'FORD' });
    expect(typeof r).toBe('string');
    expect(r.length).toBeGreaterThan(0);
  });
});
