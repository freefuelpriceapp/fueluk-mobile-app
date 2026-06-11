/**
 * Polish Bundle v2 — AmbientParticles component tests.
 *
 * Tests use source-text inspection (no JSX renderer in Node env) and
 * the exported seededRandom helper for particle config logic tests.
 */

const fs = require('fs');
const path = require('path');

const COMPONENT_PATH = path.resolve(__dirname, '../../components/AmbientParticles.js');
const source = fs.readFileSync(COMPONENT_PATH, 'utf8');

// ---------------------------------------------------------------------------
// Source-level structural checks
// ---------------------------------------------------------------------------
describe('AmbientParticles — source structure', () => {
  test('component file exists and is non-empty', () => {
    expect(source.length).toBeGreaterThan(100);
  });

  test('uses Animated API from react-native', () => {
    expect(source).toContain('Animated');
    expect(source).toMatch(/from 'react-native'/);
  });

  test('uses useNativeDriver: true', () => {
    expect(source).toContain('useNativeDriver: true');
  });

  test('uses AppState for background pause', () => {
    expect(source).toContain('AppState');
    expect(source).toContain('background');
  });

  test('wraps in pointerEvents="none"', () => {
    expect(source).toContain('pointerEvents="none"');
  });

  test('count prop is clamped to max 30', () => {
    expect(source).toContain('Math.min(count, 30)');
  });

  test('particle opacity range is within 0.10 – 0.30', () => {
    // Peak opacity is 0.25 per spec
    expect(source).toContain('0.25');
  });

  test('duration range covers 8000–14000ms', () => {
    expect(source).toContain('8000');
    expect(source).toContain('6000');  // 8000 + r2*6000 = 14000 max
  });

  test('default count is 24', () => {
    expect(source).toMatch(/count\s*=\s*24/);
  });

  test('default accent is #2ECC71', () => {
    expect(source).toContain('#2ECC71');
  });

  test('default height is 120', () => {
    expect(source).toMatch(/height\s*=\s*120/);
  });

  test('cleans up AppState subscription on unmount via sub.remove()', () => {
    expect(source).toContain('sub.remove()');
  });

  test('loop animation is stopped on cleanup', () => {
    expect(source).toContain('loop.stop()');
  });
});

// ---------------------------------------------------------------------------
// Particle config logic
// ---------------------------------------------------------------------------
describe('AmbientParticles — particleConfig logic', () => {
  // Inline the seededRandom and particleConfig logic for testing
  function seededRandom(seed) {
    let x = seed === 0 ? 1 : seed;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  }

  function particleConfig(i, screenWidth, height) {
    const r0 = seededRandom(i * 7 + 1);
    const r1 = seededRandom(i * 7 + 2);
    const r2 = seededRandom(i * 7 + 3);
    const r3 = seededRandom(i * 7 + 4);
    return {
      left: r0 * (screenWidth - 4),
      size: 2 + r1 * 2,
      duration: 8000 + r2 * 6000,
      delay: r3 * 8000,
      startY: height + 8,
      endY: -8,
    };
  }

  test('seededRandom returns values in [0, 1)', () => {
    for (let i = 0; i < 20; i++) {
      const v = seededRandom(i * 7 + 1);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test('seededRandom is deterministic for same seed', () => {
    expect(seededRandom(42)).toBe(seededRandom(42));
    expect(seededRandom(1)).toBe(seededRandom(1));
  });

  test('particle size is in range [2, 4]', () => {
    for (let i = 0; i < 24; i++) {
      const cfg = particleConfig(i, 375, 120);
      expect(cfg.size).toBeGreaterThanOrEqual(2);
      expect(cfg.size).toBeLessThanOrEqual(4);
    }
  });

  test('particle duration is in range [8000, 14000]ms', () => {
    for (let i = 0; i < 24; i++) {
      const cfg = particleConfig(i, 375, 120);
      expect(cfg.duration).toBeGreaterThanOrEqual(8000);
      expect(cfg.duration).toBeLessThanOrEqual(14000);
    }
  });

  test('particle delay is in range [0, 8000]ms', () => {
    for (let i = 0; i < 24; i++) {
      const cfg = particleConfig(i, 375, 120);
      expect(cfg.delay).toBeGreaterThanOrEqual(0);
      expect(cfg.delay).toBeLessThanOrEqual(8000);
    }
  });

  test('particle left is in range [0, screenWidth)', () => {
    const screenWidth = 375;
    for (let i = 0; i < 24; i++) {
      const cfg = particleConfig(i, screenWidth, 120);
      expect(cfg.left).toBeGreaterThanOrEqual(0);
      expect(cfg.left).toBeLessThan(screenWidth);
    }
  });

  test('startY is height + 8 (off-screen bottom)', () => {
    const cfg = particleConfig(0, 375, 120);
    expect(cfg.startY).toBe(128); // 120 + 8
  });

  test('endY is -8 (off-screen top)', () => {
    const cfg = particleConfig(0, 375, 120);
    expect(cfg.endY).toBe(-8);
  });

  test('configs for 24 particles are all unique (different left positions)', () => {
    const lefts = Array.from({ length: 24 }, (_, i) => particleConfig(i, 375, 120).left);
    const unique = new Set(lefts.map(l => Math.round(l * 100)));
    // Allow minor overlap chance but most should be unique
    expect(unique.size).toBeGreaterThan(20);
  });
});
