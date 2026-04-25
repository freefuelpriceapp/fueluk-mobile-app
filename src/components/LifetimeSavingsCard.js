/**
 * LifetimeSavingsCard — running tally of savings since first use.
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

export default function LifetimeSavingsCard({ refreshKey = 0, compact = false }) {
  const [list, setList] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LIFETIME_SAVINGS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (mounted) setList(Array.isArray(parsed) ? parsed : []);
      } catch (_e) {
        if (mounted) setList([]);
      }
    })();
    return () => { mounted = false; };
  }, [refreshKey]);

  const summary = summariseLifetimeSavings(list || []);
  const since = summary.firstEntryTs ? formatLifetimeSinceDate(summary.firstEntryTs) : null;
  const isEmpty = list == null || summary.isEmpty;

  return (
    <View
      style={[styles.card, compact && styles.cardCompact]}
      accessibilityRole="summary"
      accessibilityLabel={
        isEmpty
          ? 'Start saving — pick any station to begin tracking'
          : `${summary.totalPounds} pounds saved with FuelUK ${since || ''}`
      }
    >
      <View style={styles.iconRow}>
        <Ionicons
          name={isEmpty ? 'sparkles-outline' : 'trophy-outline'}
          size={14}
          color={isEmpty ? COLORS.textSecondary : COLORS.accent}
        />
        <Text style={styles.label}>Lifetime</Text>
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
            {summary.totalPounds}
          </Text>
          <Text style={styles.sub}>
            saved with FuelUK{since ? ` \u00B7 ${since}` : ''}
          </Text>
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
