/**
 * vehicleAvatarA11y.js — pure a11y-label builder for VehicleAvatar.
 *
 * Extracted into a separate file so the string-composition logic can be
 * asserted in the node-only Jest environment without pulling in
 * react-native / react-native-svg.
 */

import { colourLabelFromDvla } from './vehicleColourMap';

export function buildAvatarAccessibilityLabel({ make, model, colour, bodyType, year }) {
  const parts = [];
  const colourLabel = colour ? colourLabelFromDvla(colour) : null;
  if (colourLabel && colourLabel !== 'Unknown colour') parts.push(colourLabel);
  if (year) parts.push(String(year));
  if (make) parts.push(String(make));
  if (bodyType) parts.push(bodyType);
  else if (model) parts.push(String(model));
  return parts.join(' ').trim() || 'Your vehicle';
}

export default { buildAvatarAccessibilityLabel };
