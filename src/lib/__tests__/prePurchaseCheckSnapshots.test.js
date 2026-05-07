/**
 * Snapshot tests for the four verdict states of the pre-purchase scoring
 * engine. We snapshot the scored object (verdict, label, reasons) — that's
 * what drives the UI, so any regression in the rule engine will trip these.
 *
 * Pure JS (no React) so they run under the existing node-only Jest config.
 */

const { parseMotResponse, scoreMotHistory } = require('../prePurchaseCheck');

const NOW = '2024-06-01T00:00:00Z';

function snap(label, raw) {
  const parsed = parseMotResponse(raw);
  const scored = scoreMotHistory(parsed, { now: NOW });
  return { label, scored };
}

describe('Pre-purchase check verdict snapshots', () => {
  test('verdict=clean — tidy 4-year MOT history', () => {
    const r = snap('clean', {
      registration: 'CL00CLN',
      firstUsedDate: '2020-01-01',
      motTests: [
        { completedDate: '2024-01-15', testResult: 'PASSED', odometerValue: 28000, rfrAndComments: [] },
        { completedDate: '2023-01-10', testResult: 'PASSED', odometerValue: 21000, rfrAndComments: [] },
        { completedDate: '2022-01-09', testResult: 'PASSED', odometerValue: 14000, rfrAndComments: [] },
      ],
    });
    expect(r).toMatchSnapshot();
  });

  test('verdict=minor — two advisories on most recent MOT', () => {
    const r = snap('minor', {
      registration: 'MN00MNR',
      firstUsedDate: '2019-06-01',
      motTests: [
        { completedDate: '2024-01-01', testResult: 'PASSED', odometerValue: 38000, rfrAndComments: [
          { text: 'Tyre tread close to limit', type: 'ADVISORY' },
          { text: 'Headlamp aim slightly out', type: 'ADVISORY' },
        ] },
        { completedDate: '2023-01-01', testResult: 'PASSED', odometerValue: 30000, rfrAndComments: [] },
      ],
    });
    expect(r).toMatchSnapshot();
  });

  test('verdict=investigate — failed MOT in last 24 months', () => {
    const r = snap('investigate', {
      registration: 'IN00IVS',
      firstUsedDate: '2017-01-01',
      motTests: [
        { completedDate: '2024-02-10', testResult: 'PASSED', odometerValue: 60000, rfrAndComments: [] },
        { completedDate: '2023-04-05', testResult: 'FAILED', odometerValue: 55000, rfrAndComments: [
          { text: 'brake disc cracked', type: 'MAJOR' },
        ] },
        { completedDate: '2022-04-05', testResult: 'PASSED', odometerValue: 48000, rfrAndComments: [] },
      ],
    });
    expect(r).toMatchSnapshot();
  });

  test('verdict=walk_away — dangerous defect on latest MOT', () => {
    const r = snap('walk_away', {
      registration: 'WA00WLK',
      firstUsedDate: '2014-01-01',
      motTests: [
        { completedDate: '2024-01-01', testResult: 'FAILED', odometerValue: 95000, rfrAndComments: [
          { text: 'brake line snapped', type: 'DANGEROUS', dangerous: true },
          { text: 'corroded subframe', type: 'MAJOR' },
        ] },
      ],
    });
    expect(r).toMatchSnapshot();
  });
});
