const {
  buildAvatarAccessibilityLabel,
} = require('../vehicleAvatarA11y');

describe('buildAvatarAccessibilityLabel', () => {
  test('assembles "Silver 2022 Mercedes saloon" from full props', () => {
    expect(
      buildAvatarAccessibilityLabel({
        make: 'Mercedes',
        model: 'E-Class',
        colour: 'SILVER',
        bodyType: 'saloon',
        year: 2022,
      })
    ).toBe('Silver 2022 Mercedes saloon');
  });

  test('omits colour when DVLA returned an unknown string', () => {
    const label = buildAvatarAccessibilityLabel({
      make: 'Ford',
      model: 'Fiesta',
      colour: 'CERULEAN',
      bodyType: 'hatchback',
      year: 2019,
    });
    expect(label).toBe('2019 Ford hatchback');
  });

  test('falls back to model when bodyType is missing', () => {
    expect(
      buildAvatarAccessibilityLabel({
        make: 'Nissan',
        model: 'Qashqai',
        colour: 'BLACK',
      })
    ).toBe('Black Nissan Qashqai');
  });

  test('returns a generic label when no props are useful', () => {
    expect(buildAvatarAccessibilityLabel({})).toBe('Your vehicle');
    expect(buildAvatarAccessibilityLabel({ colour: '' })).toBe('Your vehicle');
  });

  test('handles partial data (make-only) without crashing', () => {
    expect(
      buildAvatarAccessibilityLabel({ make: 'BMW' })
    ).toBe('BMW');
  });
});
