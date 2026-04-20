import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS, SPACING } from '../../lib/theme';

export default function VehicleCardSkeleton() {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Animated.View style={[styles.iconBlock, { opacity: pulse }]} />
        <Animated.View style={[styles.titleBlock, { opacity: pulse }]} />
        <Animated.View style={[styles.badgeBlock, { opacity: pulse }]} />
      </View>
      <Animated.View style={[styles.line, { opacity: pulse }]} />
    </View>
  );
}

const placeholder = '#2A2F37';

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconBlock: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: placeholder,
    marginRight: SPACING.md,
  },
  titleBlock: {
    flex: 1,
    height: 16,
    borderRadius: 4,
    backgroundColor: placeholder,
    marginRight: SPACING.md,
  },
  badgeBlock: {
    width: 64,
    height: 20,
    borderRadius: 999,
    backgroundColor: placeholder,
  },
  line: {
    height: 12,
    width: '55%',
    borderRadius: 4,
    backgroundColor: placeholder,
  },
});
