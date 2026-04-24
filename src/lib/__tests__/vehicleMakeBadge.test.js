const { makeBadgeFor, TOP_UK_MAKES } = require('../vehicleMakeBadge');

describe('makeBadgeFor', () => {
  test('returns a known swatch and letter for top-25 UK makes', () => {
    const ford = makeBadgeFor('Ford');
    expect(ford.known).toBe(true);
    expect(ford.initial).toBe('F');
    expect(ford.bg).toMatch(/^#[0-9A-F]{6}$/i);
    expect(ford.fg).toMatch(/^#[0-9A-F]{6}$/i);
    expect(ford.label).toBe('Ford');
  });

  test('is case-insensitive and trims whitespace', () => {
    expect(makeBadgeFor('BMW').initial).toBe('B');
    expect(makeBadgeFor('  toyota  ').known).toBe(true);
    expect(makeBadgeFor('MERCEDES-BENZ').known).toBe(true);
  });

  test('handles multi-word makes by using the first letter of the first word', () => {
    expect(makeBadgeFor('Land Rover').initial).toBe('L');
    expect(makeBadgeFor('Land-Rover').initial).toBe('L');
  });

  test('returns unknown swatch with "?" for empty / missing input', () => {
    const blank = makeBadgeFor('');
    expect(blank.known).toBe(false);
    expect(blank.initial).toBe('?');
    expect(blank.label).toBe('Unknown make');
    expect(makeBadgeFor(null).known).toBe(false);
    expect(makeBadgeFor(undefined).known).toBe(false);
  });

  test('unknown makes get a neutral badge but still produce an initial', () => {
    const weird = makeBadgeFor('Koenigsegg');
    expect(weird.known).toBe(false);
    expect(weird.initial).toBe('K');
  });

  test('top-25 UK makes list covers the expected majors', () => {
    for (const make of ['ford', 'vauxhall', 'volkswagen', 'bmw', 'toyota', 'nissan', 'tesla']) {
      expect(TOP_UK_MAKES).toContain(make);
    }
  });
});
