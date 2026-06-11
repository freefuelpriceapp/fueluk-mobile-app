/**
 * Polish Bundle v3 — LicencePlateChip component tests.
 *
 * Updated in fix/header-nozzle-and-plate-chip:
 *   - placeholder is now semi-transparent "YOUR REG" (not "+ ADD")
 *   - plate is a proper UK-rear-plate rectangle (108×32)
 *   - formatUKReg() inserts a space after the age identifier (e.g.
 *     "NJ69DDF" → "NJ69 DDF") to match real plate spacing
 *
 * Source-text inspection only (no JSX renderer in Node env).
 */

const fs = require('fs');
const path = require('path');
// Import the helper from the pure-JS lib module so Jest (Node env without
// JSX) can require it without parsing the chip's JSX.
const { formatUKReg } = require('../../lib/formatUKReg');

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

  test('shows "YOUR REG" placeholder for unregistered state', () => {
    expect(source).toContain('YOUR REG');
  });

  test('placeholder uses reduced opacity (semi-transparent hint)', () => {
    expect(source).toMatch(/opacity:\s*0\.\d+/);
  });

  test('uses condensed/heavy plate-like typeface approximation', () => {
    // Charles Wright is licensed — we approximate with system condensed
    expect(source).toContain('Platform.select');
    expect(source).toMatch(/sans-serif-condensed|Helvetica/);
  });

  test('plate is a proper UK rectangle (wider than tall)', () => {
    // Real plates are ~3.4:1 to 4.7:1. We use 108×32 ≈ 3.4:1.
    expect(source).toMatch(/width:\s*108/);
    expect(source).toMatch(/height:\s*32/);
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

  test('uses Animated for press scale with native driver', () => {
    expect(source).toContain('Animated');
    expect(source).toContain('useNativeDriver: true');
  });

  test('testID licence-plate-chip is present for test targeting', () => {
    expect(source).toContain('testID="licence-plate-chip"');
  });

  test('allowFontScaling=false to keep plate proportions stable', () => {
    expect(source).toContain('allowFontScaling={false}');
  });
});

// ---------------------------------------------------------------------------
// formatUKReg() — UK plate display formatter
// ---------------------------------------------------------------------------
describe('formatUKReg', () => {
  test('inserts space after age identifier for current UK format', () => {
    expect(formatUKReg('NJ69DDF')).toBe('NJ69 DDF');
    expect(formatUKReg('AB12XYZ')).toBe('AB12 XYZ');
    expect(formatUKReg('BD21SMR')).toBe('BD21 SMR');
  });

  test('uppercases lowercase input before formatting', () => {
    expect(formatUKReg('nj69ddf')).toBe('NJ69 DDF');
    expect(formatUKReg('Ab12Xyz')).toBe('AB12 XYZ');
  });

  test('strips internal whitespace before re-formatting', () => {
    expect(formatUKReg('NJ69 DDF')).toBe('NJ69 DDF');
    expect(formatUKReg('NJ 69 DDF')).toBe('NJ69 DDF');
  });

  test('passes through non-standard plates unchanged (uppercased, no space inserted)', () => {
    expect(formatUKReg('A1')).toBe('A1');
    expect(formatUKReg('VIP123')).toBe('VIP123');
  });

  test('handles empty / null / undefined gracefully', () => {
    expect(formatUKReg('')).toBe('');
    expect(formatUKReg(null)).toBe('');
    expect(formatUKReg(undefined)).toBe('');
  });

  test('non-string input returns empty string', () => {
    expect(formatUKReg(12345)).toBe('');
    expect(formatUKReg({})).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Display logic — replicates the in-component branching
// ---------------------------------------------------------------------------
describe('LicencePlateChip — display logic', () => {
  function displayReg(userVehicle) {
    const hasVehicle = !!(userVehicle && userVehicle.reg);
    return hasVehicle ? formatUKReg(userVehicle.reg) : 'YOUR REG';
  }

  function a11yLabel(userVehicle) {
    const hasVehicle = !!(userVehicle && userVehicle.reg);
    if (!hasVehicle) return 'Add your licence plate';
    const reg = formatUKReg(userVehicle.reg);
    return `Licence plate ${reg}. Tap to edit vehicle.`;
  }

  test('shows "YOUR REG" placeholder when userVehicle is null', () => {
    expect(displayReg(null)).toBe('YOUR REG');
  });

  test('shows "YOUR REG" placeholder when userVehicle is undefined', () => {
    expect(displayReg(undefined)).toBe('YOUR REG');
  });

  test('shows "YOUR REG" when userVehicle exists but reg is empty', () => {
    expect(displayReg({ reg: '' })).toBe('YOUR REG');
    expect(displayReg({ make: 'Audi' })).toBe('YOUR REG');
  });

  test('shows formatted reg with space when vehicle present', () => {
    expect(displayReg({ reg: 'nj69ddf' })).toBe('NJ69 DDF');
    expect(displayReg({ reg: 'Ab12Xyz' })).toBe('AB12 XYZ');
  });

  test('accessibility label for registered vehicle includes formatted reg', () => {
    expect(a11yLabel({ reg: 'nj69ddf' })).toBe('Licence plate NJ69 DDF. Tap to edit vehicle.');
  });

  test('accessibility label for unregistered state', () => {
    expect(a11yLabel(null)).toBe('Add your licence plate');
    expect(a11yLabel({ reg: '' })).toBe('Add your licence plate');
  });
});
