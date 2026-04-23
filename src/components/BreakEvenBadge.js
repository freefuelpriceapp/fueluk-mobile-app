import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { describeBreakEven } from '../lib/breakEven';
import { isFeatureEnabled } from '../config/featureFlags';

const COLOURS = {
  positiveBg: 'rgba(46,204,113,0.12)',
  positiveText: '#2ECC71',
  neutralBg: 'rgba(139,149,167,0.14)',
  neutralText: '#8B95A7',
  estBg: 'rgba(245,158,11,0.12)',
  estText: '#F59E0B',
};

/**
 * BreakEvenBadge — small footprint chip: "+£1.80 saved" or "Similar value".
 *
 * Variants:
 *   size="sm" (default)  – map pin bottom line
 *   size="md"            – list card side / Best Option primary
 */
export default function BreakEvenBadge({ breakEven, size = 'sm', style }) {
  if (!isFeatureEnabled('breakEven')) return null;
  const desc = describeBreakEven(breakEven);
  if (!desc) return null;

  const toneBg = desc.tone === 'positive' ? COLOURS.positiveBg : COLOURS.neutralBg;
  const toneText = desc.tone === 'positive' ? COLOURS.positiveText : COLOURS.neutralText;
  const padV = size === 'md' ? 4 : 2;
  const padH = size === 'md' ? 8 : 6;
  const fontSize = size === 'md' ? 12 : 10;

  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityLabel={desc.accessibilityLabel}
      accessibilityRole="text"
    >
      <View
        style={[
          styles.chip,
          {
            backgroundColor: toneBg,
            paddingHorizontal: padH,
            paddingVertical: padV,
          },
        ]}
      >
        <Text style={[styles.label, { color: toneText, fontSize }]} numberOfLines={1}>
          {desc.label}
        </Text>
      </View>
      {desc.isEstimated && (
        <View
          style={[
            styles.estChip,
            { paddingHorizontal: padH - 2, paddingVertical: padV },
          ]}
        >
          <Text style={[styles.estText, { fontSize: fontSize - 1 }]}>est.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chip: {
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  estChip: {
    borderRadius: 6,
    backgroundColor: COLOURS.estBg,
  },
  estText: {
    color: COLOURS.estText,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
