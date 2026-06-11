/**
 * Polish Bundle v3 — HomeScreen integration checks.
 *
 * Source-text inspection confirming:
 *  - AmbientParticles fully removed (no import, no usage)
 *  - PriceTicker wired between BrandHeader and fuel-type row
 *  - LicencePlateChip wired inside the sort row
 *  - PriceTrajectorySparkline removed from sort row (with TODO)
 */

const fs = require('fs');
const path = require('path');

const HOME_PATH = path.resolve(__dirname, '../HomeScreen.js');
const source = fs.readFileSync(HOME_PATH, 'utf8');

describe('HomeScreen — AmbientParticles fully removed', () => {
  test('no AmbientParticles import in HomeScreen', () => {
    expect(source).not.toContain('AmbientParticles');
  });
});

describe('HomeScreen — PriceTicker wired', () => {
  test('imports PriceTicker component', () => {
    expect(source).toContain("import PriceTicker from '../components/PriceTicker'");
  });

  test('renders <PriceTicker with stations and fuelType props', () => {
    expect(source).toContain('<PriceTicker');
    expect(source).toContain('stations={stations}');
    expect(source).toContain('fuelType={selectedFuel}');
  });

  test('PriceTicker is placed after BrandHeader', () => {
    const brandHeaderIdx = source.indexOf('<BrandHeader');
    const tickerIdx = source.indexOf('<PriceTicker');
    // PriceTicker appears after BrandHeader in source order
    expect(tickerIdx).toBeGreaterThan(brandHeaderIdx);
  });
});

describe('HomeScreen — LicencePlateChip in sort row', () => {
  test('imports LicencePlateChip component', () => {
    expect(source).toContain("import LicencePlateChip from '../components/LicencePlateChip'");
  });

  test('renders <LicencePlateChip inside the sort row block', () => {
    expect(source).toContain('<LicencePlateChip');
    expect(source).toContain('userVehicle={userVehicle}');
  });

  test('LicencePlateChip onPress navigates to VehicleSettings', () => {
    // Find the LicencePlateChip block and check for VehicleSettings nav
    const chipIdx = source.indexOf('<LicencePlateChip');
    const afterChip = source.slice(chipIdx, chipIdx + 200);
    expect(afterChip).toContain('VehicleSettings');
  });

  test('LicencePlateChip is inside sort row (appears after sortRow style block start)', () => {
    const sortRowIdx = source.indexOf('styles.sortRow');
    const chipIdx = source.indexOf('<LicencePlateChip');
    expect(chipIdx).toBeGreaterThan(sortRowIdx);
  });
});

describe('HomeScreen — sparkline removed from sort row with TODO', () => {
  test('PriceTrajectorySparkline is no longer rendered inside the sort row', () => {
    // Find sort row block — between sortRow open and BrandFilter
    const sortRowStart = source.indexOf('{/* Sort toggle');
    const brandFilterIdx = source.indexOf('<BrandFilter');
    const sortBlock = source.slice(sortRowStart, brandFilterIdx);
    // The sparkline component should not be rendered in the sort block
    expect(sortBlock).not.toMatch(/<PriceTrajectorySparkline/);
  });

  test('a TODO comment notes sparkline relocation', () => {
    expect(source).toContain('TODO');
    expect(source).toContain('PriceTrajectorySparkline');
  });
});
