/**
 * Unit tests for src/lib/prePurchaseCheck.js
 *
 * Covers every branch of scoreMotHistory plus the parser, mileage analysis,
 * advisory grouping, and the share-summary helper. The fixture mirrors the
 * shape returned by the production /api/v1/vehicles/mot endpoint.
 */

const {
  parseMotResponse,
  scoreMotHistory,
  mileageAnalysis,
  groupRecurringAdvisories,
  buildShareSummary,
  VERDICTS,
} = require('../prePurchaseCheck');

// Production-shape fixture, modelled on KR18YYP sample from the brief.
const FIXTURE_PRODUCTION = {
  registration: 'KR18YYP',
  make: 'FORD',
  model: 'FIESTA',
  firstUsedDate: '2018-04-12',
  fuelType: 'PETROL',
  primaryColour: 'Blue',
  motTests: [
    {
      completedDate: '2024-04-10T09:30:00Z',
      testResult: 'PASSED',
      expiryDate: '2025-04-09',
      odometerValue: '54000',
      odometerUnit: 'mi',
      motTestNumber: '111111111111',
      rfrAndComments: [
        { text: 'Brake pads wearing thin', type: 'ADVISORY', dangerous: false },
        { text: 'Headlamp aim slightly out', type: 'ADVISORY', dangerous: false },
      ],
    },
    {
      completedDate: '2023-04-05T11:00:00Z',
      testResult: 'PASSED',
      expiryDate: '2024-04-04',
      odometerValue: 41000,
      odometerUnit: 'mi',
      motTestNumber: '222222222222',
      rfrAndComments: [
        { text: 'Tyre tread close to limit', type: 'ADVISORY', dangerous: false },
      ],
    },
    {
      completedDate: '2022-04-02T11:00:00Z',
      testResult: 'PASSED',
      expiryDate: '2023-04-01',
      odometerValue: 28000,
      odometerUnit: 'mi',
      motTestNumber: '333333333333',
      rfrAndComments: [],
    },
  ],
};

describe('parseMotResponse', () => {
  test('returns null for nullish input', () => {
    expect(parseMotResponse(null)).toBeNull();
    expect(parseMotResponse(undefined)).toBeNull();
    expect(parseMotResponse('garbage')).toBeNull();
  });

  test('parses production fixture with newest-first ordering', () => {
    const parsed = parseMotResponse(FIXTURE_PRODUCTION);
    expect(parsed.reg).toBe('KR18YYP');
    expect(parsed.make).toBe('FORD');
    expect(parsed.year).toBe(2018);
    expect(parsed.motTests).toHaveLength(3);
    expect(parsed.motTests[0].completedDate).toBe('2024-04-10T09:30:00Z');
    expect(parsed.motTests[0].advisoryCount).toBe(2);
    expect(parsed.motTests[0].odometerValue).toBe(54000);
  });

  test('flags too-new vehicle when no MOT tests yet', () => {
    const parsed = parseMotResponse({
      registration: 'AB24CDE',
      make: 'BMW',
      model: '1 SERIES',
      firstUsedDate: '2024-01-15',
      fuelType: 'PETROL',
      primaryColour: 'Black',
      motTests: [],
    });
    expect(parsed.hasNoMot).toBe(true);
    expect(parsed.firstMotDue).toBe(new Date('2027-01-15').toISOString());
  });

  test('extracts dangerous and major counts', () => {
    const parsed = parseMotResponse({
      registration: 'AA00AAA',
      motTests: [
        {
          completedDate: '2024-01-01',
          testResult: 'FAILED',
          rfrAndComments: [
            { text: 'snapped brake line', type: 'DANGEROUS', dangerous: true },
            { text: 'corroded subframe', type: 'MAJOR', dangerous: false },
            { text: 'wiper streaking', type: 'ADVISORY', dangerous: false },
          ],
        },
      ],
    });
    const t = parsed.motTests[0];
    expect(t.dangerousCount).toBe(1);
    expect(t.majorCount).toBe(1);
    expect(t.advisoryCount).toBe(1);
  });
});

describe('mileageAnalysis', () => {
  test('returns empty when no mileage data', () => {
    const result = mileageAnalysis({ motTests: [] });
    expect(result.points).toEqual([]);
    expect(result.avgMilesPerYear).toBeNull();
    expect(result.yoyDrop).toBe(false);
  });

  test('calculates avg miles/year and no drop on production fixture', () => {
    const parsed = parseMotResponse(FIXTURE_PRODUCTION);
    const r = mileageAnalysis(parsed);
    expect(r.points).toHaveLength(3);
    expect(r.avgMilesPerYear).toBeGreaterThan(10000);
    expect(r.yoyDrop).toBe(false);
  });

  test('flags YoY drop > 1000 miles', () => {
    const parsed = parseMotResponse({
      registration: 'XX00XXX',
      motTests: [
        { completedDate: '2024-01-01', testResult: 'PASSED', odometerValue: 80000, rfrAndComments: [] },
        { completedDate: '2023-01-01', testResult: 'PASSED', odometerValue: 95000, rfrAndComments: [] },
        { completedDate: '2022-01-01', testResult: 'PASSED', odometerValue: 70000, rfrAndComments: [] },
      ],
    });
    const r = mileageAnalysis(parsed);
    expect(r.yoyDrop).toBe(true);
    expect(r.biggestDropMiles).toBe(15000);
  });
});

