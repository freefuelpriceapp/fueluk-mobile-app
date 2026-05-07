import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '../../lib/theme';

const CATEGORY_LABEL = {
  brakes: 'Brakes',
  tyres: 'Tyres',
  suspension: 'Suspension',
  lights: 'Lights',
  corrosion: 'Corrosion',
};

export default function AdvisoryFrequencyCard({ advisories, testCount }) {
  if (!advisories) return null;
  const entries = Object.entries(advisories.byCategory)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.heading}>Advisory frequency</Text>
        <Text style={styles.empty}>No recurring advisory categories across MOT history.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Advisory frequency</Text>
      <Text style={styles.sub}>
        Across {testCount} MOT{testCount === 1 ? '' : 's'}
      </Text>
      <View style={styles.list}>
        {entries.map(([cat, n]) => {
          const recurring = n >= 3;
          return (
            <View key={cat} style={styles.row}>
              <Text style={styles.cat}>{CATEGORY_LABEL[cat] || cat}</Text>
              <Text
                style={[styles.count, recurring ? styles.warning : null]}
              >
                {n}× {recurring ? '· recurring' : ''}
              </Text>
            </View>
          );
        })}
      </View>
      {advisories.recurring.length > 0 && (
        <Text style={styles.recurringNote}>
          Recurring: {advisories.recurring.map((c) => CATEGORY_LABEL[c] || c).join(', ')} flagged across multiple MOTs.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heading: { color: COLORS.text, fontSize: FONT_SIZES.lg, fontWeight: '700' },
  sub: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm, marginTop: 2, marginBottom: SPACING.sm },
  list: { marginTop: SPACING.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  cat: { color: COLORS.text, fontSize: FONT_SIZES.md },
  count: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm + 1, fontWeight: '600' },
  warning: { color: COLORS.warning, fontWeight: '700' },
  empty: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm + 1, marginTop: 6 },
  recurringNote: {
    color: COLORS.warning,
    fontSize: FONT_SIZES.sm + 1,
    marginTop: SPACING.md,
    fontWeight: '600',
  },
});
