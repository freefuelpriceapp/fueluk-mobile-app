import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS, SPACING } from '../lib/theme';

/**
 * SkeletonCard
 *
 * Pulsing placeholder that approximates the footprint of a StationCard while
 * data is loading. Composes several greyed-out blocks and fades their opacity
 * between 0.3 and 0.7 on a loop.
 */
export default function SkeletonCard() {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.7,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.lineShort, { opacity: pulse }]} />
      <Animated.View style={[styles.lineMedium, { opacity: pulse }]} />
      <Animated.View style={[styles.lineLong, { opacity: pulse }]} />
      <View style={styles.priceRow}>
        <Animated.View style={[styles.priceBlock, { opacity: pulse }]} />
        <Animated.View style={[styles.priceBlock, { opacity: pulse }]} />
        <Animated.View style={[styles.priceBlock, { opacity: pulse }]} />
      </View>
      <Animated.View style={[styles.footerLine, { opacity: pulse }]} />
    </View>
  );
}

/**
 * SkeletonList
 * Convenience: renders `count` SkeletonCards stacked vertically.
 */
export function SkeletonList({ count = 4 }) {
  const cards = [];
  for (let i = 0; i < count; i += 1) {
    cards.push(<SkeletonCard key={i} />);
  }
  return <View style={styles.list}>{cards}</View>;
}

const placeholder = '#2A2F37';

const styles = StyleSheet.create({
  list: {
    padding: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: SPACING.lg,
    marginBottom: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  lineShort: {
    height: 10,
    width: '30%',
    backgroundColor: placeholder,
    borderRadius: 4,
    marginBottom: SPACING.sm,
  },
  lineMedium: {
    height: 14,
    width: '60%',
    backgroundColor: placeholder,
    borderRadius: 4,
    marginBottom: 6,
  },
  lineLong: {
    height: 12,
    width: '85%',
    backgroundColor: placeholder,
    borderRadius: 4,
    marginBottom: SPACING.md,
  },
  priceRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  priceBlock: {
    flex: 1,
    height: 44,
    backgroundColor: placeholder,
    borderRadius: 8,
  },
  footerLine: {
    height: 10,
    width: '50%',
    backgroundColor: placeholder,
    borderRadius: 4,
  },
});
