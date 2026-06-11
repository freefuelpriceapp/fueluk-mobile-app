/**
 * VehicleSettingsScreen — handleManualSave must preserve DVLA identity
 *
 * Regression test for the niggle reported on Jun 11 2026:
 * After a successful "Look up" the saved-vehicle card showed
 *   "SAVED VEHICLE  NJ69DDF · Audi A3 · Unleaded  (UNLEADED · 48 mpg · dvla)"
 * but tapping "Save settings" at the bottom reverted that card to
 *   "(UNLEADED · 48 mpg · manual)"
 * with the reg / make / model dropped, because the manual-save path
 * called saveUserVehicle with only { fuel_type, mpg, source } and the
 * lib's saveUserVehicle REPLACES the stored object (it doesn't merge).
 *
 * Source-text assertions on VehicleSettingsScreen.js to lock the fix in.
 * We can't actually mount the screen in this Node-env Jest config (no JSX
 * renderer wired), so we check the structural shape of handleManualSave.
 */
const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../VehicleSettingsScreen.js'),
  'utf8'
);

describe('VehicleSettingsScreen.handleManualSave — DVLA preservation', () => {
  // Extract just the handleManualSave callback body so other handlers
  // can't accidentally satisfy the assertions.
  const startIdx = SOURCE.indexOf('const handleManualSave');
  const endIdx = SOURCE.indexOf('const handleClear', startIdx);
  expect(startIdx).toBeGreaterThan(-1);
  expect(endIdx).toBeGreaterThan(startIdx);
  const handler = SOURCE.slice(startIdx, endIdx);

  test('spreads current saved vehicle into the save payload', () => {
    // Without this spread, saveUserVehicle drops reg/make/model/year/colour
    expect(handler).toMatch(/\.\.\.\(current\s*\|\|\s*\{\}\)/);
  });

  test('preservedSource keeps "dvla" source when MPG is not overridden', () => {
    expect(handler).toMatch(/preservedSource/);
    expect(handler).toMatch(/current\s*&&\s*current\.source/);
  });

  test('source becomes "manual" only when the user actually overrides MPG', () => {
    // hasManualMpg true → 'manual'; false → preserved source
    expect(handler).toMatch(/hasManualMpg\s*\n?\s*\?\s*'manual'/);
  });

  test('current is included in the useCallback dependency array', () => {
    // Otherwise the closure captures a stale snapshot
    expect(handler).toMatch(/\[fuelType,\s*mpgInput,\s*current\]/);
  });

  test('still calls saveUserVehicle', () => {
    expect(handler).toMatch(/saveUserVehicle\s*\(/);
  });

  test('still calls setCurrent with the result', () => {
    expect(handler).toMatch(/setCurrent\(saved\)/);
  });
});