describe('groupRecurringAdvisories', () => {
  test('counts categories across distinct tests', () => {
    const parsed = parseMotResponse({
      registration: 'XX00XXX',
      motTests: [
        { completedDate: '2024-01-01', testResult: 'PASSED', odometerValue: 50000, rfrAndComments: [
          { text: 'Brake pads wearing thin', type: 'ADVISORY' },
          { text: 'Headlamp aim slightly out', type: 'ADVISORY' },
        ] },
        { completedDate: '2023-01-01', testResult: 'PASSED', odometerValue: 40000, rfrAndComments: [
          { text: 'brake fluid low', type: 'ADVISORY' },
        ] },
        { completedDate: '2022-01-01', testResult: 'PASSED', odometerValue: 30000, rfrAndComments: [
          { text: 'rear brake disc edge corrosion', type: 'ADVISORY' },
        ] },
      ],
    });
    const r = groupRecurringAdvisories(parsed);
    expect(r.byCategory.brakes).toBe(3);
    expect(r.recurring).toContain('brakes');
  });

  test('does not count the same category twice within one test', () => {
    const parsed = parseMotResponse({
      registration: 'XX',
      motTests: [{
        completedDate: '2024-01-01',
        testResult: 'PASSED',
        rfrAndComments: [
          { text: 'front brake pad worn', type: 'ADVISORY' },
          { text: 'rear brake disc lipping', type: 'ADVISORY' },
        ],
      }],
    });
    expect(groupRecurringAdvisories(parsed).byCategory.brakes).toBe(1);
  });
});

