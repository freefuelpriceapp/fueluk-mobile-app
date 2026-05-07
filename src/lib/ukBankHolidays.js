/**
 * src/lib/ukBankHolidays.js
 *
 * Static UK bank holiday calendar for 2026–2028, covering England & Wales,
 * Scotland, and Northern Ireland. Sourced from gov.uk (no runtime HTTP calls).
 *
 * Exported API:
 *   isUkBankHoliday(date, region?)  → boolean
 *   UK_BANK_HOLIDAYS_2026_2028      → { 'england-and-wales': string[], 'scotland': string[], 'northern-ireland': string[] }
 *
 * Region strings match the gov.uk API keys:
 *   'england-and-wales'  (default)
 *   'scotland'
 *   'northern-ireland'
 *
 * Audit item: C3/E7 — post-launch-backlog §E7, master_doc_audit B-03.
 * Wired into isStationOpenNow() in stationStatus.js.
 */

/**
 * 3-year static bank holiday calendar (2026–2028) sourced from gov.uk.
 *
 * England & Wales:
 *   2026: New Year's Day (1 Jan), Good Friday (3 Apr), Easter Monday (6 Apr),
 *         Early May (4 May), Spring (25 May), Summer (31 Aug),
 *         Christmas (25 Dec), Boxing Day (28 Dec — substitute for 26 Dec Sat)
 *   2027: New Year's Day (1 Jan), Good Friday (26 Mar), Easter Monday (29 Mar),
 *         Early May (3 May), Spring (31 May), Summer (30 Aug),
 *         Christmas (27 Dec — sub), Boxing Day (28 Dec — sub)
 *   2028: New Year's Day (3 Jan — sub), Good Friday (14 Apr), Easter Monday (17 Apr),
 *         Early May (1 May), Spring (29 May), Summer (28 Aug),
 *         Christmas (25 Dec), Boxing Day (26 Dec)
 *
 * Scotland has different dates: no Good Friday/Easter Monday as standard BHs,
 * has 2 Jan and St Andrew's Day (30 Nov) instead, plus Summer BH in August on
 * the first Monday.
 *
 * Northern Ireland shares England & Wales BHs plus St Patrick's Day (17 Mar)
 * and the Battle of the Boyne (12 Jul).
 */
