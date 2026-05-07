/**
 * LifetimeSavingsCard — running tally of savings since first use.
 *
 * Phase 2A update: ALSO reads `@fueluk/receipts_v1` and computes real
 * savings per receipt vs national average. When ≥3 receipts have valid
 * p/L data, shows the real figure with "based on N fill-ups" subtitle.
 * Falls back to synthetic estimate when < 3 valid receipts.
 *
 * Loads the rolling savings list from AsyncStorage on mount. Updates
 * when the screen is focused (the parent passes a `refreshKey` it bumps
 * after recording new entries).
 *
 * Empty state: muted "Start saving — pick any station to begin tracking"
 * — never £0, which would be discouraging.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../lib/theme';
import {
  LIFETIME_SAVINGS_KEY,
  summariseLifetimeSavings,
  formatLifetimeSinceDate,
} from '../lib/lifetimeSavings';
import { loadReceipts } from '../lib/receiptRepository';
import { computeRealLifetimeSavings } from '../lib/receiptSavings';

export default function LifetimeSavingsCard({ refreshKey = 0, compact = false }) {
  const [list, setList] = useState(null);
  const [realSavings, setRealSavings] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Load synthetic savings (legacy)
        const raw = await AsyncStorage.getItem(LIFETIME_SAVINGS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (mounted) setList(Array.isArray(parsed) ? parsed : []);
      } catch (_e) {
        if (mounted) setList([]);
      }

      try {
        // Load real savings from receipts (Phase 2A)
        const receipts = await loadReceipts();
        const real = computeRealLifetimeSavings(receipts);
        if (mounted) setRealSavings(real);
      } catch (_e) {
        if (mounted) setRealSavings(null);
      }
    })();
    return () => { mounted = false; };
  }, [refreshKey]);

  const syntheticSummary = summariseLifetimeSavings(list || []);
  const since = syntheticSummary.firstEntryTs
    ? formatLifetimeSinceDate(syntheticSummary.firstEntryTs)
    : null;

  // Use real savings when ≥3 valid receipts; otherwise synthetic
  const useReal = realSavings != null && realSavings.isSufficient;
  const totalPounds = useReal ? realSavings.totalPounds : syntheticSummary.totalPounds;
  const isEmpty = useReal
    ? realSavings.totalPounds <= 0
    : list == null || syntheticSummary.isEmpty;

  const subtitle = useReal
    ? `real savings · ${realSavings.validReceiptCount} fill-up${realSavings.validReceiptCount !== 1 ? 's' : ''} logged`
    : syntheticSummary.isEmpty
      ? 'Pick any station to begin tracking'
      : `saved with FuelUK${since ? ` \u00B7 ${since}` : ''}`;

  return (
    <View
      style={[styles.card, compact && styles.cardCompact]}
      accessibilityRole="summary"
      accessibilityLabel={
        isEmpty
          ? 'Start saving — pick any station to begin tracking'
          : `${totalPounds} pounds saved with FuelUK ${since || ''}`
      }
    >
      <View style={styles.iconRow}>
        <Ionicons
          name={isEmpty ? 'sparkles-outline' : 'trophy-outline'}
          size={14}
          color={isEmpty ? COLORS.textSecondary : COLORS.accent}
        />
        <Text style={styles.label}>Lifetime</Text>
        {useReal && (
          <View style={styles.realBadge}>
            <Text style={styles.realBadgeText}>REAL</Text>
          </View>
        )}
      </View>
      {isEmpty ? (
        <>
          <Text style={styles.emptyHeadline}>Start saving</Text>
          <Text style={styles.sub}>Pick any station to begin tracking</Text>
        </>
      ) : (
        <>
          <Text style={styles.headline}>
            <Text style={styles.pound}>£</Text>
            {totalPounds}
          </Text>
          <Text style={styles.sub}>{subtitle}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 90,
    justifyContent: 'space-between',
  },
  cardCompact: {
    minHeight: 80,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  realBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 2,
  },
  realBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.background,
    letterSpacing: 0.5,
  },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.accent,
    marginTop: 2,
  },
  pound: {
    fontSize: 22,
  },
  emptyHeadline: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '700',
    marginTop: 2,
  },
  sub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
