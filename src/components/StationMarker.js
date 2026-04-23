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
import { TRAJECTORY_ARROW } from '../lib/trajectory';
import { FEATURE_FLAGS } from '../config/featureFlags';

// v4: render the brand initial inside a visible 24x24 circle to the
// LEFT of the price.  The initial is derived from the first character
// of the brand name (uppercased), falling back to "?" for unknowns.
function brandInitial(brand) {
  if (!brand) return '?';
  const s = String(brand).trim();
  if (!s) return '?';
  const c = s.charAt(0).toUpperCase();
  return /[A-Z0-9]/.test(c) ? c : '?';
}

// Width budget for the "XXX.Xp" price label on Android.  The previous
// 3.85x multiplier was derived from iOS tabular-nums metrics and clipped
// variable-width Roboto glyphs on Android.  0.72x per char (worst case
// "888.8p") keeps the label fully inside its container.
const PRICE_CHAR_RATIO = 0.72;
const PRICE_LABEL_CHARS = 6;
function priceTextMinWidth(priceFont) {
  return Math.ceil(priceFont * PRICE_CHAR_RATIO * PRICE_LABEL_CHARS);
}

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
  onLongPress,
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
  const initial = brandInitial(brand);
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
      onLongPress={onLongPress ? () => onLongPress(station) : undefined}
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
          {FEATURE_FLAGS.trajectory &&
          (effectiveTier === PIN_TIER.CHEAPEST || effectiveTier === PIN_TIER.CHEAP) &&
          station?.trajectory &&
          (station.trajectory.direction === 'rising' || station.trajectory.direction === 'falling') &&
          (station.trajectory.confidence === 'high' || station.trajectory.confidence === 'medium') ? (
            <View style={styles.trajectoryCorner} pointerEvents="none">
              <Text
                style={[
                  styles.trajectoryArrow,
                  {
                    color:
                      station.trajectory.direction === 'falling' ? '#2ECC71' : '#F59E0B',
                  },
                ]}
                allowFontScaling={false}
              >
                {TRAJECTORY_ARROW[station.trajectory.direction]}
              </Text>
            </View>
          ) : null}

          {/* Row 1: brand-initial circle + price (hero).
              The circle sits IN-FLOW (no absolute positioning) so it
              never overlaps the price.  The price uses a worst-case
              width budget so the full "XXX.Xp" label always fits. */}
          <View style={styles.heroRow}>
            <View
              style={[
                styles.brandInitialCircle,
                { backgroundColor: chipColor },
              ]}
            >
              <Text
                style={styles.brandInitialText}
                numberOfLines={1}
                allowFontScaling={false}
              >
                {initial}
              </Text>
              {isSupermarket && (
                <View style={styles.supermarketDot} />
              )}
              {fuelDot && (
                <View style={[styles.fuelDot, { backgroundColor: fuelDot }]} />
              )}
            </View>
            <Text
              style={[
                styles.priceText,
                {
                  color: style.text,
                  fontSize: style.priceFont,
                  lineHeight: Math.round(style.priceFont * 1.1),
                  minWidth: priceTextMinWidth(style.priceFont),
                },
              ]}
              numberOfLines={1}
              ellipsizeMode="clip"
              allowFontScaling={false}
            >
              {priceLabel || ''}
            </Text>
          </View>

          {/* Row 2: brand name. Elevated tiers allow wrapping up to
              two lines; neutral/expensive stay on one line. */}
          {style.showBrand && brandLabel ? (
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
    textAlign: 'left',
    flexShrink: 0,
    flexGrow: 0,
    includeFontPadding: false,
    // NOTE: deliberately NO fontVariant: tabular-nums — on Android the
    // variant is ignored and the measurement pass still uses the default
    // (variable-width) glyph metrics, which means a min-width sized to
    // tabular widths clips the label on first paint.
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'flex-start',
  },
  brandInitialCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  brandInitialText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
  supermarketDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
    borderWidth: 1,
    borderColor: '#0B0F14',
  },
  fuelDot: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#0B0F14',
  },
  brandText: {
    fontWeight: '600',
    letterSpacing: 0.1,
    flexShrink: 0,
    maxWidth: 120,
    marginTop: 3,
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
  trajectoryCorner: {
    position: 'absolute',
    top: -6,
    left: -4,
    paddingHorizontal: 3,
    paddingVertical: 0,
    borderRadius: 6,
    backgroundColor: 'rgba(11,15,20,0.9)',
  },
  trajectoryArrow: {
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 13,
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
  const pt = prev.station && prev.station.trajectory;
  const nt = next.station && next.station.trajectory;
  if ((pt && pt.direction) !== (nt && nt.direction)) return false;
  if ((pt && pt.confidence) !== (nt && nt.confidence)) return false;
  return true;
}

export default memo(StationMarker, areEqual);
