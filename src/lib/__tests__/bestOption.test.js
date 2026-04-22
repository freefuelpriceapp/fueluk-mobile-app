const {
  extractBestOption,
  pickFallbackBest,
  chooseBestOption,
} = require('../bestOption');

const applegreen = {
  id: 1,
  name: 'Small Heath Applegreen',
  brand: 'Applegreen',
  petrol_price: 140.0,
  distance_miles: 0.44,
  last_updated: new Date().toISOString(),
};

const tescoSpringhill = {
  id: 2,
  name: 'SpringHill Superstore',
  brand: 'Tesco',
  petrol_price: 163.9,
  e10_price: 165.9,
  distance_miles: 2.33,
  last_updated: new Date().toISOString(),
};

const asda = {
  id: 3,
  name: 'Asda Queslett',
  brand: 'Asda',
  petrol_price: 141.9,
  distance_miles: 1.8,
  last_updated: new Date().toISOString(),
};

describe('extractBestOption', () => {
  test('returns null when payload missing/malformed', () => {
    expect(extractBestOption(null)).toBeNull();
    expect(extractBestOption(undefined)).toBeNull();
    expect(extractBestOption({})).toBeNull();
    expect(extractBestOption({ best_option: null })).toBeNull();
    expect(extractBestOption({ best_option: 'str' })).toBeNull();
  });

  test('returns flat station-shaped best_option', () => {
    const payload = { best_option: applegreen };
    expect(extractBestOption(payload)).toBe(applegreen);
  });

  test('returns nested station when best_option has {station, selected_reason}', () => {
    const payload = {
      best_option: {
        station: applegreen,
        selected_reason: 'Cheapest petrol within 5 mi',
      },
    };
    expect(extractBestOption(payload)).toBe(applegreen);
  });
});

describe('pickFallbackBest', () => {
  test('returns null for empty list', () => {
    expect(pickFallbackBest([], 'petrol')).toBeNull();
    expect(pickFallbackBest(null, 'petrol')).toBeNull();
  });

  test('picks nearest station with a petrol price', () => {
    const result = pickFallbackBest([tescoSpringhill, applegreen, asda], 'petrol');
    expect(result).toBe(applegreen);
  });
});

describe('chooseBestOption — backend authority', () => {
  test('uses backend best_option even when Tesco Springhill is first in stations list', () => {
    // This is the exact bug: stations list has Tesco first, but backend says Applegreen.
    const stations = [tescoSpringhill, applegreen, asda];
    const payload = {
      best_option: applegreen,
      selected_reason: 'Cheapest petrol within 5 mi',
      stations,
    };
    const best = chooseBestOption(payload, stations, 'petrol');
    expect(best).toBe(applegreen);
    expect(best.name).toBe('Small Heath Applegreen');
    expect(best.petrol_price).toBe(140.0);
  });

  test('backend best_option wins regardless of fuel type tab', () => {
    const stations = [tescoSpringhill, applegreen, asda];
    const payload = { best_option: applegreen };
    expect(chooseBestOption(payload, stations, 'petrol')).toBe(applegreen);
    expect(chooseBestOption(payload, stations, 'diesel')).toBe(applegreen);
    expect(chooseBestOption(payload, stations, 'e10')).toBe(applegreen);
  });

  test('falls back to nearest non-stale station when backend omits best_option', () => {
    const stations = [tescoSpringhill, applegreen, asda];
    const payload = { stations };
    const best = chooseBestOption(payload, stations, 'petrol');
    expect(best).toBe(applegreen);
  });

  test('returns null when no stations and no backend best_option', () => {
    expect(chooseBestOption({}, [], 'petrol')).toBeNull();
    expect(chooseBestOption(null, null, 'petrol')).toBeNull();
  });
});
