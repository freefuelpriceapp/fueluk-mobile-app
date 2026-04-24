/**
 * stationSheetLayout.js — pure description of the station bottom sheet's
 * action-row hierarchy.
 *
 * The React Native renderer isn't wired up in the Jest config, so we expose
 * the layout contract as data (role + style hints) and let the view consume
 * it / snapshot-test it against this contract. This keeps the rule
 * "See details is primary, Save/Report are secondary" enforced by tests.
 */

import { formatPounds } from './breakEven';

export const ACTION_ROLE = Object.freeze({
  primary: 'primary',
  secondary: 'secondary',
  utility: 'utility',
});

/**
 * describeStationSheetActions — returns the ordered list of actions and
 * which row/role each belongs to. Accepts flags so locked or gated
 * features (e.g. `priceFlags`) are respected.
 */
export function describeStationSheetActions({
  isFavourite = false,
  priceFlagsEnabled = true,
} = {}) {
  const actions = [
    {
      id: 'seeDetails',
      role: ACTION_ROLE.primary,
      row: 'top',
      label: 'See details',
      icon: 'chevron-forward',
      style: 'solid',
    },
    {
      id: 'directions',
      role: ACTION_ROLE.secondary,
      row: 'top',
      label: 'Directions',
      icon: 'navigate',
      style: 'outlined',
    },
    {
      id: 'save',
      role: ACTION_ROLE.utility,
      row: 'bottom',
      label: isFavourite ? 'Saved' : 'Save',
      icon: isFavourite ? 'heart' : 'heart-outline',
      style: 'icon',
      accessibilityLabel: isFavourite
        ? 'Remove station from saved'
        : 'Save station',
    },
  ];
  if (priceFlagsEnabled) {
    actions.push({
      id: 'report',
      role: ACTION_ROLE.utility,
      row: 'bottom',
      label: 'Report',
      icon: 'flag-outline',
      style: 'icon',
      accessibilityLabel: 'Report incorrect price',
    });
  }
  return actions;
}

/**
 * formatPerTankDelta — consistent "£X.XX difference per full tank" rendering
 * for the station sheet. Routes the figure through formatPounds so the
 * "£X.XXp" bug can't reappear.
 */
export function formatPerTankDelta(savingsPounds, { tied = false } = {}) {
  if (tied) return 'Under £1 difference per full tank — either works';
  if (typeof savingsPounds !== 'number' || !Number.isFinite(savingsPounds)) {
    return null;
  }
  const abs = Math.abs(savingsPounds);
  const label = formatPounds(abs);
  if (!label) return null;
  return `Only ${label} difference per full tank`;
}

export default {
  ACTION_ROLE,
  describeStationSheetActions,
  formatPerTankDelta,
};
