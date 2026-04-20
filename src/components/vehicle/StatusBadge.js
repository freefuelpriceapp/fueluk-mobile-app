import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZES } from '../../lib/theme';

const TONE_MAP = {
  success: { bg: 'rgba(46,204,113,0.15)', fg: COLORS.accent, border: 'rgba(46,204,113,0.35)' },
  error:   { bg: 'rgba(231,76,60,0.15)',  fg: COLORS.error,  border: 'rgba(231,76,60,0.35)' },
  warning: { bg: 'rgba(243,156,18,0.15)', fg: COLORS.warning, border: 'rgba(243,156,18,0.35)' },
  muted:   { bg: 'rgba(139,148,158,0.15)', fg: COLORS.textSecondary, border: 'rgba(139,148,158,0.35)' },
};

export default function StatusBadge({ label, tone = 'muted' }) {
  const t = TONE_MAP[tone] || TONE_MAP.muted;
  return (
    <View style={[styles.badge, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={[styles.badgeText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
