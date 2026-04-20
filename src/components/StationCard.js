import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolvePrice, evaluateStation } from '../lib/quarantine';
import {
  getFreshness,
  FRESHNESS_COLOR,
  formatSource,
  getSourceDotColor,
} from '../lib/trust';
import { COLORS, FUEL_COLORS, SPACING, FONT_SIZES } from '../lib/theme';
import { mediumHaptic } from '../lib/haptics';

const FAVOURITES_KEY = 'user_favourites';

const FUEL_LABELS = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  e10: 'E10',
  super_unleaded: 'Super Unleaded',
  premium_diesel: 'Premium Diesel',
};

const SOURCE_FIELD = {
  petrol: 'petrol_source',
  diesel: 'diesel_source',
  e10: 'e10_source',
  super_unleaded: 'super_unleaded_source',
  premium_diesel: 'premium_diesel_source',
};

const SOURCE_SHORT_LABEL = {
  fuel_finder: 'Fuel Finder',
  gov: 'GOV',
  partner: 'Partner',
  user: 'Community',
  community: 'Community',
};

const QUARANTINE_LABEL = {
  out_of_range: '\u26A0 Unverified',
  too_old: '\u26A0 Old data',
  deviates_from_cohort: '\u26A0 Check price',
  flagged_upstream: '\u26A0 Under review',
};

function getSourceShortLabel(rawSource) {
  if (!rawSource || typeof rawSource !== 'string') return null;
  const s = rawSource.trim().toLowerCase();
  if (!s) return null;
  for (const key of Object.keys(SOURCE_SHORT_LABEL)) {
    if (s.includes(key)) return SOURCE_SHORT_LABEL[key];
  }
  return null;
}

