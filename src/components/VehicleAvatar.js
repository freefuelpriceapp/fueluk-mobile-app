import React, { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path, Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { colourFromDvla } from '../lib/vehicleColourMap';
import { resolveBodyType } from '../lib/vehicleBodyType';
import { makeBadgeFor } from '../lib/vehicleMakeBadge';
import { buildAvatarAccessibilityLabel } from '../lib/vehicleAvatarA11y';

export { buildAvatarAccessibilityLabel };

/**
 * VehicleAvatar — a small personalised visual for the PersonalisationChip.
 *
 * Composes a colour-tinted body silhouette (one of 8 UK body types) with a
 * manufacturer letter-badge overlapping the front. Sizing is driven by the
 * `size` prop (width in px) so the chip can shrink on small devices.
 *
 * All props are optional — missing data gracefully degrades:
 *   - missing colour   → neutral grey silhouette
 *   - missing bodyType → derived from `model` if provided, else saloon
 *   - missing make     → neutral ? badge (or hidden when `showBadge=false`)
 *
 * Polish bundle v1 additions:
 *   - Radial gradient on badge bg (brand colour → 15% darker at edges)
 *   - 1px inner ring at 30% opacity for depth
 *   - Optional subtle glow halo animated breath (2s loop) when `fresh` prop is true
 *
 * The component is memoised because it re-renders under the chip on every
 * vehicle-field change.
 */

const SILHOUETTES = {
  saloon:
    'M6,28 L14,18 C20,12 30,10 50,10 L66,10 C76,10 84,14 90,20 L94,28 L6,28 Z',
  hatchback:
    'M6,28 L12,20 C18,14 28,12 46,12 L64,12 C74,12 82,16 88,22 L92,28 L6,28 Z',
  estate:
    'M4,28 L10,18 C16,12 26,10 48,10 L78,10 C86,10 92,14 94,22 L94,28 L4,28 Z',
  suv:
    'M6,28 L10,14 C14,8 24,6 44,6 L66,6 C78,6 86,10 90,18 L94,28 L6,28 Z',
  coupe:
    'M4,28 L12,22 C20,14 34,12 52,12 L68,12 C78,12 86,16 92,22 L94,28 L4,28 Z',
  convertible:
    'M4,28 L14,22 L24,20 L40,20 L52,18 L68,18 L80,20 L92,22 L94,28 L4,28 Z',
  van:
    'M4,28 L6,8 C6,6 8,6 10,6 L78,6 C86,6 90,10 92,18 L94,28 L4,28 Z',
  pickup:
    'M4,28 L10,14 C14,10 22,8 38,8 L50,8 C52,8 54,10 54,12 L54,22 L94,22 L94,28 L4,28 Z',
};

const ACCENT_WINDOWS = {
  saloon:      'M20,18 L34,12 L58,12 L72,18 Z',
  hatchback:   'M22,20 L36,14 L58,14 L70,20 Z',
  estate:      'M16,18 L30,12 L76,12 L82,18 Z',
  suv:         'M18,16 L32,10 L62,10 L78,16 Z',
  coupe:       'M22,22 L40,14 L62,14 L78,22 Z',
  convertible: '',
  van:         'M14,14 L14,8 L40,8 L40,14 Z',
  pickup:      'M18,16 L30,10 L48,10 L48,20 Z',
};

function darker(hex) {
  if (typeof hex !== 'string' || !hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) {
    return 'rgba(0,0,0,0.35)';
  }
  const full = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const r = Math.max(0, Math.round(parseInt(full.slice(1, 3), 16) * 0.6));
  const g = Math.max(0, Math.round(parseInt(full.slice(3, 5), 16) * 0.6));
  const b = Math.max(0, Math.round(parseInt(full.slice(5, 7), 16) * 0.6));
  return `rgb(${r},${g},${b})`;
}

/**
 * Darken a hex colour by `factor` (0–1). Returns hex string.
 * Used to derive the radial gradient edge colour on the badge.
 */
function darkenHex(hex, factor = 0.15) {
  if (typeof hex !== 'string' || !hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) {
    return hex;
  }
  const full = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  const r = Math.max(0, Math.round(parseInt(full.slice(1, 3), 16) * (1 - factor)));
  const g = Math.max(0, Math.round(parseInt(full.slice(3, 5), 16) * (1 - factor)));
  const b = Math.max(0, Math.round(parseInt(full.slice(5, 7), 16) * (1 - factor)));
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function Silhouette({ bodyType, colour, width, height }) {
  const path = SILHOUETTES[bodyType] || SILHOUETTES.saloon;
  const windowPath = ACCENT_WINDOWS[bodyType];
  const shade = darker(colour);
  return (
    <Svg width={width} height={height} viewBox="0 0 100 40" pointerEvents="none">
      <Path d={path} fill={colour} />
      {windowPath ? <Path d={windowPath} fill={shade} opacity={0.75} /> : null}
    </Svg>
  );
}

/**
 * BadgeCircle — the letter badge rendered as an SVG circle with a subtle
 * radial gradient (centre = brand colour, edge = 15% darker) and a 1px
 * inner ring at 30% opacity for depth.
 */
function BadgeCircle({ size, bg, fg, initial, fontSize }) {
  const darkEdge = darkenHex(bg, 0.15);
  const r = size / 2;
  const gradId = `badge-grad-${initial || 'x'}`;
  const ringId = `badge-ring-${initial || 'x'}`;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} pointerEvents="none">
      <Defs>
        <RadialGradient id={gradId} cx="40%" cy="35%" r="65%" fx="40%" fy="35%">
          <Stop offset="0%" stopColor={bg} stopOpacity="1" />
          <Stop offset="100%" stopColor={darkEdge} stopOpacity="1" />
        </RadialGradient>
      </Defs>
      {/* Background circle with gradient */}
      <Circle cx={r} cy={r} r={r} fill={`url(#${gradId})`} />
      {/* Inner ring — 1px stroke at 30% white opacity for depth */}
      <Circle
        cx={r}
        cy={r}
        r={r - 1}
        fill="none"
        stroke={fg}
        strokeWidth={1}
        strokeOpacity={0.3}
      />
    </Svg>
  );
}

