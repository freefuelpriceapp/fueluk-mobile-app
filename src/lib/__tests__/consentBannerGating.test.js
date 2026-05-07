/**
 * consentBannerGating.test.js
 *
 * Replicates the visibility predicate used in App.js to ensure the banner
 * shows ONLY when:
 *   - the FEATURE_CONSENT_BANNER flag is true, AND
 *   - the user has finished the permission gate, AND
 *   - the resolved consent status is 'unset' or 'expired'.
 */

const { resolveStatus, buildGrantRecord, buildDeclineRecord } = require('../consent');

function bannerShouldShow({ flagOn, permissionChecked, showPermissionGate, record, now = Date.now() }) {
  const status = resolveStatus(record, now);
  return (
    flagOn === true &&
    permissionChecked === true &&
    showPermissionGate === false &&
    (status === 'unset' || status === 'expired')
  );
}

describe('consent banner visibility', () => {
  const baseEnv = { permissionChecked: true, showPermissionGate: false };

  test('hidden while flag is OFF (launch state)', () => {
    expect(
      bannerShouldShow({ ...baseEnv, flagOn: false, record: null })
    ).toBe(false);
  });

  test('hidden until permission gate is dismissed', () => {
    expect(
      bannerShouldShow({
        flagOn: true,
        permissionChecked: false,
        showPermissionGate: true,
        record: null,
      })
    ).toBe(false);
  });

  test('shown with flag on + no consent record', () => {
    expect(
      bannerShouldShow({ ...baseEnv, flagOn: true, record: null })
    ).toBe(true);
  });

  test('hidden once user grants', () => {
    expect(
      bannerShouldShow({
        ...baseEnv,
        flagOn: true,
        record: buildGrantRecord(new Date('2026-05-07T00:00:00Z')),
        now: Date.parse('2026-05-08T00:00:00Z'),
      })
    ).toBe(false);
  });

  test('hidden once user declines (within TTL)', () => {
    expect(
      bannerShouldShow({
        ...baseEnv,
        flagOn: true,
        record: buildDeclineRecord(new Date('2026-05-07T00:00:00Z')),
        now: Date.parse('2026-05-08T00:00:00Z'),
      })
    ).toBe(false);
  });

  test('shown again after the 12-month consent expires', () => {
    expect(
      bannerShouldShow({
        ...baseEnv,
        flagOn: true,
        record: buildGrantRecord(new Date('2026-01-01T00:00:00Z')),
        now: Date.parse('2027-06-01T00:00:00Z'),
      })
    ).toBe(true);
  });
});
