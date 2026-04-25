const {
  appendLifetimeSaving,
  summariseLifetimeSavings,
  formatLifetimeSinceDate,
  LIFETIME_MAX_ENTRIES,
  LIFETIME_SAVINGS_KEY,
} = require('../lifetimeSavings');

describe('appendLifetimeSaving', () => {
  test('returns new list — does not mutate input', () => {
    const list = [];
    const next = appendLifetimeSaving(list, { ts: 1000, saving_pence: 50 });
    expect(list.length).toBe(0);
    expect(next.length).toBe(1);
    expect(next).not.toBe(list);
  });

  test('appends valid entry', () => {
    const next = appendLifetimeSaving([], { ts: 1000, saving_pence: 200 });
    expect(next).toEqual([{ ts: 1000, saving_pence: 200 }]);
  });

  test('ignores entries with non-positive savings', () => {
    expect(appendLifetimeSaving([], { ts: 1000, saving_pence: 0 })).toEqual([]);
    expect(appendLifetimeSaving([], { ts: 1000, saving_pence: -50 })).toEqual([]);
  });

  test('ignores entries with non-finite savings', () => {
    expect(appendLifetimeSaving([], { ts: 1000, saving_pence: NaN })).toEqual([]);
    expect(appendLifetimeSaving([], { ts: 1000, saving_pence: Infinity })).toEqual([]);
    expect(appendLifetimeSaving([], { ts: 1000 })).toEqual([]);
  });

  test('ignores non-object entries', () => {
    expect(appendLifetimeSaving([], null)).toEqual([]);
    expect(appendLifetimeSaving([], 'bad')).toEqual([]);
    expect(appendLifetimeSaving([], 42)).toEqual([]);
  });

  test('falls back to non-array input gracefully', () => {
    const next = appendLifetimeSaving(null, { ts: 1, saving_pence: 50 });
    expect(next.length).toBe(1);
  });

  test('uses Date.now() default when ts omitted', () => {
    const before = Date.now();
    const next = appendLifetimeSaving([], { saving_pence: 100 });
    const after = Date.now();
    expect(next.length).toBe(1);
    expect(next[0].ts).toBeGreaterThanOrEqual(before);
    expect(next[0].ts).toBeLessThanOrEqual(after);
  });

  test('coerces ISO string ts to ms', () => {
    const next = appendLifetimeSaving([], { ts: '2026-04-12T10:00:00Z', saving_pence: 100 });
    expect(typeof next[0].ts).toBe('number');
  });

  test('coerces Date object ts to ms', () => {
    const d = new Date('2026-04-12T10:00:00Z');
    const next = appendLifetimeSaving([], { ts: d, saving_pence: 100 });
    expect(next[0].ts).toBe(d.getTime());
  });

  test('caps list at LIFETIME_MAX_ENTRIES (365)', () => {
    let list = [];
    for (let i = 0; i < LIFETIME_MAX_ENTRIES + 50; i++) {
      list = appendLifetimeSaving(list, { ts: i, saving_pence: 10 });
    }
    expect(list.length).toBe(LIFETIME_MAX_ENTRIES);
  });

  test('cap drops oldest entries first', () => {
    let list = [];
    for (let i = 0; i < LIFETIME_MAX_ENTRIES + 5; i++) {
      list = appendLifetimeSaving(list, { ts: i, saving_pence: 10 });
    }
    expect(list[0].ts).toBe(5);
    expect(list[list.length - 1].ts).toBe(LIFETIME_MAX_ENTRIES + 4);
  });

  test('storage key matches spec', () => {
    expect(LIFETIME_SAVINGS_KEY).toBe('@fueluk/lifetime_savings_v1');
  });
});

