/**
 * StationMarker.js
 *
 * Custom pill-shaped pin with pointer tail, a coloured brand-dot on the
 * left edge, and a bold price label. Colours vary by tier (cheap /
 * mid / expensive / stale) and the selected pin scales 1.15x with a
 * subtle glow. See src/lib/markerStyle.js for the tier logic.
 *
 * Implausible prices never render — parsePrice returning null is a
 * last-defence quarantine so broken wire values like "1374" or "1666"
 * don't leak onto the map.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { brandToString } from '../lib/brand';
import { parsePrice, formatPencePrice } from '../lib/price';
import { priceTier, markerVisuals, TIER } from '../lib/markerStyle';
import { brandColor, brandInitial } from '../lib/brandColor';

const StationMarker = ({
  station,
  cheapestPrice,
  fuelType,
  onPress,
  isCheapest,
  isSelected,
  cohort,
}) => {
  const priceLabel = formatPencePrice(cheapestPrice);
  const price = parsePrice(cheapestPrice);

  // Implausible → quarantine client-side, skip the marker entirely.
  if (price === null) return null;

  const markerLat = Number(station.lat ?? station.latitude);
  const markerLng = Number(station.lon ?? station.lng ?? station.longitude);
  if (!Number.isFinite(markerLat) || !Number.isFinite(markerLng)) return null;

  const tier = isCheapest
    ? TIER.CHEAP
    : priceTier({
        price,
        cohort,
        lastUpdatedIso: station.last_updated,
      });

  const visuals = markerVisuals({ tier, isSelected });
  const brand = brandToString(station.brand);
  const dotColor = brandColor(brand);

  const priceWords = price.toFixed(1).replace('.', ' point ');
  const a11yLabel = `${brand || 'Station'}, ${priceWords} pence per litre${
    station.distance_km != null ? `, ${station.distance_km.toFixed(1)} kilometres away` : ''
  }`;

  return (
    <Marker
      coordinate={{ latitude: markerLat, longitude: markerLng }}
      onPress={() => onPress && onPress(station)}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 1 }}
      accessibilityLabel={a11yLabel}
    >
      <View
        style={[
          styles.wrapper,
          { opacity: visuals.opacity, transform: [{ scale: visuals.scale }] },
        ]}
      >
        <View
          style={[
            styles.pill,
            { backgroundColor: visuals.bg },
            isSelected && styles.pillSelected,
            visuals.glow && styles.pillGlow,
          ]}
        >
          <View style={[styles.dot, { backgroundColor: dotColor }]}>
            <Text style={styles.dotText}>{brandInitial(brand)}</Text>
          </View>
          <Text style={[styles.priceText, { color: visuals.text }]} numberOfLines={1}>
            {priceLabel}
          </Text>
        </View>
        <View
          style={[
            styles.tail,
            { borderTopColor: visuals.bg },
            visuals.glow && styles.tailGlow,
          ]}
        />
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingLeft: 3,
    paddingRight: 10,
    paddingVertical: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  pillSelected: {
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },
  pillGlow: {
    shadowColor: '#10B981',
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 8,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  dotText: {
    color: '#0B0F14',
    fontSize: 10,
    fontWeight: '800',
  },
  priceText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  tailGlow: {
    shadowColor: '#10B981',
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
});

export default memo(StationMarker);
