/**
 * StationBrandLogo.js
 *
 * Renders a circular brand logo for a UK fuel retailer.
 *
 * - If a bundled asset exists for the brand (via resolveStationLogo), renders
 *   the PNG at the requested size — original colours, no tinting.
 * - Falls back to a letter-monogram badge (mirrors vehicleMakeBadge.js approach)
 *   for any brand not in the bundled set.
 *
 * Props:
 *   brand  {string}  — Raw brand name (e.g. 'Tesco Express', 'Shell')
 *   size   {number}  — Diameter in logical pixels (default 24)
 *   style  {object}  — Additional container style
 *
 * Attribution: Fuel retailer logos are trademarks of their respective owners
 * and are used here for identification purposes only.
 */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { resolveStationLogo, normaliseBrandKey } from '../lib/stationBrandLogo';

// ---------------------------------------------------------------------------
// Fallback letter-badge colour table (for brands not in the bundled set).
// Mirrors the approach used in vehicleMakeBadge.js.
// ---------------------------------------------------------------------------
const FALLBACK_COLOURS = {
  default: { bg: '#2A3040', fg: '#E8ECF2' },
};

function getFallbackColour(brand) {
  const key = normaliseBrandKey(brand);
  return FALLBACK_COLOURS[key] || FALLBACK_COLOURS.default;
}

function getInitial(brand) {
  if (!brand || typeof brand !== 'string') return '?';
  const trimmed = brand.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

/**
 * LetterBadge — circular monogram fallback for unknown brands.
 */
function LetterBadge({ brand, size }) {
  const { bg, fg } = getFallbackColour(brand);
  const initial = getInitial(brand);
  const fontSize = Math.max(8, Math.round(size * 0.5));
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
      ]}
      accessibilityLabel={`${brand || 'Unknown'} brand badge`}
      testID="station-brand-letter-badge"
    >
      <Text
        style={[styles.badgeText, { color: fg, fontSize }]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {initial}
      </Text>
    </View>
  );
}

/**
 * StationBrandLogo
 *
 * Primary export. Renders the bundled PNG logo when available, otherwise
 * falls back to a letter-monogram badge. No network requests.
 */
export default function StationBrandLogo({ brand, size = 24, style }) {
  const logo = resolveStationLogo(brand);

  if (logo) {
    return (
      <View
        style={[
          styles.logoWrap,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: logo.bg,
          },
          style,
        ]}
        accessibilityLabel={`${brand || 'Station'} logo`}
        testID="station-brand-logo-image"
      >
        <Image
          source={logo.source}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  }

  return (
    <View style={style} testID="station-brand-logo-fallback">
      <LetterBadge brand={brand} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  logoWrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
