/**
 * Regression test for MapScreen brand chip crash.
 *
 * Bug: the visible-brand chip's onPress passed an updater function
 *      `(prev => prev === brandLabel ? null : brandLabel)` to
 *      handleSetSelectedBrand, which is a value-only handler. This caused
 *      AsyncStorage.setItem to receive a function instead of a string,
 *      throwing inside the native bridge and surfacing as a native crash
 *      with a "send error report" dialog.
 *
 * The fix replaces the updater function with a direct conditional value
 * referencing the current selectedBrand state. This test mirrors that
 * handler shape and asserts the value passed to handleSetSelectedBrand is
 * always a string or null — never a function.
 */

function buildOnPress(currentSelectedBrand, brandLabel, handleSetSelectedBrand) {
  // Mirror of the FIXED MapScreen.js JSX at line 1088.
  return () =>
    handleSetSelectedBrand(currentSelectedBrand === brandLabel ? null : brandLabel);
}

describe('MapScreen brand chip onPress (regression for native crash)', () => {
  test('passes brand label string when previously unselected', () => {
    const received = [];
    const handler = (v) => received.push(v);
    const onPress = buildOnPress(null, 'Texaco', handler);
    onPress();
    expect(received).toEqual(['Texaco']);
    expect(typeof received[0]).toBe('string');
  });

  test('passes null (toggles off) when the same brand is already selected', () => {
    const received = [];
    const handler = (v) => received.push(v);
    const onPress = buildOnPress('Texaco', 'Texaco', handler);
    onPress();
    expect(received).toEqual([null]);
  });

  test('passes new brand label when a different brand is already selected', () => {
    const received = [];
    const handler = (v) => received.push(v);
    const onPress = buildOnPress('Applegreen', 'Texaco', handler);
    onPress();
    expect(received).toEqual(['Texaco']);
  });

  test('never passes a function to the handler (the bug)', () => {
    const received = [];
    const handler = (v) => received.push(v);
    buildOnPress(null, 'Texaco', handler)();
    buildOnPress('Texaco', 'Texaco', handler)();
    buildOnPress('Applegreen', 'Texaco', handler)();
    for (const v of received) {
      expect(typeof v).not.toBe('function');
    }
  });

  test('value is safe for AsyncStorage.setItem (string or null)', () => {
    // AsyncStorage.setItem requires a string value. Simulate the call in the
    // real handler: AsyncStorage.setItem(KEY, brand ?? '__all__').
    const received = [];
    const handler = (brand) => {
      const persisted = brand ?? '__all__';
      received.push(persisted);
      expect(typeof persisted).toBe('string');
    };
    buildOnPress(null, 'Texaco', handler)();
    buildOnPress('Texaco', 'Texaco', handler)();
    expect(received).toEqual(['Texaco', '__all__']);
  });
});
