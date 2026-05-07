import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '../../lib/theme';

function formatRegPlate(reg) {
  const r = String(reg || '').toUpperCase();
  if (r.length >= 5) return `${r.slice(0, r.length - 3)} ${r.slice(-3)}`;
  return r;
}

export default function VehicleHeader({ parsed }) {
  if (!parsed) return null;
  const titleParts = [parsed.make, parsed.model].filter(Boolean);
  const meta = [parsed.year, parsed.fuelType, parsed.primaryColour]
    .filter(Boolean)
    .map((s) => String(s));
  return (
    <View style={styles.card}>
      <View style={styles.regPlate}>
        <View style={styles.gbBadge}>
          <Text style={styles.gbText}>GB</Text>
        </View>
        <Text style={styles.regText}>{formatRegPlate(parsed.reg)}</Text>
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {titleParts.join(' ') || 'Vehicle'}
      </Text>
      {meta.length > 0 && (
        <Text style={styles.meta}>{meta.join(' · ')}</Text>
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
  regPlate: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.plateYellow,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.plateBorder,
    overflow: 'hidden',
    height: 32,
    marginBottom: SPACING.sm,
  },
  gbBadge: {
    backgroundColor: '#003399',
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gbText: { color: '#FFCC00', fontWeight: '900', fontSize: 10, letterSpacing: 1 },
  regText: {
    color: COLORS.plateText,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
  },
  meta: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm + 1,
    marginTop: 4,
  },
});
