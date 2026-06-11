/**
 * Tests for buildTrimString — the compact vehicle chip display helper.
 */
import { buildTrimString } from '../formatVehicleHeader';

describe('buildTrimString', () => {
  test('full data: Audi A3 1498cc petrol 2019', () => {
    expect(
      buildTrimString({
        make: 'AUDI',
        model: 'A3',
        engineCapacity: 1498,
        fuelType: 'PETROL',
        yearOfManufacture: 2019,
      })
    ).toBe('Audi A3 · 1.5L Petrol · 2019');
  });

  test('Range Rover Sport 5.0L petrol 2020', () => {
    expect(
      buildTrimString({
        make: 'LAND ROVER',
        model: 'RANGE ROVER SPORT',
        engineCapacity: 4951,
        fuelType: 'PETROL',
        yearOfManufacture: 2020,
      })
    ).toBe('Land Rover Range Rover Sport · 5.0L Petrol · 2020');
  });

  test('missing model — graceful', () => {
    expect(
      buildTrimString({
        make: 'AUDI',
        engineCapacity: 1498,
        fuelType: 'PETROL',
        yearOfManufacture: 2019,
      })
    ).toBe('Audi · 1.5L Petrol · 2019');
  });

  test('missing engine cc — graceful', () => {
    expect(
      buildTrimString({
        make: 'AUDI',
        model: 'A3',
        fuelType: 'PETROL',
        yearOfManufacture: 2019,
      })
    ).toBe('Audi A3 · Petrol · 2019');
  });

  test('missing year — graceful', () => {
    expect(
      buildTrimString({
        make: 'AUDI',
        model: 'A3',
        engineCapacity: 1498,
        fuelType: 'PETROL',
      })
    ).toBe('Audi A3 · 1.5L Petrol');
  });

  test('missing fuel — graceful', () => {
    expect(
      buildTrimString({
        make: 'FORD',
        model: 'FOCUS',
        engineCapacity: 1596,
        yearOfManufacture: 2018,
      })
    ).toBe('Ford Focus · 1.6L · 2018');
  });

  test('only make present', () => {
    expect(buildTrimString({ make: 'TOYOTA' })).toBe('Toyota');
  });

  test('edge case: 0cc engine — treated as no engine', () => {
    expect(
      buildTrimString({
        make: 'BMW',
        model: '320D',
        engineCapacity: 0,
        fuelType: 'DIESEL',
        yearOfManufacture: 2021,
      })
    ).toBe('BMW 320D · Diesel · 2021');
  });

  test('edge case: negative cc — treated as no engine', () => {
    expect(
      buildTrimString({
        make: 'BMW',
        model: '320D',
        engineCapacity: -100,
        fuelType: 'DIESEL',
        yearOfManufacture: 2021,
      })
    ).toBe('BMW 320D · Diesel · 2021');
  });

  test('null vehicle returns null', () => {
    expect(buildTrimString(null)).toBeNull();
  });

  test('undefined vehicle returns null', () => {
    expect(buildTrimString(undefined)).toBeNull();
  });

  test('empty object returns null (no make)', () => {
    expect(buildTrimString({})).toBeNull();
  });

  test('null make returns null', () => {
    expect(buildTrimString({ make: null, model: 'Focus' })).toBeNull();
  });

  test('snake_case field aliases work', () => {
    expect(
      buildTrimString({
        make: 'VOLKSWAGEN',
        model: 'GOLF',
        engine_capacity: 1984,
        fuel_type: 'PETROL',
        year: 2022,
      })
    ).toBe('Volkswagen Golf · 2.0L Petrol · 2022');
  });

  test('electric vehicle', () => {
    expect(
      buildTrimString({
        make: 'TESLA',
        model: 'MODEL 3',
        fuelType: 'ELECTRICITY',
        yearOfManufacture: 2023,
      })
    ).toBe('Tesla Model 3 · Electric · 2023');
  });

  test('year out of range returns null year', () => {
    const result = buildTrimString({
      make: 'FORD',
      model: 'FOCUS',
      yearOfManufacture: 1800,
    });
    expect(result).toBe('Ford Focus');
  });

  test('1.5L rounding: 1499cc → 1.5L', () => {
    const result = buildTrimString({
      make: 'AUDI',
      engineCapacity: 1499,
    });
    expect(result).toContain('1.5L');
  });

  test('5.0L rounding: 4951cc → 5.0L', () => {
    const result = buildTrimString({
      make: 'JAGUAR',
      engineCapacity: 4951,
    });
    expect(result).toContain('5.0L');
  });
});