function formatDistance(km) {
  if (km == null) return null;
  const miles = km * 0.621371;
  if (miles < 0.1) return null;
  return `${miles.toFixed(1)} mi`;
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
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(FAVOURITES_KEY).then((stored) => {
      if (!mounted) return;
      const favs = stored ? JSON.parse(stored) : [];
      setIsFavourite(
        Array.isArray(favs) &&
        favs.some((s) => (typeof s === 'object' ? s?.id === id : s === id))
      );
    });
    return () => { mounted = false; };
  }, [id]);

  const toggleFavourite = async (e) => {
    e.stopPropagation?.();
    const stored = await AsyncStorage.getItem(FAVOURITES_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    // Strip legacy ID-only entries; keep objects.
    let favs = Array.isArray(parsed)
      ? parsed.filter((s) => s && typeof s === 'object' && s.id != null)
      : [];
    if (isFavourite) {
      favs = favs.filter((s) => s.id !== id);
    } else {
      favs = [...favs.filter((s) => s.id !== id), station];
    }
    await AsyncStorage.setItem(FAVOURITES_KEY, JSON.stringify(favs));
    setIsFavourite(!isFavourite);
    mediumHaptic();
  };

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  const selectedPrice = resolvePrice(station, fuelType);
  const selectedColor = FUEL_COLORS[fuelType] ?? COLORS.accent;
  const distanceLabel = formatDistance(distance_km);

  // Quarantine evaluation for the primary fuel
  const evalResult = evaluateStation(station, fuelType) || {};
  const isQuarantined = !!evalResult.quarantined;
  const quarantineReason = evalResult.reason;
  const quarantineLabel =
    isQuarantined && quarantineReason && quarantineReason !== 'missing_price'
      ? QUARANTINE_LABEL[quarantineReason] || null
      : null;
  const primaryDimmed =
    isQuarantined && quarantineReason && quarantineReason !== 'missing_price';

  // Freshness
  const freshness = getFreshness(last_updated || updated_at);
  const freshnessColor = FRESHNESS_COLOR[freshness.tier] ?? FRESHNESS_COLOR.unknown;
  const hasAccentBorder =
    freshness.tier === 'stale' || freshness.tier === 'needs_caution';

  // Per-fuel source for selected fuel
  const sourceField = SOURCE_FIELD[fuelType];
  const fuelSource =
    (sourceField && station?.[sourceField]) || source || null;
  const sourceLabel = fuelSource ? formatSource(fuelSource) : null;
  const sourceDot = getSourceDotColor(fuelSource);
  const sourceShort = getSourceShortLabel(fuelSource);

  const trustLine = sourceLabel
    ? `${freshness.label} \u00B7 ${sourceLabel}`
    : freshness.label;

  // Build other-fuel entries
  const otherFuels = Object.keys(FUEL_LABELS)
    .filter((ft) => ft !== fuelType)
    .map((ft) => {
      const ppl = resolvePrice(station, ft);
      const srcField = SOURCE_FIELD[ft];
      const rawSrc = (srcField && station?.[srcField]) || null;
      const dot = getSourceDotColor(rawSrc);
      const q = evaluateStation(station, ft) || {};
      const dimmed =
        q.quarantined && q.reason && q.reason !== 'missing_price';
      return { ft, ppl, dot, dimmed };
    })
    .filter(({ ppl }) => ppl !== null)
    .slice(0, 2);

  const cardStyle = [
    styles.card,
    hasAccentBorder && {
      borderLeftWidth: 3,
      borderLeftColor: freshnessColor,
    },
    { transform: [{ scale: pressScale }] },
  ];

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
    <Animated.View style={cardStyle}>
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
              color={isFavourite ? COLORS.error : COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Station name + address */}
      <Text style={styles.name}>{name}</Text>
      {address ? <Text style={styles.address}>{address}</Text> : null}

      {/* Primary price for selected fuel type */}
      <View style={styles.priceRow}>
        <View
          style={[
            styles.primaryPriceBadge,
            { borderColor: selectedColor },
            primaryDimmed && { opacity: 0.5 },
          ]}
        >
          <Text style={styles.primaryFuelLabel}>
            {FUEL_LABELS[fuelType] ?? fuelType}
          </Text>
          <Text style={[styles.primaryPrice, { color: selectedColor }]}>
            {selectedPrice !== null
              ? `${selectedPrice.toFixed(1)}p`
              : 'N/A'}
          </Text>
          {sourceDot ? (
            <View style={styles.sourceBadgeRow}>
              <View
                style={[styles.sourceDot, { backgroundColor: sourceDot }]}
              />
              {sourceShort ? (
                <Text style={[styles.sourceBadgeText, { color: sourceDot }]}>
                  {sourceShort}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Quarantine warning + other fuel prices */}
        <View style={styles.otherPrices}>
          {quarantineLabel ? (
            <Text style={styles.quarantineLabel}>{quarantineLabel}</Text>
          ) : null}
          <View style={styles.otherChipsRow}>
            {otherFuels.map(({ ft, ppl, dot, dimmed }) => (
              <View
                key={ft}
                style={[styles.otherChip, dimmed && { opacity: 0.5 }]}
              >
                <View style={styles.otherChipHeader}>
                  {dot ? (
                    <View
                      style={[styles.otherSourceDot, { backgroundColor: dot }]}
                    />
                  ) : null}
                  <Text style={styles.otherFuelLabel}>
                    {FUEL_LABELS[ft] ?? ft}
                  </Text>
                </View>
                <Text style={styles.otherPrice}>
                  {ppl !== null ? `${ppl.toFixed(1)}p` : 'N/A'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Trust line: freshness dot + text + source */}
      <View style={styles.freshnessRow}>
        <View
          style={[styles.freshnessDot, { backgroundColor: freshnessColor }]}
        />
        <Text style={[styles.freshnessText, { color: freshnessColor }]}>
          {trustLine}
        </Text>
      </View>
    </Animated.View>
    </Pressable>
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
    color: COLORS.textMuted,
    marginBottom: SPACING.sm + 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  sourceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  sourceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sourceBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  otherPrices: {
    flex: 1,
  },
  quarantineLabel: {
    fontSize: 9,
    color: COLORS.warning,
    fontWeight: '600',
    marginBottom: 4,
  },
  otherChipsRow: {
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
  otherChipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  otherSourceDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  otherFuelLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  otherPrice: {
    fontSize: FONT_SIZES.md - 1,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  freshnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  freshnessDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  freshnessText: {
    fontSize: FONT_SIZES.xs,
  },
});

export default StationCard;