describe('scoreMotHistory — every branch', () => {
  test('CLEAN when no MOT history', () => {
    const r = scoreMotHistory({ motTests: [] });
    expect(r.verdict).toBe(VERDICTS.CLEAN);
  });

  test('CLEAN on tidy production fixture', () => {
    // Two advisories on latest test → tips into MINOR. Build a cleaner case.
    const parsed = parseMotResponse({
      registration: 'AA00AAA',
      firstUsedDate: '2020-01-01',
      motTests: [
        { completedDate: '2024-01-01', testResult: 'PASSED', odometerValue: 28000, rfrAndComments: [] },
        { completedDate: '2023-01-01', testResult: 'PASSED', odometerValue: 21000, rfrAndComments: [] },
        { completedDate: '2022-01-01', testResult: 'PASSED', odometerValue: 14000, rfrAndComments: [] },
      ],
    });
    const r = scoreMotHistory(parsed, { now: '2024-06-01' });
    expect(r.verdict).toBe(VERDICTS.CLEAN);
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  test('MINOR when latest test has 2+ advisories', () => {
    const parsed = parseMotResponse(FIXTURE_PRODUCTION);
    const r = scoreMotHistory(parsed, { now: '2024-06-01' });
    expect(r.verdict).toBe(VERDICTS.MINOR);
    expect(r.reasons.some((x) => x.includes('advisories'))).toBe(true);
  });

  test('MINOR when mileage variance > 50% from UK avg', () => {
    const parsed = parseMotResponse({
      registration: 'HM00HMM',
      firstUsedDate: '2019-01-01',
      motTests: [
        { completedDate: '2024-01-01', testResult: 'PASSED', odometerValue: 100000, rfrAndComments: [] },
        { completedDate: '2020-01-01', testResult: 'PASSED', odometerValue: 20000, rfrAndComments: [] },
      ],
    });
    const r = scoreMotHistory(parsed, { now: '2024-06-01' });
    expect(r.verdict).toBe(VERDICTS.MINOR);
    expect(r.reasons.some((x) => x.includes('above the UK average'))).toBe(true);
  });

  test('INVESTIGATE when there is a FAILED test in the last 24 months', () => {
    const parsed = parseMotResponse({
      registration: 'FF00FFF',
      firstUsedDate: '2018-01-01',
      motTests: [
        { completedDate: '2024-01-01', testResult: 'PASSED', odometerValue: 50000, rfrAndComments: [] },
        { completedDate: '2023-06-01', testResult: 'FAILED', odometerValue: 48000, rfrAndComments: [
          { text: 'brake disc cracked', type: 'MAJOR' },
        ] },
      ],
    });
    const r = scoreMotHistory(parsed, { now: '2024-06-01' });
    expect(r.verdict).toBe(VERDICTS.INVESTIGATE);
    expect(r.reasons.some((x) => x.toLowerCase().includes('failed'))).toBe(true);
  });

  test('INVESTIGATE when 3+ MAJORs across history', () => {
    const parsed = parseMotResponse({
      registration: 'MJ00MJM',
      firstUsedDate: '2018-01-01',
      motTests: [
        { completedDate: '2024-01-01', testResult: 'PASSED', odometerValue: 50000, rfrAndComments: [
          { text: 'major thing', type: 'MAJOR' },
        ] },
        { completedDate: '2021-01-01', testResult: 'PASSED', odometerValue: 30000, rfrAndComments: [
          { text: 'major thing', type: 'MAJOR' },
          { text: 'another major', type: 'MAJOR' },
        ] },
      ],
    });
    const r = scoreMotHistory(parsed, { now: '2024-06-01' });
    expect(r.verdict).toBe(VERDICTS.INVESTIGATE);
    expect(r.reasons.some((x) => x.includes('major defects'))).toBe(true);
  });

  test('INVESTIGATE when same advisory category recurs >=3 times', () => {
    const parsed = parseMotResponse({
      registration: 'RC00RCR',
      firstUsedDate: '2018-01-01',
      motTests: [
        { completedDate: '2024-01-01', testResult: 'PASSED', odometerValue: 50000, rfrAndComments: [
          { text: 'brake pads thin', type: 'ADVISORY' },
        ] },
        { completedDate: '2023-01-01', testResult: 'PASSED', odometerValue: 43000, rfrAndComments: [
          { text: 'brake disc edge corrosion', type: 'ADVISORY' },
        ] },
        { completedDate: '2022-01-01', testResult: 'PASSED', odometerValue: 37000, rfrAndComments: [
          { text: 'front brake pad worn', type: 'ADVISORY' },
        ] },
      ],
    });
    const r = scoreMotHistory(parsed, { now: '2024-06-01' });
    expect(r.verdict).toBe(VERDICTS.INVESTIGATE);
    expect(r.reasons.some((x) => x.toLowerCase().includes('recurring'))).toBe(true);
  });

  test('WALK_AWAY when latest MOT has DANGEROUS defect', () => {
    const parsed = parseMotResponse({
      registration: 'DD00DDD',
      firstUsedDate: '2018-01-01',
      motTests: [
        { completedDate: '2024-01-01', testResult: 'FAILED', odometerValue: 50000, rfrAndComments: [
          { text: 'brake line snapped', type: 'DANGEROUS', dangerous: true },
        ] },
      ],
    });
    const r = scoreMotHistory(parsed, { now: '2024-06-01' });
    expect(r.verdict).toBe(VERDICTS.WALK_AWAY);
    expect(r.reasons.some((x) => x.toLowerCase().includes('dangerous'))).toBe(true);
  });

  test('WALK_AWAY when mileage drop > 1000 miles', () => {
    const parsed = parseMotResponse({
      registration: 'WW00WWW',
      firstUsedDate: '2018-01-01',
      motTests: [
        { completedDate: '2024-01-01', testResult: 'PASSED', odometerValue: 60000, rfrAndComments: [] },
        { completedDate: '2023-01-01', testResult: 'PASSED', odometerValue: 80000, rfrAndComments: [] },
      ],
    });
    const r = scoreMotHistory(parsed, { now: '2024-06-01' });
    expect(r.verdict).toBe(VERDICTS.WALK_AWAY);
    expect(r.reasons.some((x) => x.toLowerCase().includes('mileage'))).toBe(true);
  });

  test('older FAIL (>24mo) does NOT trigger investigate by itself', () => {
    const parsed = parseMotResponse({
      registration: 'OL00OLD',
      firstUsedDate: '2015-01-01',
      motTests: [
        { completedDate: '2024-01-01', testResult: 'PASSED', odometerValue: 70000, rfrAndComments: [] },
        { completedDate: '2020-01-01', testResult: 'FAILED', odometerValue: 50000, rfrAndComments: [] },
        { completedDate: '2019-01-01', testResult: 'PASSED', odometerValue: 35000, rfrAndComments: [] },
      ],
    });
    const r = scoreMotHistory(parsed, { now: '2024-06-01' });
    expect(r.verdict).not.toBe(VERDICTS.INVESTIGATE);
  });
});

describe('buildShareSummary', () => {
  test('produces a multi-line plain-text summary', () => {
    const parsed = parseMotResponse(FIXTURE_PRODUCTION);
    const scored = scoreMotHistory(parsed, { now: '2024-06-01' });
    const out = buildShareSummary(parsed, scored);
    expect(out).toContain('KR18YYP');
    expect(out).toContain('FORD');
    expect(out).toContain('Verdict:');
    expect(out).toContain('DVSA');
  });

  test('returns empty string for null parsed', () => {
    expect(buildShareSummary(null, null)).toBe('');
  });
});
