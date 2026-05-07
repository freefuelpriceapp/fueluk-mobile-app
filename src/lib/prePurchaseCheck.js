/**
 * prePurchaseCheck.js
 *
 * Pure helpers for the DVSA G1 "Pre-purchase check" feature:
 *   - parseMotResponse(): normalises the production /api/v1/vehicles/mot
 *     response shape into a friendlier client-side model.
 *   - scoreMotHistory(): transparent rule engine that returns a verdict and
 *     a list of human-readable reasons.
 *   - mileageAnalysis(): year-over-year delta, average miles/year, drop flag.
 *   - groupRecurringAdvisories(): clusters advisory text by category.
 *   - buildShareSummary(): plain-text summary for the share sheet.
 *
 * No React, no I/O — fully unit-testable under plain Jest.
 */

const VERDICTS = Object.freeze({
  CLEAN: 'clean',
  MINOR: 'minor',
  INVESTIGATE: 'investigate',
  WALK_AWAY: 'walk_away',
});

const VERDICT_LABEL = Object.freeze({
  clean: 'Looks clean',
  minor: 'Minor concerns',
  investigate: 'Investigate before buying',
  walk_away: 'Walk away',
});

const UK_AVG_MILES_PER_YEAR = 7400;

const ADVISORY_CATEGORIES = Object.freeze({
  brakes: ['brake', 'disc', 'pad'],
  tyres: ['tyre', 'tire', 'tread'],
  suspension: ['suspension', 'shock', 'spring', 'bush'],
  lights: ['light', 'lamp', 'bulb', 'headlamp'],
  corrosion: ['corrosion', 'corroded', 'rust'],
});

