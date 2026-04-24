/**
 * tabOrder.js — canonical bottom-tab order for the app.
 *
 * Exported as a pure array so it can be asserted in tests without having to
 * render the navigator. If you change this, the App.js <Tab.Navigator/> must
 * match — there's a test that guards the relationship.
 */

export const TAB_ORDER = Object.freeze([
  { name: 'Home',     label: 'Near Me',  icon: 'location-outline' },
  { name: 'Map',      label: 'Map',      icon: 'map-outline' },
  { name: 'Toolbox',  label: 'Toolbox',  icon: 'construct-outline' },
  { name: 'Search',   label: 'Search',   icon: 'search-outline' },
  { name: 'Settings', label: 'Settings', icon: 'settings-outline' },
]);

export function tabNames() {
  return TAB_ORDER.map((t) => t.name);
}

export function tabIndex(name) {
  return TAB_ORDER.findIndex((t) => t.name === name);
}

export default { TAB_ORDER, tabNames, tabIndex };
