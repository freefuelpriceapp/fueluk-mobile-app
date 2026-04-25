/**
 * InstantAnswerHeadline — the dashboard's primary one-line answer.
 *
 * Renders the cheapest nearby station for the user's fuel type, distance,
 * and per-tank saving. When no vehicle is set, falls back to UK average +
 * cheapest. Loading state uses a shimmer placeholder, never a spinner.
 *
 * Tappable → jumps to the station detail sheet for that station.
 *
 * The component is intentionally thin: HomeScreen passes the resolved
 * station + saving info as props, so all the source-of-truth logic lives
 * alongside the existing data fetch.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../lib/theme';
import { formatPencePerLitre, formatPounds } from '../lib/breakEven';
import { brandToString, safeText } from '../lib/brand';

const FUEL_LABELS = {
  petrol: 'petrol',
  diesel: 'diesel',
  e10: 'E10',
  super_unleaded: 'super unleaded',
  premium_diesel: 'premium diesel',
};

function Shimmer() {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <View style={styles.card} accessibilityLabel="Loading instant answer">
      <Animated.View style={[styles.shimmerLine, { opacity, width: '85%' }]} />
      <Animated.View style={[styles.shimmerLine, { opacity, width: '60%', marginTop: 8 }]} />
    </View>
  );
}

function distanceMiles(station) {
  if (!station) return null;
  const m = Number(station.distance_miles);
  if (Number.isFinite(m)) return m;
  const km = Number(station.distance_km);
  if (Number.isFinite(km)) return km / 1.60934;
  return null;
}

function priceFor(station, fuelType) {
  if (!station) return null;
  const direct = Number(station[`${fuelType}_price`]);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const viaPrices = station.prices ? Number(station.prices[fuelType]) : NaN;
  if (Number.isFinite(viaPrices) && viaPrices > 0) return viaPrices;
  return null;
}

export default function InstantAnswerHeadline({
  loading,
  station,
  fuelType = 'petrol',
  perTankSavingPence = null,
  hasVehicle = false,
  nationalAvgPence = null,
  onPress,
}) {
  if (loading) return <Shimmer />;

  const fuelLabel = FUEL_LABELS[fuelType] || fuelType;
  const price = priceFor(station, fuelType);
  const miles = distanceMiles(station);
  const brand = brandToString(station?.brand) || safeText(station?.name) || 'a station';

  // Fallback: no vehicle yet, but we have national avg + cheapest price.
  if (!hasVehicle && Number.isFinite(nationalAvgPence) && Number.isFinite(price)) {
    const avgStr = formatPencePerLitre(nationalAvgPence);
    const cheapStr = formatPencePerLitre(price);
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => onPress?.(station)}
        accessibilityRole="button"
        accessibilityLabel={`UK average ${fuelLabel} ${avgStr}, cheapest near you ${cheapStr}. Tap to view.`}
      >
        <Text style={styles.headline} numberOfLines={2}>
          Average UK {fuelLabel} today: {avgStr}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          cheapest near you: <Text style={styles.subAccent}>{cheapStr}</Text>
        </Text>
      </Pressable>
    );
  }

  // Primary path: we have a station + price.
  if (station && Number.isFinite(price)) {
    const priceStr = formatPencePerLitre(price);
    const milesStr = Number.isFinite(miles) ? `${miles.toFixed(1)} miles away` : null;
    const savingPounds =
      Number.isFinite(perTankSavingPence) && perTankSavingPence > 0
        ? perTankSavingPence / 100
        : null;
    const savingStr = savingPounds != null ? `saves ${formatPounds(savingPounds)}` : null;

    const tail = [milesStr, savingStr].filter(Boolean).join(' \u00B7 ');
    const a11y =
      `Cheapest ${fuelLabel} within 5 miles is ${priceStr} at ${brand}` +
      (tail ? `, ${tail}` : '') + '. Tap to view.';

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => onPress?.(station)}
        accessibilityRole="button"
        accessibilityLabel={a11y}
      >
        <Text style={styles.headline} numberOfLines={2}>
          The cheapest {fuelLabel} within 5 miles is{' '}
          <Text style={styles.headlinePrice}>{priceStr}</Text> at {brand}
        </Text>
        {tail ? (
          <Text style={styles.sub} numberOfLines={1}>
            {milesStr}
            {savingStr ? (
              <>
                {milesStr ? <Text> {'\u00B7'} </Text> : null}
                <Text style={styles.subAccent}>{savingStr}</Text>
              </>
            ) : null}
          </Text>
        ) : null}
      </Pressable>
    );
  }

  // Last-resort soft fallback — no station, no price.
  return (
    <View style={styles.card}>
      <Text style={styles.headline} numberOfLines={2}>
        Finding the best {fuelLabel} prices near you{'\u2026'}
      </Text>
      <View style={styles.subRow}>
        <Ionicons name="search-outline" size={12} color={COLORS.textSecondary} />
        <Text style={[styles.sub, { marginLeft: 4 }]}>One moment</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardPressed: { opacity: 0.85 },
  headline: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    color: COLORS.text,
  },
  headlinePrice: {
    color: COLORS.accent,
  },
  sub: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  subAccent: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  shimmerLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.border,
  },
});
