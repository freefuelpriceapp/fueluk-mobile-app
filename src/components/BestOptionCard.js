import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resolvePrice } from '../lib/quarantine';
import { brandToString, safeText } from '../lib/brand';
import { normaliseSelectedReason } from '../lib/selectedReason';
import { chooseBestOption } from '../lib/bestOption';

/**
 * BestOptionCard — hero intelligence card for the top of the Nearby list.
 *
 * Renders the backend-authoritative Best Option station. The backend owns
 * the choice; this component does not recompute. If `bestOption` is
 * provided, it is rendered as-is. Otherwise, for legacy callers, we fall
 * back to picking the nearest non-stale station from `stations`.
 *
 * Props:
 *   bestOption     – station object chosen by the backend (preferred)
 *   stations       – full array of nearby station objects (fallback only)
 *   fuelType       – 'petrol' | 'diesel' | 'e10'
 *   onPress        – tap handler (navigate to StationDetail)
 *   selectedReason – backend-provided reason string; rendered verbatim
 */

const THEME = {
  bg: '#111820',
  border: '#2ECC7144',
  accent: '#2ECC71',
  text: '#F5F7FA',
  muted: '#8B95A7',
  tag: '#2ECC7120',
};

function timeAgo(iso) {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 60000;
    if (diff < 1) return 'just now';
    if (diff < 60) return `${Math.round(diff)}m ago`;
    if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
    return `${Math.round(diff / 1440)}d ago`;
  } catch (_) { return null; }
}

function formatDistance(station) {
  if (station.distance_miles != null && Number.isFinite(station.distance_miles)) {
    return `${station.distance_miles.toFixed(1)} mi`;
  }
  if (station.distance_km != null && Number.isFinite(station.distance_km)) {
    return `${station.distance_km.toFixed(1)} km`;
  }
  return null;
}

export default function BestOptionCard({ bestOption = null, stations = [], fuelType = 'petrol', onPress, selectedReason = null }) {
  // Backend is source of truth. If no prop was passed in (older callers),
  // fall back to lib helper: nearest non-stale station with a price.
  const station = bestOption || chooseBestOption(null, stations, fuelType);
  const reasonText = normaliseSelectedReason(selectedReason);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (station) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 380, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(12);
    }
  }, [station, fadeAnim, slideAnim]);

  if (!station) return null;

  const price = resolvePrice(station, fuelType);
  const dist = formatDistance(station);
  const updated = station.last_updated ? timeAgo(station.last_updated) : null;
  const fuelLabel = fuelType === 'diesel' ? 'Diesel' : fuelType === 'e10' ? 'E10' : 'Petrol';

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity activeOpacity={0.75} onPress={() => onPress && onPress(station)} style={styles.inner}>
        <View style={styles.topRow}>
          <Ionicons name="bulb" size={16} color={THEME.accent} />
          <Text style={styles.topLabel}>Best option near you</Text>
        </View>
        <Text style={styles.stationName} numberOfLines={1}>
          {safeText(station.name) || brandToString(station.brand) || 'Station'}
        </Text>
        <View style={styles.metaRow}>
          {price != null && Number.isFinite(price) && (
            <Text style={styles.price}>{price.toFixed(1)}p <Text style={styles.fuelLabel}>{fuelLabel}</Text></Text>
          )}
          {dist && (
            <Text style={styles.meta}>
              <Ionicons name="location-outline" size={12} color={THEME.muted} /> {dist}
            </Text>
          )}
          {updated && (
            <Text style={styles.meta}>
              <Ionicons name="time-outline" size={12} color={THEME.muted} /> {updated}
            </Text>
          )}
        </View>
        {reasonText && (
          <View
            style={styles.reasonRow}
            accessible
            accessibilityLabel={reasonText}
          >
            <Ionicons name="checkmark-circle" size={12} color={THEME.muted} />
            <Text style={styles.reasonText} numberOfLines={2}>
              {reasonText}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.bg,
    shadowColor: THEME.accent,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  inner: { padding: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  topLabel: { fontSize: 11, fontWeight: '700', color: THEME.accent, marginLeft: 5, letterSpacing: 0.5, textTransform: 'uppercase' },
  stationName: { fontSize: 16, fontWeight: '700', color: THEME.text, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  price: { fontSize: 15, fontWeight: '700', color: THEME.accent },
  fuelLabel: { fontSize: 12, fontWeight: '500', color: THEME.muted },
  meta: { fontSize: 12, color: THEME.muted },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  reasonText: { fontSize: 12, color: THEME.muted, flexShrink: 1 },
});