const UK_BANK_HOLIDAYS_2026_2028 = {
  'england-and-wales': [
    // 2026
    '2026-01-01', // New Year's Day
    '2026-04-03', // Good Friday
    '2026-04-06', // Easter Monday
    '2026-05-04', // Early May bank holiday
    '2026-05-25', // Spring bank holiday
    '2026-08-31', // Summer bank holiday
    '2026-12-25', // Christmas Day
    '2026-12-28', // Boxing Day (substitute)
    // 2027
    '2027-01-01', // New Year's Day
    '2027-03-26', // Good Friday
    '2027-03-29', // Easter Monday
    '2027-05-03', // Early May bank holiday
    '2027-05-31', // Spring bank holiday
    '2027-08-30', // Summer bank holiday
    '2027-12-27', // Christmas Day (substitute)
    '2027-12-28', // Boxing Day (substitute)
    // 2028
    '2028-01-03', // New Year's Day (substitute)
    '2028-04-14', // Good Friday
    '2028-04-17', // Easter Monday
    '2028-05-01', // Early May bank holiday
    '2028-05-29', // Spring bank holiday
    '2028-08-28', // Summer bank holiday
    '2028-12-25', // Christmas Day
    '2028-12-26', // Boxing Day
  ],

  scotland: [
    // 2026
    '2026-01-01', // New Year's Day
    '2026-01-02', // 2 January
    '2026-04-03', // Good Friday
    '2026-05-04', // Early May bank holiday
    '2026-05-25', // Spring bank holiday
    '2026-08-03', // Summer bank holiday (first Monday August)
    '2026-11-30', // St Andrew's Day
    '2026-12-25', // Christmas Day
    '2026-12-28', // Boxing Day (substitute)
    // 2027
    '2027-01-01', // New Year's Day
    '2027-01-04', // 2 January (substitute — 2 Jan is Sunday)
    '2027-03-26', // Good Friday
    '2027-05-03', // Early May bank holiday
    '2027-05-31', // Spring bank holiday
    '2027-08-02', // Summer bank holiday (first Monday August)
    '2027-11-30', // St Andrew's Day
    '2027-12-27', // Christmas Day (substitute)
    '2027-12-28', // Boxing Day (substitute)
    // 2028
    '2028-01-03', // New Year's Day (substitute)
    '2028-01-04', // 2 January (substitute)
    '2028-04-14', // Good Friday
    '2028-05-01', // Early May bank holiday
    '2028-05-29', // Spring bank holiday
    '2028-08-07', // Summer bank holiday (first Monday August)
    '2028-11-30', // St Andrew's Day
    '2028-12-25', // Christmas Day
    '2028-12-26', // Boxing Day
  ],

  'northern-ireland': [
    // 2026
    '2026-01-01', // New Year's Day
    '2026-03-17', // St Patrick's Day
    '2026-04-03', // Good Friday
    '2026-04-06', // Easter Monday
    '2026-05-04', // Early May bank holiday
    '2026-05-25', // Spring bank holiday
    '2026-07-12', // Battle of the Boyne
    '2026-08-31', // Summer bank holiday
    '2026-12-25', // Christmas Day
    '2026-12-28', // Boxing Day (substitute)
    // 2027
    '2027-01-01', // New Year's Day
    '2027-03-17', // St Patrick's Day
    '2027-03-26', // Good Friday
    '2027-03-29', // Easter Monday
    '2027-05-03', // Early May bank holiday
    '2027-05-31', // Spring bank holiday
    '2027-07-12', // Battle of the Boyne
    '2027-08-30', // Summer bank holiday
    '2027-12-27', // Christmas Day (substitute)
    '2027-12-28', // Boxing Day (substitute)
    // 2028
    '2028-01-03', // New Year's Day (substitute)
    '2028-03-17', // St Patrick's Day
    '2028-04-14', // Good Friday
    '2028-04-17', // Easter Monday
    '2028-05-01', // Early May bank holiday
    '2028-05-29', // Spring bank holiday
    '2028-07-12', // Battle of the Boyne
    '2028-08-28', // Summer bank holiday
    '2028-12-25', // Christmas Day
    '2028-12-26', // Boxing Day
  ],
};

/**
 * Build a Set<string> for O(1) lookup per region.
 * @type {Object.<string, Set<string>>}
 */
const _bankHolidaySets = {};
for (const region of Object.keys(UK_BANK_HOLIDAYS_2026_2028)) {
  _bankHolidaySets[region] = new Set(UK_BANK_HOLIDAYS_2026_2028[region]);
}

/**
 * Check whether a given date is a UK bank holiday for the specified region.
 *
 * @param {Date|string} date  A Date object or ISO string (e.g. '2026-04-06')
 * @param {string} [region]   One of 'england-and-wales', 'scotland',
 *                            'northern-ireland'. Defaults to 'england-and-wales'.
 * @returns {boolean}
 */
function isUkBankHoliday(date, region = 'england-and-wales') {
  if (date == null) return false;

  let isoDate;
  if (date instanceof Date) {
    // Use UTC date components — callers should pass a date whose UTC
    // YYYY-MM-DD matches the calendar date they are testing.
    // stationStatus.js passes a Date built from London-zoned components so
    // we convert to the local YYYY-MM-DD using getFullYear/Month/Day in UTC.
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    isoDate = `${y}-${m}-${d}`;
  } else if (typeof date === 'string') {
    // Extract the YYYY-MM-DD portion (handles both '2026-04-06' and ISO
    // datetime strings like '2026-04-06T10:00:00Z').
    isoDate = String(date).slice(0, 10);
  } else {
    return false;
  }

  const set = _bankHolidaySets[region];
  if (!set) {
    // Unknown region — fail safe (return false rather than throw).
    return false;
  }
  return set.has(isoDate);
}

module.exports = {
  UK_BANK_HOLIDAYS_2026_2028,
  isUkBankHoliday,
};
