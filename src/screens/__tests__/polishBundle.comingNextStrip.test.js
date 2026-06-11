/**
 * Polish Bundle — ComingNextStrip card titles test.
 *
 * Verifies the 4 cards export with correct titles, descriptions, icons,
 * and IDs. Pure data test — no React rendering.
 */

const { COMING_NEXT_CARDS } = require('../../lib/comingNextCards');

describe('ComingNextStrip — renders 4 cards with correct content', () => {
  test('exports exactly 4 cards', () => {
    expect(COMING_NEXT_CARDS).toHaveLength(4);
  });

  test('card 1: EV charging prices', () => {
    const card = COMING_NEXT_CARDS[0];
    expect(card.id).toBe('ev-charging');
    expect(card.title).toBe('EV charging prices');
    expect(card.description).toContain('charge point pricing');
    expect(card.icon).toBeTruthy();
  });

  test('card 2: MOT renewal alerts', () => {
    const card = COMING_NEXT_CARDS[1];
    expect(card.id).toBe('mot-alerts');
    expect(card.title).toBe('MOT renewal alerts');
    expect(card.description).toContain('MOT');
    expect(card.icon).toBeTruthy();
  });

  test('card 3: Route-aware pricing', () => {
    const card = COMING_NEXT_CARDS[2];
    expect(card.id).toBe('route-aware');
    expect(card.title).toBe('Route-aware pricing');
    expect(card.description).toContain('route');
    expect(card.icon).toBeTruthy();
  });

  test('card 4: Price forecasts', () => {
    const card = COMING_NEXT_CARDS[3];
    expect(card.id).toBe('price-forecasts');
    expect(card.title).toBe('Price forecasts');
    expect(card.description).toContain('AI-driven');
    expect(card.icon).toBeTruthy();
  });

  test('all cards have gradient arrays', () => {
    for (const card of COMING_NEXT_CARDS) {
      expect(Array.isArray(card.gradient)).toBe(true);
      expect(card.gradient.length).toBeGreaterThanOrEqual(2);
    }
  });

  test('all card IDs are unique', () => {
    const ids = COMING_NEXT_CARDS.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('all cards have non-empty title and description', () => {
    for (const card of COMING_NEXT_CARDS) {
      expect(typeof card.title).toBe('string');
      expect(card.title.length).toBeGreaterThan(0);
      expect(typeof card.description).toBe('string');
      expect(card.description.length).toBeGreaterThan(0);
    }
  });
});
