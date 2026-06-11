/**
 * Polish Bundle v3 — LicencePlateChip component tests.
 *
 * Source-text inspection only (no JSX renderer in Node env).
 * Tests verify styling constants, rendering logic, and accessibility.
 */

const fs = require('fs');
const path = require('path');

const COMPONENT_PATH = path.resolve(__dirname, '../../components/LicencePlateChip.js');
const source = fs.readFileSync(COMPONENT_PATH, 'utf8');

describe('LicencePlateChip — source structure', () => {
  test('component file exists and is non-empty', () => {
    expect(source.length).toBeGreaterThan(100);
  });

  test('uses UK rear-plate yellow #FFD400', () => {
    expect(source).toContain('#FFD400');
  });

  test('uses 2px black border', () => {
    expect(source).toContain('borderWidth: 2');
    expect(source).toContain('#000000');
  });

  test('plate text uses bold fontWeight 900', () => {
    expect(source).toContain("fontWeight: '900'");
  });

  test('plate text has letter-spacing', () => {
    expect(source).toContain('letterSpacing');
  });

  test('plate text has uppercase transform', () => {
    expect(source).toContain('textTransform');
    expect(source).toContain('uppercase');
  });

  test('shows "+ ADD" for unregistered state', () => {
    expect(source).toContain('+ ADD');
  });

  test('reg is uppercased via String().toUpperCase()', () => {
    expect(source).toContain('.toUpperCase()');
  });

  test('onPress prop is used on TouchableOpacity', () => {
    expect(source).toContain('onPress');
  });

  test('press-in triggers scale animation to 0.97', () => {
    expect(source).toContain('0.97');
  });

  test('accessibility label for registered state contains "Tap to edit vehicle"', () => {
    expect(source).toContain('Tap to edit vehicle.');
  });

  test('accessibility label for unregistered state is "Add your licence plate"', () => {
    expect(source).toContain('Add your licence plate');
  });

  test('uses Animated for press scale', () => {
    expect(source).toContain('Animated');
    expect(source).toContain('useNativeDriver: true');
  });

  test('testID licence-plate-chip is present for test targeting', () => {
    expect(source).toContain('testID="licence-plate-chip"');
  });
});

// ---------------------------------------------------------------------------
// Logic tests — inline the registration logic used in the component
// ---------------------------------------------------------------------------
describe('LicencePlateChip — plate label logic', () => {
  function plateLabel(userVehicle) {
    if (!userVehicle) return '+ ADD';
    return String(userVehicle.reg || '').toUpperCase();
  }

  function a11yLabel(userVehicle) {
    if (!userVehicle) return 'Add your licence plate';
    const reg = String(userVehicle.reg || '').toUpperCase();
    return `Licence plate ${reg}. Tap to edit vehicle.`;
  }

  test('shows "+ ADD" when userVehicle is null', () => {
    expect(plateLabel(null)).toBe('+ ADD');
  });

  test('shows "+ ADD" when userVehicle is undefined', () => {
    expect(plateLabel(undefined)).toBe('+ ADD');
  });

  test('shows uppercase reg when vehicle present (lowercase input)', () => {
    expect(plateLabel({ reg: 'nj69ddf' })).toBe('NJ69DDF');
  });

  test('shows uppercase reg when vehicle present (mixed case)', () => {
    expect(plateLabel({ reg: 'Ab12Xyz' })).toBe('AB12XYZ');
  });

  test('shows uppercase reg when already uppercase', () => {
    expect(plateLabel({ reg: 'BD21SMR' })).toBe('BD21SMR');
  });

  test('accessibility label for registered vehicle includes reg', () => {
    const label = a11yLabel({ reg: 'nj69ddf' });
    expect(label).toBe('Licence plate NJ69DDF. Tap to edit vehicle.');
  });

  test('accessibility label for unregistered state', () => {
    expect(a11yLabel(null)).toBe('Add your licence plate');
  });

  test('handles empty string reg gracefully', () => {
    expect(plateLabel({ reg: '' })).toBe('');
  });
});
