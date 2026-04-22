const {
  extractSelectedReason,
  normaliseSelectedReason,
} = require('../selectedReason');

describe('extractSelectedReason', () => {
  test('returns null when payload is missing or malformed', () => {
    expect(extractSelectedReason(null)).toBeNull();
    expect(extractSelectedReason(undefined)).toBeNull();
    expect(extractSelectedReason('string')).toBeNull();
    expect(extractSelectedReason({})).toBeNull();
  });

  test('reads top-level selected_reason', () => {
    expect(
      extractSelectedReason({ selected_reason: 'Cheapest petrol within 5 mi' })
    ).toBe('Cheapest petrol within 5 mi');
  });

  test('falls back to best_option.selected_reason when top-level missing', () => {
    expect(
      extractSelectedReason({
        best_option: { selected_reason: 'Closest open now' },
      })
    ).toBe('Closest open now');
  });

  test('prefers top-level over nested when both present', () => {
    expect(
      extractSelectedReason({
        selected_reason: 'top',
        best_option: { selected_reason: 'nested' },
      })
    ).toBe('top');
  });

  test('ignores blank/non-string reasons', () => {
    expect(extractSelectedReason({ selected_reason: '   ' })).toBeNull();
    expect(extractSelectedReason({ selected_reason: 42 })).toBeNull();
    expect(
      extractSelectedReason({ best_option: { selected_reason: '' } })
    ).toBeNull();
  });

  test('trims surrounding whitespace', () => {
    expect(extractSelectedReason({ selected_reason: '  hello  ' })).toBe(
      'hello'
    );
  });
});

describe('normaliseSelectedReason', () => {
  test('returns null for empty / non-string / whitespace', () => {
    expect(normaliseSelectedReason(null)).toBeNull();
    expect(normaliseSelectedReason(undefined)).toBeNull();
    expect(normaliseSelectedReason('')).toBeNull();
    expect(normaliseSelectedReason('   ')).toBeNull();
    expect(normaliseSelectedReason(123)).toBeNull();
  });

  test('returns trimmed reason string when present', () => {
    expect(normaliseSelectedReason('Cheapest petrol within 5 mi')).toBe(
      'Cheapest petrol within 5 mi'
    );
    expect(normaliseSelectedReason('  Closest open now  ')).toBe(
      'Closest open now'
    );
  });
});
