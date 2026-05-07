/**
 * Snapshot tests for the vehicle detail header line — covers three realistic
 * fixtures the user is likely to see, locking in the formatted output that
 * VehicleDetailsSection / VehicleCheckScreen render.
 *
 * Plain string snapshots (the project's Jest config runs in node env without
 * react-native renderers), but they exercise the same composed string the UI
 * displays.
 */
import { formatVehicleHeader } from '../formatVehicleHeader';

const fixtures = {
  rangeRoverSport: {
    make: 'LAND ROVER',
    model: 'RANGE ROVER SPORT',
    fuelType: 'PETROL',
    engineCapacity: 4999,
    colour: 'BLUE',
    yearOfManufacture: 2016,
  },
  bmw320d: {
    make: 'BMW',
    model: '320D',
    fuelType: 'DIESEL',
    engineCapacity: 1995,
    colour: 'BLACK',
    yearOfManufacture: 2019,
  },
  teslaModel3: {
    make: 'TESLA',
    model: 'MODEL 3',
    fuelType: 'ELECTRICITY',
    engineCapacity: null,
    colour: 'WHITE',
    yearOfManufacture: 2022,
  },
};

describe('vehicle detail header — snapshots', () => {
  test('Range Rover Sport', () => {
    expect(formatVehicleHeader(fixtures.rangeRoverSport)).toMatchSnapshot();
  });

  test('BMW 320d', () => {
    expect(formatVehicleHeader(fixtures.bmw320d)).toMatchSnapshot();
  });

  test('Tesla Model 3', () => {
    expect(formatVehicleHeader(fixtures.teslaModel3)).toMatchSnapshot();
  });
});