describe('summariseLifetimeSavings', () => {
  test('empty list → empty summary', () => {
    const s = summariseLifetimeSavings([]);
    expect(s.isEmpty).toBe(true);
    expect(s.totalPence).toBe(0);
    expect(s.totalPounds).toBe(0);
    expect(s.entryCount).toBe(0);
    expect(s.firstEntryTs).toBeNull();
  });

  test('non-array → empty summary', () => {
    const s = summariseLifetimeSavings(null);
    expect(s.isEmpty).toBe(true);
  });

  test('sums saving_pence across entries', () => {
    const list = [
      { ts: 1000, saving_pence: 200 },
      { ts: 2000, saving_pence: 150 },
      { ts: 3000, saving_pence: 350 },
    ];
    const s = summariseLifetimeSavings(list);
    expect(s.totalPence).toBe(700);
    expect(s.totalPounds).toBe(7);
  });

  test('totalPounds floors — never inflate', () => {
    const list = [
      { ts: 1000, saving_pence: 599 }, // £5.99
    ];
    const s = summariseLifetimeSavings(list);
    expect(s.totalPounds).toBe(5);
  });

  test('firstEntryTs is the earliest ts', () => {
    const list = [
      { ts: 5000, saving_pence: 100 },
      { ts: 1000, saving_pence: 100 },
      { ts: 9000, saving_pence: 100 },
    ];
    expect(summariseLifetimeSavings(list).firstEntryTs).toBe(1000);
  });

  test('skips invalid entries when summing', () => {
    const list = [
      { ts: 1000, saving_pence: 100 },
      { saving_pence: 'bad' },
      null,
      { ts: 2000, saving_pence: -50 },
      { ts: 3000, saving_pence: 200 },
    ];
    const s = summariseLifetimeSavings(list);
    expect(s.totalPence).toBe(300);
    expect(s.entryCount).toBe(5);
  });

  test('isEmpty true when all entries invalid', () => {
    const list = [{ saving_pence: -1 }, null, { ts: 1, saving_pence: 0 }];
    const s = summariseLifetimeSavings(list);
    expect(s.isEmpty).toBe(true);
  });
});

describe('formatLifetimeSinceDate', () => {
  test('returns "since today" when same calendar day', () => {
    const now = new Date('2026-04-25T12:00:00Z');
    const earlier = new Date('2026-04-25T01:00:00Z');
    expect(formatLifetimeSinceDate(earlier, { now })).toBe('since today');
  });

  test('returns "since 12 Apr" for april date', () => {
    const now = new Date('2026-04-25T12:00:00Z');
    const target = new Date('2026-04-12T08:00:00Z');
    expect(formatLifetimeSinceDate(target, { now })).toBe('since 12 Apr');
  });

  test('handles single-digit days without leading zero', () => {
    const now = new Date('2026-04-25T12:00:00Z');
    const target = new Date('2026-03-05T08:00:00Z');
    expect(formatLifetimeSinceDate(target, { now })).toBe('since 5 Mar');
  });

  test('accepts ms-epoch number', () => {
    const now = new Date('2026-04-25T12:00:00Z');
    const target = new Date('2026-04-12T08:00:00Z').getTime();
    expect(formatLifetimeSinceDate(target, { now })).toBe('since 12 Apr');
  });

  test('accepts ISO string', () => {
    const now = new Date('2026-04-25T12:00:00Z');
    expect(formatLifetimeSinceDate('2026-04-12T08:00:00Z', { now })).toBe('since 12 Apr');
  });

  test('returns null for invalid input', () => {
    expect(formatLifetimeSinceDate(null)).toBeNull();
    expect(formatLifetimeSinceDate(undefined)).toBeNull();
    expect(formatLifetimeSinceDate('not a date')).toBeNull();
    expect(formatLifetimeSinceDate({})).toBeNull();
  });

  test('all 12 months render correctly', () => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date('2027-01-01T00:00:00Z');
    months.forEach((m, i) => {
      // Use noon UTC to avoid TZ off-by-one for the day.
      const target = new Date(Date.UTC(2026, i, 15, 12, 0, 0));
      expect(formatLifetimeSinceDate(target, { now })).toBe(`since 15 ${m}`);
    });
  });
});
