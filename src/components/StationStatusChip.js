import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isStationOpenNow } from '../lib/stationStatus';
import { COLORS, FONT_SIZES, SPACING } from '../lib/theme';

const FALLBACK_REFRESH_MS = 60 * 1000;
const MAX_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12h — keep setTimeout cheap.

const TINT = {
  open_24h:          { bg: 'rgba(46,204,113,0.14)', fg: COLORS.accent,   icon: 'time-outline' },
  open:              { bg: 'rgba(46,204,113,0.14)', fg: COLORS.accent,   icon: 'checkmark-circle-outline' },
  closing_soon:      { bg: 'rgba(243,156,18,0.16)', fg: COLORS.warning,  icon: 'alert-circle-outline' },
  closed:            { bg: 'rgba(231,76,60,0.14)',  fg: COLORS.error,    icon: 'close-circle-outline' },
  temporarily_closed:{ bg: 'rgba(243,156,18,0.16)', fg: COLORS.warning,  icon: 'warning-outline' },
  permanently_closed:{ bg: 'rgba(80,80,90,0.30)',   fg: COLORS.textSecondary, icon: 'ban-outline' },
};

function buildA11y(result) {
  if (!result) return 'Station status unknown';
  switch (result.status) {
    case 'open_24h':           return 'Open 24 hours';
    case 'open':               return `Open, ${result.label.replace(/^Open · /, '')}`;
    case 'closing_soon':       return `Closing soon, ${result.label.replace(/^Closing soon · /, '')}`;
    case 'closed':             return result.label.replace('Closed · opens', 'Closed, opens');
    case 'temporarily_closed': return 'Temporarily closed';
    case 'permanently_closed': return 'Permanently closed';
    default:                   return result.label || 'Status unknown';
  }
}

/**
 * StationStatusChip
 *
 * Renders a small pill showing whether a station is open, closing soon, closed,
 * or flagged as temporarily/permanently closed. Self-refreshes as time passes
 * so labels like "Closes 10pm" don't stale-date after the station closes.
 *
 * Props:
 *   - station: { opening_hours, temporary_closure, permanent_closure }
 *   - size: 'sm' | 'md'  (default 'sm')
 */
export default function StationStatusChip({ station, size = 'sm' }) {
  const [tick, setTick] = useState(0);
  const timerRef = useRef(null);

  const opening = station?.opening_hours || null;
  const tempClosed = !!station?.temporary_closure;
  const permClosed = !!station?.permanent_closure;

  // Compute on every render — re-runs when `tick` changes (self-refresh).
  const result = isStationOpenNow(opening, tempClosed, permClosed);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    let delay = FALLBACK_REFRESH_MS;
    if (result && result.nextChangeAt instanceof Date) {
      const ms = result.nextChangeAt.getTime() - Date.now();
      if (ms > 0 && ms < MAX_TIMEOUT_MS) {
        // Add 1s to ensure we're past the boundary when we re-render.
        delay = ms + 1000;
      } else if (ms >= MAX_TIMEOUT_MS) {
        delay = MAX_TIMEOUT_MS;
      }
    }
    timerRef.current = setTimeout(() => {
      setTick((t) => t + 1);
    }, delay);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // `tick` is included so the effect re-arms after each refresh.
  }, [tick, opening, tempClosed, permClosed, result && result.status, result && result.label]);

  if (!result || result.status === 'unknown') return null;

  const tint = TINT[result.status] || TINT.closed;
  const sizeStyles = size === 'md' ? styles.md : styles.sm;
  const textStyle = size === 'md' ? styles.textMd : styles.textSm;
  const iconSize = size === 'md' ? 13 : 11;

  return (
    <View
      style={[styles.base, sizeStyles, { backgroundColor: tint.bg }]}
      accessibilityLabel={buildA11y(result)}
      accessibilityRole="text"
    >
      <Ionicons name={tint.icon} size={iconSize} color={tint.fg} style={styles.icon} />
      <Text style={[textStyle, { color: tint.fg }]} numberOfLines={1}>
        {result.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
  },
  icon: {
    marginRight: 4,
  },
  textSm: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  textMd: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
});
