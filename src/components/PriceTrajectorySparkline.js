/**
 * PriceTrajectorySparkline — 60×16 mini line chart of recent regional price.
 *
 * Renders nothing (returns null) when the input series has fewer than 2
 * finite values — the existing trajectory chip continues to handle the
 * "stable" / "rising" wording in that case.
 *
 * Colour: green if trending down, amber if stable, red if rising.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../lib/theme';
import { sparklinePath, sparklineDirection } from '../lib/sparkline';
import { formatPencePerLitre } from '../lib/breakEven';

const WIDTH = 60;
const HEIGHT = 16;

const TONE_COLOR = {
  rising: COLORS.dangerAlt,
  stable: COLORS.warning,
  falling: COLORS.accent,
};

export default function PriceTrajectorySparkline({ values, accessibilityLabel }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const path = sparklinePath(values, { width: WIDTH, height: HEIGHT, inset: 2 });
  if (!path) return null;

  const direction = sparklineDirection(values) || 'stable';
  const stroke = TONE_COLOR[direction];

  // Tooltip copy: "Avg petrol last 7 days: 141.2p → 138.9p (−2.3p)".
  const clean = (Array.isArray(values) ? values : []).filter(
    (n) => typeof n === 'number' && Number.isFinite(n),
  );
  const first = clean[0];
  const last = clean[clean.length - 1];
  const delta = last - first;
  const deltaSign = delta > 0 ? '+' : delta < 0 ? '\u2212' : '';
  const tooltip =
    Number.isFinite(first) && Number.isFinite(last)
      ? `Avg petrol last 7 days: ${formatPencePerLitre(first)} \u2192 ${formatPencePerLitre(last)} (${deltaSign}${formatPencePerLitre(Math.abs(delta))})`
      : null;

  const a11y =
    accessibilityLabel ||
    (tooltip ? `Price trend: ${tooltip}` : `Price trend ${direction}`);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={() => setShowTooltip((v) => !v)}
      style={styles.wrap}
    >
      <Svg width={WIDTH} height={HEIGHT}>
        <Path
          d={path}
          stroke={stroke}
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      {showTooltip && tooltip ? (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText} numberOfLines={2}>{tooltip}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: WIDTH,
    height: HEIGHT,
    justifyContent: 'center',
  },
  tooltip: {
    position: 'absolute',
    top: HEIGHT + 6,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    minWidth: 220,
    zIndex: 10,
    elevation: 4,
  },
  tooltipText: {
    fontSize: 11,
    color: COLORS.text,
  },
});