function safeNum(v) {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function safeDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function yearFromIso(s) {
  const d = safeDate(s);
  return d ? d.getUTCFullYear() : null;
}

/**
 * Parse the production DVSA MOT response shape into a normalised model.
 * Returns { reg, make, model, fuelType, primaryColour, year, firstUsedDate, motTests, hasNoMot, firstMotDue }.
 *
 * Tolerates missing fields. If motTests is empty AND firstUsedDate is set, returns a hint about when the first MOT is due (3yr).
 */
function parseMotResponse(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const tests = Array.isArray(raw.motTests) ? raw.motTests.slice() : [];
  // Sort newest first by completedDate
  tests.sort((a, b) => {
    const da = safeDate(a?.completedDate)?.getTime() || 0;
    const db = safeDate(b?.completedDate)?.getTime() || 0;
    return db - da;
  });

  const normalisedTests = tests.map((t) => {
    const rfrs = Array.isArray(t?.rfrAndComments) ? t.rfrAndComments : [];
    const advisories = rfrs.filter((r) => /advisory/i.test(r?.type || ''));
    const majors = rfrs.filter((r) => /major/i.test(r?.type || ''));
    const dangerous = rfrs.filter((r) => /dangerous/i.test(r?.type || '') || r?.dangerous === true);
    return {
      completedDate: t?.completedDate || null,
      testResult: String(t?.testResult || '').toUpperCase(),
      expiryDate: t?.expiryDate || null,
      odometerValue: safeNum(t?.odometerValue),
      odometerUnit: t?.odometerUnit || 'mi',
      motTestNumber: t?.motTestNumber || null,
      rfrAndComments: rfrs,
      advisoryCount: advisories.length,
      majorCount: majors.length,
      dangerousCount: dangerous.length,
    };
  });

  const firstUsedDate = raw.firstUsedDate || null;
  const year = yearFromIso(firstUsedDate);
  let hasNoMot = false;
  let firstMotDue = null;
  if (normalisedTests.length === 0 && firstUsedDate) {
    const d = safeDate(firstUsedDate);
    if (d) {
      const due = new Date(d);
      due.setUTCFullYear(due.getUTCFullYear() + 3);
      firstMotDue = due.toISOString();
      hasNoMot = true;
    }
  }

  return {
    reg: String(raw.registration || '').toUpperCase(),
    make: raw.make || null,
    model: raw.model || null,
    fuelType: raw.fuelType || null,
    primaryColour: raw.primaryColour || null,
    firstUsedDate,
    year,
    motTests: normalisedTests,
    hasNoMot,
    firstMotDue,
  };
}

/**
 * Mileage analysis. Returns:
 *   { points: [{date, mileage}], avgMilesPerYear, yoyDrop, biggestDropMiles, variancePct }
 * yoyDrop is true when any consecutive year's mileage is more than 1000mi LOWER
 * than the previous year (clear odometer-rollback signal).
 */
function mileageAnalysis(parsed) {
  const tests = parsed?.motTests || [];
  const points = tests
    .filter((t) => t.odometerValue != null && t.completedDate)
    .map((t) => ({ date: t.completedDate, mileage: t.odometerValue }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  if (points.length === 0) {
    return { points: [], avgMilesPerYear: null, yoyDrop: false, biggestDropMiles: 0, variancePct: null };
  }
  const first = points[0];
  const last = points[points.length - 1];
  const yearsSpan = Math.max(
    (new Date(last.date) - new Date(first.date)) / (365.25 * 86400 * 1000),
    0
  );
  const totalMiles = last.mileage - first.mileage;
  const avgMilesPerYear = yearsSpan > 0 ? Math.round(totalMiles / yearsSpan) : null;
  let biggestDropMiles = 0;
  for (let i = 1; i < points.length; i += 1) {
    const delta = points[i].mileage - points[i - 1].mileage;
    if (delta < 0 && Math.abs(delta) > biggestDropMiles) {
      biggestDropMiles = Math.abs(delta);
    }
  }
  const yoyDrop = biggestDropMiles > 1000;
  const variancePct = avgMilesPerYear != null
    ? Math.round(((avgMilesPerYear - UK_AVG_MILES_PER_YEAR) / UK_AVG_MILES_PER_YEAR) * 100)
    : null;
  return { points, avgMilesPerYear, yoyDrop, biggestDropMiles, variancePct };
}

/**
 * Bucket every advisory's text into known categories, then count how often
 * each category appears across the MOT history. Returns
 * { byCategory: { brakes: 3, tyres: 1, ... }, recurring: ['brakes'] }
 * where `recurring` lists categories that appeared on >=3 distinct tests.
 */
function groupRecurringAdvisories(parsed) {
  const tests = parsed?.motTests || [];
  const counts = {};
  for (const cat of Object.keys(ADVISORY_CATEGORIES)) counts[cat] = 0;

  for (const test of tests) {
    const seenInThisTest = new Set();
    for (const rfr of test.rfrAndComments || []) {
      if (!/advisory/i.test(rfr?.type || '')) continue;
      const text = String(rfr?.text || '').toLowerCase();
      for (const [cat, keywords] of Object.entries(ADVISORY_CATEGORIES)) {
        if (seenInThisTest.has(cat)) continue;
        if (keywords.some((k) => text.includes(k))) {
          counts[cat] += 1;
          seenInThisTest.add(cat);
        }
      }
    }
  }
  const recurring = Object.entries(counts)
    .filter(([, n]) => n >= 3)
    .map(([cat]) => cat);
  return { byCategory: counts, recurring };
}

function monthsBetween(a, b) {
  if (!a || !b) return null;
  const da = safeDate(a);
  const db = safeDate(b);
  if (!da || !db) return null;
  return (db - da) / (1000 * 60 * 60 * 24 * 30.4375);
}

/**
 * Score a parsed MOT history. Returns
 *   { verdict: 'clean' | 'minor' | 'investigate' | 'walk_away',
 *     label: string, reasons: string[] }
 *
 * Rule order is highest-severity first. Reasons accumulate from all rules
 * that fire so the user can see *why* the verdict landed where it did.
 */
function scoreMotHistory(parsed, opts = {}) {
  const now = opts.now ? new Date(opts.now) : new Date();
  const tests = parsed?.motTests || [];
  if (tests.length === 0) {
    return { verdict: VERDICTS.CLEAN, label: VERDICT_LABEL.clean, reasons: ['No MOT history yet — vehicle is too new for an MOT.'] };
  }

  const reasons = [];
  let verdict = VERDICTS.CLEAN;

  const upgrade = (target) => {
    const order = [VERDICTS.CLEAN, VERDICTS.MINOR, VERDICTS.INVESTIGATE, VERDICTS.WALK_AWAY];
    if (order.indexOf(target) > order.indexOf(verdict)) verdict = target;
  };

  const latest = tests[0];
  const mileage = mileageAnalysis(parsed);
  const advGroups = groupRecurringAdvisories(parsed);

  // ─── Walk-away rules ────────────────────────────────────────────────────
  if (latest.dangerousCount > 0) {
    reasons.push(`Latest MOT recorded ${latest.dangerousCount} dangerous defect(s).`);
    upgrade(VERDICTS.WALK_AWAY);
  }
  if (mileage.yoyDrop) {
    reasons.push(`Possible mileage discrepancy: mileage dropped by ${mileage.biggestDropMiles.toLocaleString('en-GB')} miles between MOTs.`);
    upgrade(VERDICTS.WALK_AWAY);
  }

  // ─── Investigate rules ──────────────────────────────────────────────────
  const failedRecently = tests.some((t) => {
    if (t.testResult !== 'FAILED') return false;
    const m = monthsBetween(t.completedDate, now);
    return m != null && m <= 24;
  });
  if (failedRecently) {
    reasons.push('Failed MOT in the last 24 months.');
    upgrade(VERDICTS.INVESTIGATE);
  }
  const totalMajors = tests.reduce((acc, t) => acc + (t.majorCount || 0), 0);
  if (totalMajors >= 3) {
    reasons.push(`${totalMajors} major defects across MOT history.`);
    upgrade(VERDICTS.INVESTIGATE);
  }
  if (advGroups.recurring.length > 0) {
    const cat = advGroups.recurring[0];
    reasons.push(`Recurring: ${cat} flagged ${advGroups.byCategory[cat]} times across ${tests.length} MOTs.`);
    upgrade(VERDICTS.INVESTIGATE);
  }

  // ─── Minor concerns rules ───────────────────────────────────────────────
  if (latest.advisoryCount >= 2) {
    reasons.push(`${latest.advisoryCount} advisories on the most recent MOT.`);
    upgrade(VERDICTS.MINOR);
  }
  if (mileage.variancePct != null && Math.abs(mileage.variancePct) > 50) {
    const dir = mileage.variancePct > 0 ? 'above' : 'below';
    reasons.push(`Average mileage is ${Math.abs(mileage.variancePct)}% ${dir} the UK average.`);
    upgrade(VERDICTS.MINOR);
  }

  if (verdict === VERDICTS.CLEAN && reasons.length === 0) {
    reasons.push('No major issues found across the MOT history.');
  }

  return { verdict, label: VERDICT_LABEL[verdict], reasons };
}

/**
 * Plain-text summary for the share sheet. Kept short — fits in an SMS or DM.
 */
function buildShareSummary(parsed, scored) {
  if (!parsed) return '';
  const { reg, make, model, year } = parsed;
  const lines = [];
  lines.push(`Pre-purchase check — ${reg}`);
  lines.push(`${[year, make, model].filter(Boolean).join(' ')}`);
  if (scored) {
    lines.push(`Verdict: ${scored.label}`);
    for (const r of scored.reasons || []) lines.push(`  • ${r}`);
  }
  lines.push('');
  lines.push('Source: DVSA records. Always inspect in person.');
  return lines.join('\n');
}

module.exports = {
  parseMotResponse,
  scoreMotHistory,
  mileageAnalysis,
  groupRecurringAdvisories,
  buildShareSummary,
  VERDICTS,
  VERDICT_LABEL,
  UK_AVG_MILES_PER_YEAR,
  ADVISORY_CATEGORIES,
};
