import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '../../lib/theme';
import { VERDICTS } from '../../lib/prePurchaseCheck';

const VERDICT_STYLE = {
  [VERDICTS.CLEAN]: {
    icon: 'checkmark-circle', accent: COLORS.accent,
    bg: 'rgba(46,204,113,0.10)', border: 'rgba(46,204,113,0.35)',
  },
  [VERDICTS.MINOR]: {
    icon: 'alert-circle-outline', accent: COLORS.warning,
    bg: 'rgba(243,156,18,0.10)', border: 'rgba(243,156,18,0.35)',
  },
  [VERDICTS.INVESTIGATE]: {
    icon: 'warning-outline', accent: COLORS.warning,
    bg: 'rgba(243,156,18,0.18)', border: 'rgba(243,156,18,0.5)',
  },
  [VERDICTS.WALK_AWAY]: {
    icon: 'close-circle', accent: COLORS.error,
    bg: 'rgba(231,76,60,0.15)', border: 'rgba(231,76,60,0.45)',
  },
};

export default function VerdictCard({ scored }) {
  if (!scored) return null;
  const tone = VERDICT_STYLE[scored.verdict] || VERDICT_STYLE[VERDICTS.CLEAN];
  return (
    <View
      style={[styles.card, { backgroundColor: tone.bg, borderColor: tone.border }]}
      accessibilityRole="summary"
      accessibilityLabel={`Pre-purchase verdict: ${scored.label}`}
    >
      <View style={styles.headerRow}>
        <Ionicons name={tone.icon} size={28} color={tone.accent} />
        <Text style={[styles.label, { color: tone.accent }]} numberOfLines={2}>
          {scored.label}
        </Text>
      </View>
      {Array.isArray(scored.reasons) && scored.reasons.length > 0 && (
        <View style={styles.reasons}>
          {scored.reasons.map((r, i) => (
            <View key={i} style={styles.reasonRow}>
              <Text style={[styles.bullet, { color: tone.accent }]}>•</Text>
              <Text style={styles.reasonText}>{r}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    marginLeft: SPACING.sm + 2,
    flex: 1,
  },
  reasons: { marginTop: SPACING.md },
  reasonRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bullet: { fontSize: FONT_SIZES.md, marginRight: 8, marginTop: -1 },
  reasonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm + 1,
    lineHeight: 19,
    flex: 1,
  },
});
