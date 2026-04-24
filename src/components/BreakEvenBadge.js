import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { describeBreakEven } from '../lib/breakEven';
import { isFeatureEnabled } from '../config/featureFlags';

const COLOURS = {
  positiveBg: 'rgba(46,204,113,0.12)',
  positiveText: '#2ECC71',
  positiveStrong: '#2ECC71',
  neutralBg: 'rgba(139,149,167,0.14)',
  neutralText: '#8B95A7',
  estBg: 'rgba(245,158,11,0.14)',
  estText: '#F59E0B',
  secondary: '#8B95A7',
};

/**
 * BreakEvenBadge — multi-layout chip/card showing break-even intelligence.
 *
 * Variants (picked automatically from the `break_even` block):
 *   - "worth"   → "£4.20 cheaper to fill up here" (big, green)
 *                 "£56 to fill (40L @ 140p) · 2.3mi extra drive · net £4.20 saved"
 *   - "similar" → "Similar value to your closest" (muted)
 *   - "closest" → just "£56 to fill (40L @ 140p)" (muted)
 *
 * size="sm" (default)  – compact single-line (map pin, list side)
 * size="md"            – rich two-line layout for BestOptionCard / detail sheet
 */
export default function BreakEvenBadge({ breakEven, size = 'sm', style }) {
  if (!isFeatureEnabled('breakEven')) return null;
  const desc = describeBreakEven(breakEven);
  if (!desc) return null;

  // Small: keep the legacy compact chip shape (map pin bottom line).
  if (size === 'sm') {
    const toneBg = desc.tone === 'positive' ? COLOURS.positiveBg : COLOURS.neutralBg;
    const toneText = desc.tone === 'positive' ? COLOURS.positiveText : COLOURS.neutralText;
    // For the closest variant the short chip would just duplicate the tank
    // cost that's shown elsewhere — skip the chip entirely on small pins.
    if (desc.variant === 'closest') return null;
    return (
      <View
        style={[styles.smRow, style]}
        accessible
        accessibilityLabel={desc.accessibilityLabel}
        accessibilityRole="text"
      >
        <View style={[styles.smChip, { backgroundColor: toneBg }]}>
          <Text style={[styles.smLabel, { color: toneText }]} numberOfLines={1}>
            {desc.label}
          </Text>
        </View>
        {desc.isEstimated && (
          <View style={styles.smEstChip}>
            <Text style={styles.smEstText}>est.</Text>
          </View>
        )}
      </View>
    );
  }

  // Medium: rich two-line presentation.
  const primaryColour =
    desc.tone === 'positive' ? COLOURS.positiveStrong : COLOURS.neutralText;

  return (
    <View
      style={[styles.mdWrap, style]}
      accessible
      accessibilityLabel={desc.accessibilityLabel}
      accessibilityRole="text"
    >
      {desc.primary ? (
        <View style={styles.mdPrimaryRow}>
          <Text
            style={[styles.mdPrimary, { color: primaryColour }]}
            numberOfLines={2}
          >
            {desc.primary}
          </Text>
          {desc.isEstimated && (
            <View style={styles.mdEstChip}>
              <Text style={styles.mdEstText}>est.</Text>
            </View>
          )}
        </View>
      ) : null}
      {desc.secondary ? (
        <Text style={styles.mdSecondary} numberOfLines={2}>
          {desc.secondary}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Small (compat)
  smRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  smChip: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  smLabel: {
    fontWeight: '700',
    letterSpacing: 0.2,
    fontSize: 10,
  },
  smEstChip: {
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: COLOURS.estBg,
  },
  smEstText: {
    color: COLOURS.estText,
    fontWeight: '700',
    letterSpacing: 0.3,
    fontSize: 9,
  },
  // Medium (rich)
  mdWrap: {
    alignSelf: 'stretch',
  },
  mdPrimaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  mdPrimary: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  mdSecondary: {
    fontSize: 12,
    color: COLOURS.secondary,
    marginTop: 2,
    lineHeight: 16,
  },
  mdEstChip: {
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    backgroundColor: COLOURS.estBg,
  },
  mdEstText: {
    color: COLOURS.estText,
    fontWeight: '700',
    letterSpacing: 0.3,
    fontSize: 9,
  },
});
