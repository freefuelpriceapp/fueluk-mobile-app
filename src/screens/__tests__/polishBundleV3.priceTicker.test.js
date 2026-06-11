/**
 * Polish Bundle v3 — PriceTicker component tests.
 *
 * Source-text inspection only (no JSX renderer in Node env).
 * Tests verify structure, animation setup, AppState pause, and cleanup.
 */

const fs = require('fs');
const path = require('path');

const COMPONENT_PATH = path.resolve(__dirname, '../../components/PriceTicker.js');
const source = fs.readFileSync(COMPONENT_PATH, 'utf8');

describe('PriceTicker — source structure', () => {
  test('component file exists and is non-empty', () => {
    expect(source.length).toBeGreaterThan(200);
  });

  test('uses Animated API from react-native', () => {
    expect(source).toContain('Animated');
    expect(source).toMatch(/from 'react-native'/);
  });

  test('uses useNativeDriver: true for scroll animation', () => {
    expect(source).toContain('useNativeDriver: true');
  });

  test('uses AppState for background pause', () => {
    expect(source).toContain('AppState');
    expect(source).toContain('background');
  });

  test('cleans up AppState subscription on unmount', () => {
    expect(source).toContain('sub.remove()');
  });

  test('scroll animation loops', () => {
    expect(source).toContain('Animated.loop');
  });

  test('animation is stopped on cleanup', () => {
    expect(source).toContain('.stop()');
  });

  test('returns null for empty stations (guard at render)', () => {
    // The component should return null when changes.length === 0
    expect(source).toContain('changes.length === 0');
    expect(source).toContain('return null');
  });

  test('props are stations and fuelType', () => {
    expect(source).toMatch(/\{\s*stations\s*,\s*fuelType\s*\}/);
  });

  test('imports getRecentPriceChanges from lib', () => {
    expect(source).toContain('getRecentPriceChanges');
    expect(source).toContain('recentPriceChanges');
  });

  test('live dot uses opacity animation (pulsing dot)', () => {
    expect(source).toContain('dotAnim');
    expect(source).toContain('opacity: dotAnim');
  });

  test('ticker text is duplicated for seamless loop', () => {
    // Two TickerText copies rendered end-to-end
    expect(source).toMatch(/TickerText[\s\S]*TickerText/);
  });

  test('green accent used for falling prices', () => {
    expect(source).toContain('#2ECC71');
  });

  test('muted red used for rising prices', () => {
    // rgba form of #E74C3C at 0.7 alpha
    expect(source).toContain('rgba(231,76,60,0.7)');
  });
});

// ---------------------------------------------------------------------------
// Integration: recentPriceChanges is called correctly
// ---------------------------------------------------------------------------
const { getRecentPriceChanges } = require(
  path.resolve(__dirname, '../../lib/recentPriceChanges.js')
);

describe('PriceTicker — data plumbing via getRecentPriceChanges', () => {
  test('empty stations → getRecentPriceChanges returns []', () => {
    expect(getRecentPriceChanges([])).toEqual([]);
  });

  test('stations with real price_change data are passed through', () => {
    const stations = [
      { id: '1', name: 'Tesco Solihull', price_change_pence_24h: -1.2 },
      { id: '2', name: 'Asda Coventry', price_change_pence_24h: -0.8 },
    ];
    const result = getRecentPriceChanges(stations, 8);
    expect(result).toHaveLength(2);
    expect(result[0].shortName).toBe('Tesco Solihull');
    expect(result[0].delta).toBe(-1.2);
  });
});
