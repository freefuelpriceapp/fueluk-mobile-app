/**
 * deepLinks.test.js — fueluk:// URL parsing + route mapping + pending queue.
 */

const {
  parseDeepLink,
  routeForDeepLink,
  createPendingQueue,
} = require('../deepLinks');

describe('parseDeepLink', () => {
  test('returns null for non-fueluk URLs', () => {
    expect(parseDeepLink('https://example.com/x')).toBeNull();
    expect(parseDeepLink('mailto:a@b')).toBeNull();
    expect(parseDeepLink('')).toBeNull();
    expect(parseDeepLink(null)).toBeNull();
    expect(parseDeepLink(undefined)).toBeNull();
  });

  test('returns null when there is no host segment', () => {
    expect(parseDeepLink('fueluk://')).toBeNull();
    expect(parseDeepLink('fueluk:///')).toBeNull();
  });

  test('parses station/:id', () => {
    expect(parseDeepLink('fueluk://station/12345')).toEqual({
      type: 'station',
      id: '12345',
      params: {},
    });
  });

  test('rejects bare station route with no id', () => {
    expect(parseDeepLink('fueluk://station')).toBeNull();
    expect(parseDeepLink('fueluk://station/')).toBeNull();
  });

  test('parses car/:reg and uppercases + strips spaces', () => {
    expect(parseDeepLink('fueluk://car/ab12%20cde')).toEqual({
      type: 'car',
      reg: 'AB12CDE',
      params: {},
    });
  });

  test('parses heatmap', () => {
    expect(parseDeepLink('fueluk://heatmap')).toEqual({
      type: 'heatmap',
      params: {},
    });
  });

  test('parses search?q=...', () => {
    expect(parseDeepLink('fueluk://search?q=manchester')).toEqual({
      type: 'search',
      query: 'manchester',
      params: { q: 'manchester' },
    });
  });

  test('decodes percent-encoded query and treats + as space', () => {
    expect(parseDeepLink('fueluk://search?q=south%20london')).toEqual({
      type: 'search',
      query: 'south london',
      params: { q: 'south london' },
    });
    expect(parseDeepLink('fueluk://search?q=west+ham')).toEqual({
      type: 'search',
      query: 'west ham',
      params: { q: 'west ham' },
    });
  });

  test('search with no q returns empty query', () => {
    expect(parseDeepLink('fueluk://search')).toEqual({
      type: 'search',
      query: '',
      params: {},
    });
  });

  test('unknown host returns null', () => {
    expect(parseDeepLink('fueluk://wallet/123')).toBeNull();
  });

  test('handles triple-slash form some clients produce', () => {
    expect(parseDeepLink('fueluk:///station/42')).toEqual({
      type: 'station',
      id: '42',
      params: {},
    });
  });

  test('is case-insensitive on scheme + host', () => {
    expect(parseDeepLink('FuelUK://Station/9')).toEqual({
      type: 'station',
      id: '9',
      params: {},
    });
  });
});

describe('routeForDeepLink', () => {
  test('returns null for null/invalid', () => {
    expect(routeForDeepLink(null)).toBeNull();
    expect(routeForDeepLink({})).toBeNull();
    expect(routeForDeepLink({ type: 'unknown' })).toBeNull();
  });

  test('maps station to Home tab + StationDetail', () => {
    expect(routeForDeepLink({ type: 'station', id: '7' })).toEqual({
      tab: 'Home',
      screen: 'StationDetail',
      params: { stationId: '7', fromDeepLink: true },
    });
  });

  test('maps car to Settings tab + VehicleSettings', () => {
    expect(routeForDeepLink({ type: 'car', reg: 'AB12CDE' })).toEqual({
      tab: 'Settings',
      screen: 'VehicleSettings',
      params: { reg: 'AB12CDE', fromDeepLink: true },
    });
  });

  test('maps heatmap to Map tab with initialMode', () => {
    expect(routeForDeepLink({ type: 'heatmap' })).toEqual({
      tab: 'Map',
      params: { initialMode: 'heatmap' },
    });
  });

  test('maps search to Search tab with query', () => {
    expect(routeForDeepLink({ type: 'search', query: 'leeds' })).toEqual({
      tab: 'Search',
      params: { query: 'leeds' },
    });
  });

  test('search route tolerates missing query', () => {
    expect(routeForDeepLink({ type: 'search' })).toEqual({
      tab: 'Search',
      params: { query: '' },
    });
  });
});

describe('createPendingQueue', () => {
  test('starts empty', () => {
    const q = createPendingQueue();
    expect(q.size()).toBe(0);
    expect(q.drain()).toEqual([]);
  });

  test('push then drain returns items in FIFO order', () => {
    const q = createPendingQueue();
    q.push('fueluk://station/1');
    q.push('fueluk://heatmap');
    expect(q.size()).toBe(2);
    expect(q.drain()).toEqual(['fueluk://station/1', 'fueluk://heatmap']);
    expect(q.size()).toBe(0);
  });

  test('drain twice on the same items returns empty the second time', () => {
    const q = createPendingQueue();
    q.push('fueluk://heatmap');
    expect(q.drain()).toEqual(['fueluk://heatmap']);
    expect(q.drain()).toEqual([]);
  });

  test('rejects empty / non-string pushes', () => {
    const q = createPendingQueue();
    q.push('');
    q.push(null);
    q.push(undefined);
    q.push(42);
    expect(q.size()).toBe(0);
  });
});

describe('end-to-end parse → route', () => {
  test('cold-launch URL flow for a station', () => {
    const url = 'fueluk://station/abc123';
    const parsed = parseDeepLink(url);
    const route = routeForDeepLink(parsed);
    expect(route).toEqual({
      tab: 'Home',
      screen: 'StationDetail',
      params: { stationId: 'abc123', fromDeepLink: true },
    });
  });

  test('cold-launch URL flow for search with encoded query', () => {
    const url = 'fueluk://search?q=south%20west';
    const parsed = parseDeepLink(url);
    const route = routeForDeepLink(parsed);
    expect(route.params.query).toBe('south west');
  });
});
