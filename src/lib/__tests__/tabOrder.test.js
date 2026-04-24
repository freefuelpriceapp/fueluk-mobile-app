const { TAB_ORDER, tabNames, tabIndex } = require('../tabOrder');
const fs = require('fs');
const path = require('path');

describe('TAB_ORDER (canonical)', () => {
  test('matches the target order: Home · Map · Toolbox · Search · Settings', () => {
    expect(tabNames()).toEqual(['Home', 'Map', 'Toolbox', 'Search', 'Settings']);
  });

  test('Toolbox sits in the centre slot (index 2)', () => {
    expect(tabIndex('Toolbox')).toBe(2);
  });

  test('Search moves one position right of Toolbox', () => {
    expect(tabIndex('Search')).toBe(tabIndex('Toolbox') + 1);
  });

  test('each tab entry has a label + icon', () => {
    for (const t of TAB_ORDER) {
      expect(typeof t.name).toBe('string');
      expect(typeof t.label).toBe('string');
      expect(typeof t.icon).toBe('string');
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.icon.length).toBeGreaterThan(0);
    }
  });

  test('Toolbox uses an appropriate icon (construct/toolbox glyph), not the old ellipsis', () => {
    const toolbox = TAB_ORDER[tabIndex('Toolbox')];
    expect(toolbox.label).toBe('Toolbox');
    expect(toolbox.icon).not.toMatch(/ellipsis/);
    expect(toolbox.icon).toMatch(/construct|toolbox|build|grid/);
  });
});

describe('App.js navigator matches TAB_ORDER', () => {
  const appSrc = fs.readFileSync(
    path.resolve(__dirname, '..', '..', '..', 'App.js'),
    'utf8',
  );

  test('contains a Tab.Screen for every canonical tab', () => {
    for (const t of TAB_ORDER) {
      const re = new RegExp(`Tab\\.Screen\\s+name=["']${t.name}["']`);
      expect(appSrc).toMatch(re);
    }
  });

  test('renders Tab.Screens in the canonical order', () => {
    const positions = TAB_ORDER.map((t) => {
      const re = new RegExp(`Tab\\.Screen\\s+name=["']${t.name}["']`);
      const m = appSrc.match(re);
      if (!m) throw new Error(`Missing Tab.Screen for ${t.name}`);
      return appSrc.indexOf(m[0]);
    });
    const sorted = [...positions].sort((a, b) => a - b);
    expect(positions).toEqual(sorted);
  });

  test('no longer registers a top-level More or Favourites tab', () => {
    expect(appSrc).not.toMatch(/Tab\.Screen\s+name=["']More["']/);
    expect(appSrc).not.toMatch(/Tab\.Screen\s+name=["']Favourites["']/);
  });

  test('Toolbox tab uses a toolbox-appropriate Ionicon', () => {
    // Expect the Toolbox Tab.Screen block to include a construct-outline icon
    // (our chosen glyph). Match over a bounded window.
    const idx = appSrc.indexOf('name="Toolbox"');
    expect(idx).toBeGreaterThan(-1);
    const window = appSrc.slice(idx, idx + 600);
    expect(window).toMatch(/construct-outline/);
    expect(window).not.toMatch(/ellipsis-horizontal/);
  });
});
