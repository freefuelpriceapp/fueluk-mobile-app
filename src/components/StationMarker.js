/**
 * StationMarker.js
 *
 * Price-first map pin. The price number is the hero; a coloured brand
 * chip + short brand name sit beneath it. A triangular tail points to
 * the station's exact coordinate. Tier styling (cheapest, cheap,
 * middle, expensive, stale) is driven by the visible-station cohort so
 * it re-flows as the user pans/zooms.
 *
 * Motion:
 *   - staggered fade-in on first mount (honours reduce-motion)
 *   - gentle pulse on tier-1 (cheapest) pins
 *   - bounce on tap
 *
 * Implausible prices never render — parsePrice returning null is a
 * last-defence quarantine so broken wire values like "1374" or "1666"
 * don't leak onto the map.
 */

import React, { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { brandToString } from '../lib/brand';
import { parsePrice, formatPencePrice } from '../lib/price';
import { PIN_TIER, tierStyle, isStale } from '../lib/priceTiers';
import { brandColor, brandShortName } from '../lib/brandColors';

const FADE_DURATION = 200;
const STAGGER_PER_PIN = 15;
const MAX_STAGGER = 500;

const StationMarker = ({
  station,
  cheapestPrice,
  tier,
  onPress,
  isSelected,
  staggerIndex = 0,
  reduceMotion = false,
}) => {
  const priceLabel = formatPencePrice(cheapestPrice);
  const price = parsePrice(cheapestPrice);

  // Quarantine: drop pins that can't be parsed to a plausible price.
  if (price === null) return null;

  const markerLat = Number(station.lat ?? station.latitude);
  const markerLng = Number(station.lon ?? station.lng ?? station.longitude);
  if (!Number.isFinite(markerLat) || !Number.isFinite(markerLng)) return null;

  const stale = isStale(station.last_updated);
  const effectiveTier = stale ? PIN_TIER.STALE : (tier || PIN_TIER.MID);
  const style = tierStyle(effectiveTier);

  const brand = brandToString(station.brand);
  const chipColor = brandColor(brand);
  const shortBrand = brandShortName(brand, 8);

  // Animated values — created once per pin.
  const fadeAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Stagger fade-in on mount. Cap total stagger so panning/zooming
  // doesn't introduce user-perceptible lag.
  useEffect(() => {
    if (reduceMotion) {
      fadeAnim.setValue(1);
      return;
    }
    const delay = Math.min(staggerIndex * STAGGER_PER_PIN, MAX_STAGGER);
    const anim = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: FADE_DURATION,
      delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    // staggerIndex intentionally excluded — we only stagger on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pulse loop only for the cheapest tier.
  useEffect(() => {
    if (reduceMotion || effectiveTier !== PIN_TIER.CHEAPEST) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [effectiveTier, reduceMotion, pulseAnim]);

  const handlePress = () => {
    if (!reduceMotion) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
    if (onPress) onPress(station);
  };

  const priceWords = price.toFixed(1).replace('.', ' point ');
  const cheapestTag = effectiveTier === PIN_TIER.CHEAPEST ? ', cheapest nearby' : '';
  const distTag = station.distance_km != null
    ? `, ${station.distance_km.toFixed(1)} kilometres away`
    : '';
  const a11yLabel = `${brand || 'Station'} petrol, ${priceWords} pence per litre${distTag}${cheapestTag}`;

  const isCheapestTier = effectiveTier === PIN_TIER.CHEAPEST;
  const tagWidth = isCheapestTier ? 72 : 66;
  const tagMinHeight = isCheapestTier ? 44 : 40;

  const composedScale = Animated.multiply(
    scaleAnim,
    Animated.multiply(pulseAnim, style.scale),
  );

  return (
    <Marker
      coordinate={{ latitude: markerLat, longitude: markerLng }}
      onPress={handlePress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 1 }}
      accessibilityLabel={a11yLabel}
    >
      <Animated.View
        style={[
          styles.wrapper,
          {
            opacity: Animated.multiply(fadeAnim, style.opacity),
            transform: [{ scale: composedScale }],
          },
        ]}
      >
        <View
          style={[
            styles.tag,
            {
              width: tagWidth,
              minHeight: tagMinHeight,
              backgroundColor: style.bg,
              borderColor: style.border,
            },
            isSelected && styles.tagSelected,
            style.glow && styles.tagGlow,
          ]}
        >
          {stale && (
            <View style={styles.staleBadge}>
              <Ionicons name="time-outline" size={10} color="#E5E7EB" />
            </View>
          )}
          <Text style={[styles.priceText, { color: style.text }]} numberOfLines={1}>
            {priceLabel || ''}
          </Text>
          <View style={styles.brandRow}>
            <View style={[styles.brandChip, { backgroundColor: chipColor }]} />
            <Text
              style={[styles.brandText, { color: style.subText }]}
              numberOfLines={1}
            >
              {shortBrand || 'Station'}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.tail,
            { borderTopColor: style.bg },
          ]}
        />
      </Animated.View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tag: {
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  tagSelected: {
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
    borderColor: '#FFFFFF',
  },
  tagGlow: {
    shadowColor: '#10B981',
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 8,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 16,
    textAlign: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    maxWidth: '100%',
  },
  brandChip: {
    width: 8,
    height: 8,
    borderRadius: 2,
    marginRight: 4,
  },
  brandText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  staleBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
});

function areEqual(prev, next) {
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.tier !== next.tier) return false;
  if (prev.reduceMotion !== next.reduceMotion) return false;
  if (prev.cheapestPrice !== next.cheapestPrice) return false;
  const pb = prev.station && prev.station.brand;
  const nb = next.station && next.station.brand;
  if (pb !== nb) return false;
  const pid = prev.station && prev.station.id;
  const nid = next.station && next.station.id;
  if (pid !== nid) return false;
  const plu = prev.station && prev.station.last_updated;
  const nlu = next.station && next.station.last_updated;
  if (plu !== nlu) return false;
  return true;
}

export default memo(StationMarker, areEqual);
