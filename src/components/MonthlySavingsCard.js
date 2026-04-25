/**
 * MonthlySavingsCard — animated estimate of monthly fuel savings.
 *
 * Animates the headline number from 0 → target on first render
 * (~1.2s ease-out, native driver). Rounds to whole £, never pence.
 *
 * When the saving is < £5/month we don't fake big numbers — we swap to
 * "Find better deals near you" copy.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../lib/theme';
import { computeMonthlySaving } from '../lib/monthlySaving';

export default function MonthlySavingsCard({
  mpg,
  weeklyMiles,
  tankSizeLitres,
  perTankSavingPence,
  compact = false,
}) {
  const result = computeMonthlySaving({
    mpg,
    weekly_miles: weeklyMiles,
    tank_size_litres: tankSizeLitres,
    per_tank_saving_pence: perTankSavingPence,
  });

  const target = result?.monthlyPounds ?? 0;
  const animValue = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!result || result.isLowSaving) {
      setDisplay(0);
      animValue.setValue(0);
      return;
    }
    animValue.setValue(0);
    const sub = animValue.addListener(({ value }) => {
      setDisplay(Math.round(value));
    });
    Animated.timing(animValue, {
      toValue: target,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => animValue.removeListener(sub);
  }, [target, result?.isLowSaving, animValue]);

  const showLowState = !result || result.isLowSaving;

  return (
    <View
      style={[styles.card, compact && styles.cardCompact]}
      accessibilityRole="summary"
      accessibilityLabel={
        showLowState
          ? 'Find better deals near you'
          : `Save approximately ${target} pounds per month versus your nearest station`
      }
    >
      <View style={styles.iconRow}>
        <Ionicons
          name={showLowState ? 'compass-outline' : 'wallet-outline'}
          size={14}
          color={COLORS.accent}
        />
        <Text style={styles.label}>Monthly</Text>
      </View>
      {showLowState ? (
        <>
          <Text style={styles.lowHeadline}>Find better deals near you</Text>
          <Text style={styles.sub}>Bigger savings within reach</Text>
        </>
      ) : (
        <>
          <Text style={styles.headline}>
            <Text style={styles.tilde}>~</Text>
            <Text style={styles.pound}>£</Text>
            {display}
            <Text style={styles.suffix}>/mo</Text>
          </Text>
          <Text style={styles.sub}>vs. your nearest station</Text>
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
  tilde: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  pound: {
    fontSize: 22,
  },
  suffix: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  lowHeadline: {
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
