const fs = require('fs');
const path = require('path');

describe('VehicleSettingsScreen section titles', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', '..', 'screens', 'VehicleSettingsScreen.js'),
    'utf8',
  );

  test('renders literal middle-dot, not the literal escape sequence', () => {
    expect(source).toContain('Option 1 · Reg plate lookup');
    expect(source).toContain('Option 2 · Pick your fuel type');
    expect(source).toContain('Option 3 · Override mpg (optional)');
    expect(source).not.toMatch(/Option [123] \\u00B7/);
    expect(source).not.toMatch(/\\U00B7/);
  });
});
