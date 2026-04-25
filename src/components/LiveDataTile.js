/**
 * LiveDataTile — one-line strip near the bottom of the home screen.
 *
 * Shows total UK station count + a "live" indicator + relative freshness
 * timestamp. The pulsing green dot uses Animated (no setInterval) and the
 * timestamp self-refreshes via a single setTimeout chained to the next
 * meaningful boundary (same pattern as StationStatusChip).
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS } from '../lib/theme';

const MIN_REFRESH_MS = 1000;

function formatRelative(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const sec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (sec < 60) return { label: `${sec}s ago`, nextMs: 1000 };
  const min = Math.floor(sec / 60);
  if (min < 60) return { label: `${min}m ago`, nextMs: 60 * 1000 };
  const hr = Math.floor(min / 60);
  if (hr < 24) return { label: `${hr}h ago`, nextMs: 60 * 60 * 1000 };
  const day = Math.floor(hr / 24);
  return { label: `${day}d ago`, nextMs: 6 * 60 * 60 * 1000 };
}

export default function LiveDataTile({ stationCount, lastUpdated }) {
  const [tick, setTick] = useState(0);
  const timerRef = useRef(null);
  const dotOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dotOpacity, {
          toValue: 0.4,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [dotOpacity]);

  // Parse `lastUpdated` (ISO string or Date) once per tick / change.
  const updatedDate = (() => {
    if (!lastUpdated) return null;
    if (lastUpdated instanceof Date) return lastUpdated;
    const t = Date.parse(lastUpdated);
    return Number.isFinite(t) ? new Date(t) : null;
  })();

  const rel = updatedDate ? formatRelative(updatedDate) : null;

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!rel) return undefined;
    const delay = Math.max(MIN_REFRESH_MS, rel.nextMs);
    timerRef.current = setTimeout(() => setTick((t) => t + 1), delay);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [tick, rel?.label]);

  const countStr =
    typeof stationCount === 'number' && Number.isFinite(stationCount) && stationCount > 0
      ? stationCount.toLocaleString('en-GB')
      : null;

  if (!countStr && !rel) return null;

  const parts = [];
  if (countStr) parts.push(`${countStr} UK stations`);
  parts.push('live');
  if (rel) parts.push(`updated ${rel.label}`);

  return (
    <View
      style={styles.tile}
      accessibilityRole="text"
      accessibilityLabel={parts.join(', ')}
    >
      <Animated.View style={[styles.dot, { opacity: dotOpacity }]} />
      <Text style={styles.text} numberOfLines={1}>
        {parts.join(' \u00B7 ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  text: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});
