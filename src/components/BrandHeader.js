import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';
import { cheapestStationBrand } from '../lib/brandLeadership';
import { brandToString } from '../lib/brand';

/**
 * BrandHeader
 * Premium app header with a custom logo mark (fuel-drop + map-pin fusion),
 * a clean wordmark, and a dynamic subheading that surfaces brand leadership
 * insights when station data is available.
 *
 * Props:
 *   subtitle    - Fallback subtitle string (used when no brand data available)
 *   stations    - Array of station objects (passed from HomeScreen)
 *   fuelType    - Currently selected fuel type (e.g. 'petrol')
 *   onSearchPress
 *   theme
 *   showSearch
 *   pulse       - Activates loading breathing animation on the logo halo
 *
 * Pure RN primitives + @expo/vector-icons — no new dependencies.
 */
const DEFAULT_THEME = {
  bg: '#0D1117',
  surface: '#12172040',
  text: '#F5F7FA',
  muted: '#8B949E',
  accent: '#2ECC71',
  accentSoft: '#2ECC7122',
  border: '#30363D',
};

/**
 * LogoMark — bespoke fuel-nozzle SVG silhouette + spark accent.
 * 36×36 viewBox: thick handle stroke, curved hose, barrel, spark dot.
 * Replaces the stock lightning-bolt glyph introduced in polish bundle v2.
 * The outer breathing halo (pulse prop on BrandHeader) is unchanged.
 */
function LogoMark({ size = 36, accent = '#2ECC71' }) {
  return (
    <View
      accessible
      accessibilityLabel="FuelUK"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: accent + '22',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/*
        Bespoke pistol-grip fuel pump nozzle silhouette.
        Single closed filled path so the grip, barrel and tip read as one
        connected gun-shaped silhouette at small sizes (the previous
        multi-primitive version disintegrated into a deflated curl).
        Geometry on a 36×36 viewBox:
          - Top edge: barrel runs horizontally across the top half, with a
            short upward-angled nub at the right (the spout tip).
          - Right edge: spout tip descends to barrel base, then a step in.
          - Bottom edge: under-barrel, then drops down forming the pistol
            grip (slanted back-edge like a real pump handle).
          - Left edge: rises back up to close the shape.
          - A separate trigger guard rectangle is cut in front of the grip.
          - A droplet sits just below the spout tip for the "fuel" cue.
        Drawn from scratch; not derived from any icon library.
      */}
      <Svg width={size} height={size} viewBox="0 0 36 36">
        {/* Pistol-grip pump nozzle silhouette — single closed path */}
        <Path
          d="
            M 7 9
            L 23 9
            L 26 6
            L 29 6
            L 29 11
            L 26 13
            L 17 13
            L 17 18
            L 20 18
            L 20 21
            L 17 21
            L 17 27
            L 10 27
            L 7 18
            Z
          "
          fill={accent}
          strokeLinejoin="round"
        />
        {/* Trigger guard cut-out — small dark notch on the front of the grip */}
        <Path
          d="M 14 19 L 16 19 L 16 21 L 14 21 Z"
          fill="#0D1117"
        />
        {/* Fuel droplet below the spout tip — communicates "fuel" cleanly */}
        <Path
          d="M 27.5 15.5 C 26.6 17 26.4 18.4 27.5 18.6 C 28.6 18.4 28.4 17 27.5 15.5 Z"
          fill={accent}
        />
      </Svg>
    </View>
  );
}

/**
 * Build the dynamic subtitle string from brand leadership data.
 * Returns null when no meaningful brand insight is available.
 */
function buildBrandSubtitle(stations, fuelType) {
  if (!Array.isArray(stations) || stations.length === 0) return null;
  // Use the brand of the absolute cheapest station so the header agrees
  // with the "cheapest at X" body row. Previously we used the brand with
  // the lowest *average* price, which could disagree with the single
  // cheapest pin (e.g. header said "Gulf cheapest nearby" while the body
  // said "cheapest at Asda").
  const brand = cheapestStationBrand(stations, fuelType);
  if (!brand) return null;
  const brandName = brandToString(brand.brand);
  if (!brandName) return null;
  if (brand.leadByPence >= 0.5) {
    return `${brandName} leads by ${brand.leadByPence.toFixed(1)}p`;
  }
  return `${brandName} cheapest nearby`;
}

export default function BrandHeader({
  subtitle = 'Finding the best nearby fuel prices',
  stations,
  fuelType = 'unleaded',
  onSearchPress,
  theme = DEFAULT_THEME,
  showSearch = true,
  pulse = false,
}) {
  // Derive brand-leadership subtitle when station data is available.
  const brandSubtitle = useMemo(
    () => buildBrandSubtitle(stations, fuelType),
    [stations, fuelType]
  );
  const displaySubtitle = brandSubtitle || subtitle;

  // ── Logo halo pulse (loading state) ──────────────────────────────
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!pulse) { anim.setValue(0); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, anim]);

  const haloScale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const haloOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.0] });

  // ── Subtitle fade transition ──────────────────────────────────────
  // Each time displaySubtitle changes we fade out → update → fade in.
  const subtitleOpacity = useRef(new Animated.Value(1)).current;
  const prevSubtitle = useRef(displaySubtitle);

  useEffect(() => {
    if (prevSubtitle.current === displaySubtitle) return;
    Animated.sequence([
      Animated.timing(subtitleOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
    prevSubtitle.current = displaySubtitle;
  }, [displaySubtitle, subtitleOpacity]);

  return (
    <View style={[styles.wrap, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
      <View style={styles.row}>
        <View style={styles.logoBlock}>
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.accent,
              opacity: haloOpacity,
              transform: [{ scale: haloScale }],
            }}
          />
          <LogoMark size={36} accent={theme.accent} />
        </View>
        <View style={styles.textBlock}>
          <Text style={[styles.wordmark, { color: theme.text }]} numberOfLines={1}>
            Fuel<Text style={{ color: theme.accent }}>UK</Text>
          </Text>
          <Animated.Text
            style={[styles.subtitle, { color: theme.muted, opacity: subtitleOpacity }]}
            numberOfLines={1}
          >
            {displaySubtitle}
          </Animated.Text>
        </View>
        {showSearch && (
          <TouchableOpacity
            onPress={onSearchPress}
            accessibilityRole="button"
            accessibilityLabel="Search stations"
            style={[styles.searchBtn, { borderColor: theme.accent, backgroundColor: theme.accentSoft }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="search" size={18} color={theme.accent} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  logoBlock: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  textBlock: { flex: 1 },
  wordmark: { fontSize: 19, fontWeight: '700', letterSpacing: 0.2 },
  subtitle: { fontSize: 12, marginTop: 2, letterSpacing: 0.1 },
  searchBtn: {
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    marginLeft: 8,
  },
});
