import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { describeTrajectory } from '../lib/trajectory';
import { isFeatureEnabled } from '../config/featureFlags';

const TONE_COLOURS = {
  warning: { bg: 'rgba(245,158,11,0.14)', text: '#F59E0B' },
  positive: { bg: 'rgba(46,204,113,0.14)', text: '#2ECC71' },
  neutral: { bg: 'rgba(139,149,167,0.14)', text: '#8B95A7' },
};

/**
 * TrajectoryBadge — small pill showing price trend.
 *
 *   scope="national"  – long form, e.g. "↗ Rising · +2.4p/L (7d)"
 *   scope="station"   – compact; returns null for low-confidence
 *                       non-stable signals (national badge covers it)
 *   size="sm" | "md"  – controls padding/font
 */
export default function TrajectoryBadge({
  trajectory,
  scope = 'national',
  size = 'sm',
  style,
}) {
  if (!isFeatureEnabled('trajectory')) return null;
  const desc = describeTrajectory(trajectory, { scope });
  if (!desc) return null;

  const colour = TONE_COLOURS[desc.tone] || TONE_COLOURS.neutral;
  const padV = size === 'md' ? 4 : 2;
  const padH = size === 'md' ? 8 : 6;
  const fontSize = size === 'md' ? 12 : 10;

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: colour.bg,
          paddingHorizontal: padH,
          paddingVertical: padV,
        },
        style,
      ]}
      accessible
      accessibilityLabel={desc.accessibilityLabel}
      accessibilityRole="text"
    >
      <Text
        style={[styles.label, { color: colour.text, fontSize }]}
        numberOfLines={1}
      >
        {desc.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
