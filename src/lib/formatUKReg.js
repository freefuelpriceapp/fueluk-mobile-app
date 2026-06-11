/**
 * formatUKReg.js
 *
 * Pure helper extracted from LicencePlateChip so it can be unit-tested in a
 * plain Node Jest environment (the chip file uses JSX, which our test-only
 * Babel config does not parse).
 *
 * Format a raw reg into the standard UK display form with a space between
 * the area code + age identifier and the random letters (e.g. "NJ69DDF"
 * → "NJ69 DDF"). Falls back to the original (uppercased, whitespace-
 * stripped) string if it doesn't match the current UK reg pattern, so
 * historic / personalised plates still render cleanly.
 */
function formatUKReg(reg) {
  if (!reg || typeof reg !== 'string') return '';
  const compact = reg.toUpperCase().replace(/\s+/g, '');
  // Current UK format: 2 letters, 2 digits, 3 letters (e.g. NJ69DDF)
  const m = compact.match(/^([A-Z]{2}\d{2})([A-Z]{3})$/);
  if (m) return `${m[1]} ${m[2]}`;
  return compact;
}

module.exports = { formatUKReg };
