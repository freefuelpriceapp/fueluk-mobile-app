import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { filterRankable } from '../lib/quarantine';
import { brandToString } from '../lib/brand';

/**
 * BestOptionCard — hero intelligence card for the top of the Nearby list.
 *
 * Analyses the loaded stations and picks the best, then shows a concise
 * explanation ("Cheapest nearby", "Closest", "Freshest data", "Best value").
 *
 * Props:
 *   stations  – full array of nearby station objects
 *   fuelType  – 'petrol' | 'diesel' | 'e10'
 *   onPress   – tap handler (navigate to StationDetail)
 */

const THEME = {
  bg: '#111820',
  border: '#2ECC7144',
  accent: '#2ECC71',
  text: '#F5F7FA',
  muted: '#8B95A7',
  tag: '#2ECC7120',
};

function pickBest(stations, fuelType) {
  if (!stations || !stations.length) return null;
  const priceKey = fuelType === 'diesel' ? 'diesel_price' : fuelType === 'e10' ? 'e10_price' : 'petrol_price';
  const altKey = fuelType === 'diesel' ? 'diesel' : fuelType === 'e10' ? 'e10' : 'petrol';

    const withPrice = filterRankable(stations, fuelType);
  if (!withPrice.length) return null;

  const cheapest = [...withPrice].sort((a, b) => {
    const pa = a[priceKey] ?? a.prices?.[altKey];
    const pb = b[priceKey] ?? b.prices?.[altKey];
    return pa - pb;
  })[0];

  const closest = [...withPrice].sort((a, b) => {
    const da = a.distance_miles ?? a.distance_km ?? 999;
    const db = b.distance_miles ?? b.distance_km ?? 999;
    return da - db;
  })[0];

  const freshest = [...withPrice].sort((a, b) => {
    const ta = a.last_updated ? new Date(a.last_updated).getTime() : 0;
    const tb = b.last_updated ? new Date(b.last_updated).getTime() : 0;
    return tb - ta;
  })[0];

  // Scoring: price rank (70%) + distance rank (30%)
  const ranked = withPrice.map(s => {
    const price = s[priceKey] ?? s.prices?.[altKey];
    const dist = s.distance_miles ?? s.distance_km ?? 999;
    return { s, price, dist };
  }).sort((a, b) => a.price * 0.7 + a.dist * 0.3 - (b.price * 0.7 + b.dist * 0.3));
  const best = ranked[0].s;

  const tags = [];
  if (best.id === cheapest.id) tags.push({ label: 'Cheapest nearby', icon: 'pricetag' });
  if (best.id === closest.id) tags.push({ label: 'Closest', icon: 'navigate' });
  if (best.id === freshest.id) tags.push({ label: 'Freshest data', icon: 'time' });
  if (!tags.length) tags.push({ label: 'Best value', icon: 'star' });

  const price = best[priceKey] ?? best.prices?.[altKey];
  const dist = best.distance_miles != null
    ? `${best.distance_miles.toFixed(1)} mi`
    : best.distance_km != null
    ? `${best.distance_km.toFixed(1)} km`
    : null;
  const updated = best.last_updated ? timeAgo(best.last_updated) : null;

  return { station: best, tags, price, dist, updated };
}

function timeAgo(iso) {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 60000;
    if (diff < 1) return 'just now';
    if (diff < 60) return `${Math.round(diff)}m ago`;
    if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
    return `${Math.round(diff / 1440)}d ago`;
  } catch (_) { return null; }
}

export default function BestOptionCard({ stations, fuelType = 'petrol', onPress }) {
  const best = pickBest(stations, fuelType);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (best) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 380, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(12);
    }
  }, [best, fadeAnim, slideAnim]);

  if (!best) return null;

  const fuelLabel = fuelType === 'diesel' ? 'Diesel' : fuelType === 'e10' ? 'E10' : 'Petrol';

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity activeOpacity={0.75} onPress={() => onPress && onPress(best.station)} style={styles.inner}>
        <View style={styles.topRow}>
          <Ionicons name="bulb" size={16} color={THEME.accent} />
          <Text style={styles.topLabel}>Best option near you</Text>
        </View>
        <Text style={styles.stationName} numberOfLines={1}>
          {best.station.name || brandToString(best.station.brand)}
        </Text>
        <View style={styles.metaRow}>
          {best.price != null && (
            <Text style={styles.price}>{best.price.toFixed(1)}p <Text style={styles.fuelLabel}>{fuelLabel}</Text></Text>
          )}
          {best.dist && (
            <Text style={styles.meta}>
              <Ionicons name="location-outline" size={12} color={THEME.muted} /> {best.dist}
            </Text>
          )}
          {best.updated && (
            <Text style={styles.meta}>
              <Ionicons name="time-outline" size={12} color={THEME.muted} /> {best.updated}
            </Text>
          )}
        </View>
        <View style={styles.tagRow}>
          {best.tags.map((t, i) => (
            <View key={i} style={styles.tag}>
              <Ionicons name={t.icon} size={11} color={THEME.accent} />
              <Text style={styles.tagText}>{t.label}</Text>
            </View>
          ))}
        </View>
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
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, backgroundColor: THEME.tag,
  },
  tagText: { fontSize: 11, fontWeight: '600', color: THEME.accent, marginLeft: 4 },
});
