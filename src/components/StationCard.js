import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolvePrice } from '../lib/quarantine';
import { getFreshness, FRESHNESS_COLOR, formatSource } from '../lib/trust';
import { COLORS, FUEL_COLORS, SPACING, FONT_SIZES } from '../lib/theme';

const FAVOURITES_KEY = 'user_favourites';

const FUEL_LABELS = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  e10: 'E10',
  super_unleaded: 'Super Unleaded',
  premium_diesel: 'Premium Diesel',
};

function formatDistance(km) {
  if (km == null) return null;
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

const StationCard = ({ station, fuelType = 'petrol', onPress }) => {
  const {
    id,
    name,
    brand,
    address,
    distance_km,
    last_updated,
    updated_at,
    source,
  } = station;

  const [isFavourite, setIsFavourite] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(FAVOURITES_KEY).then((stored) => {
      if (!mounted) return;
      const favs = stored ? JSON.parse(stored) : [];
      setIsFavourite(favs.some((s) => s.id === id));
    });
    return () => { mounted = false; };
  }, [id]);

  const toggleFavourite = async (e) => {
    e.stopPropagation?.();
    const stored = await AsyncStorage.getItem(FAVOURITES_KEY);
    let favs = stored ? JSON.parse(stored) : [];
    if (isFavourite) {
      favs = favs.filter((s) => s.id !== id);
    } else {
      favs.push(station);
    }
    await AsyncStorage.setItem(FAVOURITES_KEY, JSON.stringify(favs));
    setIsFavourite(!isFavourite);
  };

  const selectedPrice = resolvePrice(station, fuelType);
  const selectedColor = FUEL_COLORS[fuelType] ?? COLORS.accent;
  const distanceLabel = formatDistance(distance_km);

  // Trust / freshness
  const freshness = getFreshness(last_updated || updated_at);
  const freshnessColor = FRESHNESS_COLOR[freshness.tier] ?? FRESHNESS_COLOR.unknown;
  const sourceLabel = source ? formatSource(source) : null;
  const trustLine = sourceLabel
    ? `${freshness.label} · ${sourceLabel}`
    : freshness.label;

  // Build other-fuel entries
  const otherFuels = Object.keys(FUEL_LABELS)
    .filter((ft) => ft !== fuelType)
    .map((ft) => ({ ft, ppl: resolvePrice(station, ft) }))
    .filter(({ ppl }) => ppl !== null)
    .slice(0, 2);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.78}>
      {/* Top row: brand + distance + favourite */}
      <View style={styles.topRow}>
        <Text style={styles.brand}>{brand ?? 'Unknown'}</Text>
        <View style={styles.topRight}>
          {distanceLabel ? (
            <View style={styles.distanceBadge}>
              <Ionicons name="navigate-outline" size={11} color={COLORS.textSecondary} />
              <Text style={styles.distanceText}>{distanceLabel}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            onPress={toggleFavourite}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.favBtn}
          >
            <Ionicons
              name={isFavourite ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavourite ? COLORS.error : '#555'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Station name + address */}
      <Text style={styles.name}>{name}</Text>
      {address ? <Text style={styles.address}>{address}</Text> : null}

      {/* Primary price for selected fuel type */}
      <View style={styles.priceRow}>
        <View style={[styles.primaryPriceBadge, { borderColor: selectedColor }]}>
          <Text style={styles.primaryFuelLabel}>
            {FUEL_LABELS[fuelType] ?? fuelType}
          </Text>
          <Text style={[styles.primaryPrice, { color: selectedColor }]}>
            {selectedPrice !== null
              ? `${selectedPrice.toFixed(1)}p`
              : 'N/A'}
          </Text>
        </View>

        {/* Other fuel prices at smaller size */}
        <View style={styles.otherPrices}>
          {otherFuels.map(({ ft, ppl }) => (
            <View key={ft} style={styles.otherChip}>
              <Text style={styles.otherFuelLabel}>{FUEL_LABELS[ft] ?? ft}</Text>
              <Text style={styles.otherPrice}>
                {ppl !== null ? `${ppl.toFixed(1)}p` : 'N/A'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Trust line: freshness + source */}
      <View style={styles.freshnessRow}>
        <Ionicons name="time-outline" size={11} color={freshnessColor} />
        <Text style={[styles.freshnessText, { color: freshnessColor }]}>{trustLine}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: SPACING.lg,
    marginBottom: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  brand: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  distanceText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  favBtn: {
    padding: 2,
  },
  name: {
    fontSize: FONT_SIZES.lg - 1,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  address: {
    fontSize: FONT_SIZES.sm,
    color: '#666',
    marginBottom: SPACING.sm + 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  primaryPriceBadge: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm - 2,
    alignItems: 'center',
    minWidth: 72,
  },
  primaryFuelLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  primaryPrice: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    marginTop: 1,
  },
  otherPrices: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  otherChip: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
  },
  otherFuelLabel: {
    fontSize: 9,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  otherPrice: {
    fontSize: FONT_SIZES.md - 1,
    fontWeight: '600',
    color: '#aaa',
    marginTop: 1,
  },
  freshnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  freshnessText: {
    fontSize: FONT_SIZES.xs,
  },
});

export default StationCard;