/**
 * GlowHalo — animated breathing opacity ring around the badge.
 * Renders only when `visible` is true (i.e. when vehicle data is fresh).
 * Uses Animated.loop with a sequence to pulse 0.15 → 0.55 → 0.15 over 2s.
 */
function GlowHalo({ size, colour, visible }) {
  const opacityAnim = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    if (!visible) {
      opacityAnim.setValue(0);
      return;
    }
    opacityAnim.setValue(0.15);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.55,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.15,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, opacityAnim]);

  if (!visible) return null;

  const haloSize = size + 8;
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: opacityAnim,
          alignItems: 'center',
          justifyContent: 'center',
          // Expand beyond the badge bounds
          top: -4,
          left: -4,
          right: -4,
          bottom: -4,
        },
      ]}
      pointerEvents="none"
    >
      <Svg
        width={haloSize}
        height={haloSize}
        viewBox={`0 0 ${haloSize} ${haloSize}`}
        pointerEvents="none"
      >
        <Circle
          cx={haloSize / 2}
          cy={haloSize / 2}
          r={haloSize / 2 - 1}
          fill="none"
          stroke={colour}
          strokeWidth={3}
          strokeOpacity={1}
        />
      </Svg>
    </Animated.View>
  );
}

function VehicleAvatarImpl({
  make,
  model,
  colour,
  bodyType,
  year,
  size = 44,
  showBadge = true,
  fresh = false,
  style,
  accessibilityLabel: a11yOverride,
}) {
  if (!make && !model && !colour && !bodyType) return null;

  const resolvedBody = bodyType || resolveBodyType({ model });
  const fill = colourFromDvla(colour);
  const badge = showBadge ? makeBadgeFor(make) : null;

  // Silhouette aspect ratio is 100:40 = 2.5
  const width = size;
  const height = Math.round(size / 2.5);

  const badgeSize = Math.max(14, Math.round(size * 0.42));
  const badgeFontSize = Math.round(badgeSize * 0.55);

  const a11y = a11yOverride || buildAvatarAccessibilityLabel({
    make, model, colour, bodyType: resolvedBody, year,
  });

  return (
    <View
      style={[styles.wrap, { width, height: Math.max(height, badgeSize) }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={a11y}
      testID="vehicle-avatar"
    >
      <View style={styles.silhouette}>
        <Silhouette bodyType={resolvedBody} colour={fill} width={width} height={height} />
      </View>
      {badge ? (
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              // Background is now handled by the SVG gradient; use transparent here.
              backgroundColor: 'transparent',
              overflow: 'visible',
            },
          ]}
          testID="vehicle-avatar-badge"
        >
          {/* Glow halo — only when vehicle data is fresh */}
          <GlowHalo size={badgeSize} colour={badge.bg} visible={fresh} />
          {/* Badge circle with gradient + inner ring */}
          <BadgeCircle
            size={badgeSize}
            bg={badge.bg}
            fg={badge.fg}
            initial={badge.initial}
            fontSize={badgeFontSize}
          />
          {/* Letter overlay — positioned on top of the SVG */}
          <Text
            style={[
              styles.badgeText,
              {
                color: badge.fg,
                fontSize: badgeFontSize,
                position: 'absolute',
                top: 0,
                left: 0,
                width: badgeSize,
                height: badgeSize,
                textAlign: 'center',
                lineHeight: badgeSize,
              },
            ]}
            numberOfLines={1}
          >
            {badge.initial}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  silhouette: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    transform: [{ translateY: -8 }],
  },
  badge: {
    position: 'absolute',
    right: -2,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

const VehicleAvatar = memo(VehicleAvatarImpl);
export default VehicleAvatar;
