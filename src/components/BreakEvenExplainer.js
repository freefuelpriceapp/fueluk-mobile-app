import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  AccessibilityInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { describeBreakEven, formatPounds, formatPencePerLitre } from '../lib/breakEven';

const THEME = {
  bg: 'rgba(46,204,113,0.06)',
  border: 'rgba(46,204,113,0.22)',
  linkColor: '#2ECC71',
  label: '#F5F7FA',
  muted: '#8B95A7',
  divider: 'rgba(255,255,255,0.08)',
};

const EXPANDED_SESSION_KEY = 'break_even_expander_opened_session';

function fuelLabelFor(fuelType) {
  if (fuelType === 'diesel') return 'Diesel';
  if (fuelType === 'e10') return 'E10';
  if (fuelType === 'super_unleaded') return 'Super unleaded';
  if (fuelType === 'premium_diesel') return 'Premium diesel';
  return 'Petrol';
}

function vehicleDescriptor(vehicle, mpg, fuelType) {
  const parts = [];
  if (vehicle?.year) parts.push(String(vehicle.year));
  if (vehicle?.make) parts.push(vehicle.make);
  const head = parts.join(' ') || 'Your car';
  const mpgText = Number.isFinite(mpg) ? `${Math.round(mpg)} mpg` : null;
  const fuel = fuelLabelFor(fuelType);
  const tail = [fuel, mpgText].filter(Boolean).join(', ');
  return tail ? `${head} (${tail})` : head;
}

/**
 * BreakEvenExplainer — collapsible "How we calculated this" panel.
 *
 * Shows the cost maths in a human-friendly form:
 *   Fill at EG Small Heath (140.0p):
 *     40L × 140.0p = £56.00
 *     2.3mi detour at 45mpg = £0.32 fuel cost
 *     Total: £56.32
 *
 *   Fill at your nearest station (157.0p):
 *     40L × 157.0p = £62.80
 *     Total: £62.80
 *
 *   You save £6.48 by driving 2.3 miles more.
 *
 * Remembers expanded state per-session (AsyncStorage bool).
 */
export default function BreakEvenExplainer({
  station,
  breakEven,
  fuelType = 'petrol',
  userVehicle = null,
}) {
  const desc = describeBreakEven(breakEven);
  const [expanded, setExpanded] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => { if (!cancelled) setReduceMotion(!!v); })
      .catch(() => {});
    AsyncStorage.getItem(EXPANDED_SESSION_KEY)
      .then((v) => { if (!cancelled && v === '1') {
        setExpanded(true);
        anim.setValue(1);
      } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [anim]);

  if (!desc || desc.variant === 'closest') return null;
  // Only show the "how we calculated" link when there's actually a
  // comparison to explain (savings + tank cost).
  if (desc.variant === 'worth' && desc.fullTankPounds == null) return null;

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    AsyncStorage.setItem(EXPANDED_SESSION_KEY, next ? '1' : '0').catch(() => {});
    Animated.timing(anim, {
      toValue: next ? 1 : 0,
      duration: reduceMotion ? 0 : 240,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  };

  const tankL = desc.tankLitres ?? 40;
  const ppl = desc.pricePerLitre;
  const stationName = station?.name || station?.brand || 'this station';
  const vehicleLine = vehicleDescriptor(userVehicle, desc.mpg, fuelType);

  const tankCost = desc.fullTankPounds;
  const hasDetour = desc.detourMiles != null;
  const detourFuelCost = (() => {
    if (!hasDetour || !desc.mpg || !ppl) return null;
    // detour_miles gallons = detour / mpg; cost in £ = gallons * ppl(pence) / 100
    const gallons = desc.detourMiles / desc.mpg;
    return Math.round(gallons * ppl) / 100;
  })();
  const totalHere = (tankCost != null && detourFuelCost != null)
    ? Math.round((tankCost + detourFuelCost) * 100) / 100
    : tankCost;

  const nearestPpl = desc.nearestPricePence;
  const nearestTank = (nearestPpl != null)
    ? Math.round(tankL * nearestPpl) / 100
    : null;

  // Animated height cap — pick something tall enough for the content.
  const maxHeight = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 360],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        onPress={toggle}
        style={styles.linkRow}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={expanded ? 'Hide calculation details' : 'How we calculated this'}
        accessibilityHint="Shows the maths behind the break-even savings"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={12}
          color={THEME.linkColor}
        />
        <Text style={styles.linkText}>
          {expanded ? 'Hide calculation' : 'How we calculated this'}
        </Text>
      </TouchableOpacity>

      <Animated.View style={[styles.panel, { maxHeight, opacity }]}>
        <View style={styles.panelInner}>
          <Text style={styles.baselineLine}>
            We compare every station's total cost — a full tank of fuel plus
            the round-trip detour — against your nearest station in these
            results. The winner saves you the most money overall.
          </Text>
          <Text style={styles.vehicleLine}>
            {vehicleLine} · {tankL}L tank fill
          </Text>

          <View style={styles.block}>
            <Text style={styles.blockHeader}>
              Fill at {stationName}{ppl != null ? ` (${formatPencePerLitre(ppl)})` : ''}:
            </Text>
            {ppl != null ? (
              <Text style={styles.line}>
                {tankL}L × {formatPencePerLitre(ppl)} = {formatPounds(tankCost)}
              </Text>
            ) : tankCost != null ? (
              <Text style={styles.line}>Full tank: {formatPounds(tankCost)}</Text>
            ) : null}
            {detourFuelCost != null && desc.mpg ? (
              <Text style={styles.line}>
                {desc.detourMiles.toFixed(1)}mi detour at {Math.round(desc.mpg)}mpg = {formatPounds(detourFuelCost)} fuel cost
              </Text>
            ) : null}
            <Text style={styles.total}>Total: {formatPounds(totalHere)}</Text>
          </View>

          {nearestPpl != null && nearestTank != null ? (
            <View style={styles.block}>
              <Text style={styles.blockHeader}>
                Fill at your nearest station ({formatPencePerLitre(nearestPpl)}):
              </Text>
              <Text style={styles.line}>
                {tankL}L × {formatPencePerLitre(nearestPpl)} = {formatPounds(nearestTank)}
              </Text>
              <Text style={styles.total}>Total: {formatPounds(nearestTank)}</Text>
            </View>
          ) : null}

          {desc.savingsPounds != null && desc.savingsPounds > 0 ? (
            <Text style={styles.saveLine}>
              You save {formatPounds(desc.savingsPounds)}
              {hasDetour ? ` by driving ${desc.detourMiles.toFixed(1)} miles more.` : '.'}
            </Text>
          ) : null}
          {desc.isEstimated ? (
            <Text style={styles.disclaimer}>
              Using UK-average mpg — add your car in Settings for exact maths.
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.linkColor,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  panel: {
    overflow: 'hidden',
  },
  panelInner: {
    backgroundColor: THEME.bg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  baselineLine: {
    fontSize: 11,
    color: THEME.label,
    lineHeight: 15,
    marginBottom: 6,
  },
  vehicleLine: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.label,
    marginBottom: 6,
  },
  block: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: THEME.divider,
  },
  blockHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.label,
    marginBottom: 2,
  },
  line: {
    fontSize: 11,
    color: THEME.muted,
    lineHeight: 16,
  },
  total: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.label,
    marginTop: 2,
  },
  saveLine: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.linkColor,
    marginTop: 8,
  },
  disclaimer: {
    fontSize: 10,
    color: THEME.muted,
    fontStyle: 'italic',
    marginTop: 6,
  },
});
