/**
 * StationMarker.js
 *
 * Price-first map pin with tier-aware layouts. The price number is the
 * hero; a coloured brand chip + brand name sit beneath it. A triangular
 * tail points to the station's exact coordinate. Tier styling (cheapest,
 * cheap, middle, expensive, stale) is driven by the visible-station
 * cohort so it re-flows as the user pans/zooms.
 *
 * Layout strategy — NO TRUNCATION:
 *   The card uses an intrinsic layout (no fixed width). `minWidth` and
 *   padding come from the tier style; text can grow horizontally within
 *   maxWidth. Price always shows full "142.9p" format; brand shows the
 *   full name on elevated tiers (cheapest + cheap), ellipsised only for
 *   neutral / expensive where real estate is scarce.
 *
 * Motion:
 *   - staggered fade-in on first mount (honours reduce-motion)
 *   - gentle pulse on tier-1 (cheapest) pins
 *   - bounce on tap
 *   - reduce-motion: glow becomes a static shadow (no loop)
 *
 * Implausible prices never render — parsePrice returning null is a
 * last-defence quarantine so broken wire values like "1374" or "1666"
 * don't leak onto the map.
 */

import React, { memo, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { brandToString } from '../lib/brand';
import { parsePrice, formatPencePrice } from '../lib/price';
import {
  PIN_TIER,
  tierStyle,
  isStale,
  formatSavingsDelta,
} from '../lib/priceTiers';
import { brandColor, brandShortName, brandAbbrev } from '../lib/brandColors';

const FADE_DURATION = 200;
const STAGGER_PER_PIN = 15;
const MAX_STAGGER = 500;

const FUEL_DOT_COLORS = {
  e10:             '#4ADE80',
  petrol:          '#4ADE80',
  unleaded:        '#4ADE80',
  diesel:          '#0F172A',
  premium_diesel:  '#0F172A',
  e5:              '#60A5FA',
  super_unleaded:  '#60A5FA',
};

function fuelDotColor(fuelKey) {
  if (!fuelKey) return null;
  const k = String(fuelKey).toLowerCase();
  return FUEL_DOT_COLORS[k] || null;
}

function formatDistance(station) {
  const mi = typeof station?.distance_miles === 'number' && Number.isFinite(station.distance_miles)
    ? station.distance_miles
    : (typeof station?.distance_km === 'number' && Number.isFinite(station.distance_km)
        ? station.distance_km * 0.621371
        : null);
  if (mi == null) return null;
  if (mi < 10) return `${mi.toFixed(1)}mi`;
  return `${Math.round(mi)}mi`;
}

const StationMarker = ({
  station,
  cheapestPrice,
  tier,
  fuelType,
  savingsDelta = null,
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
  const isExpensive = effectiveTier === PIN_TIER.PRICEY;
  const brandLabel = isExpensive
    ? brandAbbrev(brand)
    : brandShortName(brand, style.brandMaxLen);
  const distLabel = style.showDistance ? formatDistance(station) : null;
  const deltaLabel = style.showDelta ? formatSavingsDelta(savingsDelta) : null;
  const fuelDot = fuelDotColor(station.fuel_type || fuelType);
  const isSupermarket = !!station.is_supermarket;

  // Animated values — created once per pin.
  const fadeAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // HOTFIX: on Android, tracksViewChanges=false snapshots the marker
  // before Text nodes have finished measuring, leaving the price
  // clipped to a single glyph. Track changes for the first ~400ms,
  // then freeze so we don't burn battery re-rasterising every frame.
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTracking(false), 400);
    return () => clearTimeout(t);
  }, [priceLabel]);

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

  // Pulse loop only for the cheapest tier. Reduce-motion skips the
  // loop; the tier style's static shadow glow remains.
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
  const deltaA11y = deltaLabel ? `, ${deltaLabel.replace('−', 'minus ').replace('+', 'plus ')} vs area average` : '';
  const distA11y = station.distance_km != null
    ? `, ${station.distance_km.toFixed(1)} kilometres away`
    : '';
  const a11yLabel = `${brand || 'Station'} petrol, ${priceWords} pence per litre${distA11y}${deltaA11y}${cheapestTag}`;

  const composedScale = Animated.multiply(
    scaleAnim,
    Animated.multiply(pulseAnim, style.scale),
  );

  return (
    <Marker
      coordinate={{ latitude: markerLat, longitude: markerLng }}
      onPress={handlePress}
      tracksViewChanges={tracking}
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
              minWidth: style.minWidth,
              paddingHorizontal: style.paddingH,
              paddingVertical: style.paddingV,
              backgroundColor: style.bg,
              borderColor: style.border,
              borderWidth: style.borderWidth,
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

          {/* Row 1: price (hero). Always full format, never truncated. */}
          <Text
            style={[
              styles.priceText,
              {
                color: style.text,
                fontSize: style.priceFont,
                lineHeight: Math.round(style.priceFont * 1.1),
                minWidth: Math.round(style.priceFont * 3.85),
              },
            ]}
            numberOfLines={1}
            ellipsizeMode="clip"
            allowFontScaling={false}
          >
            {priceLabel || ''}
          </Text>

          {/* Row 2: brand chip + name. Elevated tiers allow wrapping up to
              two lines; neutral/expensive stay on one line. */}
          {style.showBrand && brandLabel ? (
            <View style={styles.brandRow}>
              <View style={[styles.brandChip, { backgroundColor: chipColor }]}>
                {isSupermarket && (
                  <View style={styles.supermarketDot} />
                )}
                {fuelDot && (
                  <View style={[styles.fuelDot, { backgroundColor: fuelDot }]} />
                )}
              </View>
              <Text
                style={[
                  styles.brandText,
                  { color: style.subText, fontSize: style.brandFont },
                ]}
                numberOfLines={effectiveTier === PIN_TIER.CHEAPEST ? 2 : 1}
                allowFontScaling={false}
              >
                {brandLabel}
              </Text>
            </View>
          ) : null}

          {/* Row 3: savings delta (elevated tiers only, when > threshold). */}
          {deltaLabel && (
            <Text
              style={[
                styles.deltaText,
                { color: style.deltaText },
              ]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {deltaLabel} vs area
            </Text>
          )}

          {/* Row 4: distance label (elevated tiers only). */}
          {distLabel && (
            <Text
              style={[
                styles.distText,
                { color: style.subText },
              ]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {distLabel}
            </Text>
          )}
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
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  tag: {
    borderRadius: 10,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    flexGrow: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    // "lifted" top-edge highlight — faintly lighter to add depth
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  tagSelected: {
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 12,
    borderColor: '#FFFFFF',
  },
  tagGlow: {
    shadowColor: '#10B981',
    shadowOpacity: 0.55,
    shadowRadius: 8,
    elevation: 10,
  },
  priceText: {
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
    flexShrink: 0,
    flexGrow: 0,
    includeFontPadding: false,
    fontVariant: ['tabular-nums'],
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    maxWidth: 120,
  },
  brandChip: {
    width: 10,
    height: 10,
    borderRadius: 3,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  supermarketDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F59E0B',
    borderWidth: 0.5,
    borderColor: '#0B0F14',
  },
  fuelDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: '#0B0F14',
  },
  brandText: {
    fontWeight: '600',
    letterSpacing: 0.1,
    flexShrink: 0,
    maxWidth: 100,
    includeFontPadding: false,
  },
  deltaText: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  distText: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
    opacity: 0.85,
    textAlign: 'center',
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
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
  if (prev.fuelType !== next.fuelType) return false;
  if (prev.savingsDelta !== next.savingsDelta) return false;
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
