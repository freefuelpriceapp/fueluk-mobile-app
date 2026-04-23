import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolvePrice } from '../lib/quarantine';
import { brandToString, safeText } from '../lib/brand';
import { normaliseSelectedReason } from '../lib/selectedReason';
import { chooseBestOption } from '../lib/bestOption';
import BreakEvenBadge from './BreakEvenBadge';
import { BEST_OPTION_MODE_KEY } from '../lib/userVehicle';
import { isFeatureEnabled } from '../config/featureFlags';

/**
 * BestOptionCard — hero intelligence card at the top of the Nearby list.
 *
 * Offers a "Closest" vs "Best Value" segmented toggle:
 *  - Closest     → renders `bestOption` (backend's nearest non-stale pick)
 *  - Best Value  → renders `bestValue` (backend's value-first pick) with
 *                  `bestValueReason` as the explanatory line
 *
 * Mode is persisted in AsyncStorage key `best_option_mode`. Default is
 * "value" per product decision — the differentiator should be visible
 * by default.
 */

const THEME = {
  bg: '#111820',
  border: '#2ECC7144',
  accent: '#2ECC71',
  text: '#F5F7FA',
  muted: '#8B95A7',
  tag: '#2ECC7120',
  segBg: '#0B1118',
  segActive: '#2ECC7120',
};

function timeAgo(iso) {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 60000;
    if (diff < 1) return 'just now';
    if (diff < 60) return `${Math.round(diff)}m ago`;
    if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
    return `${Math.round(diff / 1440)}d ago`;
  } catch (_) { return null; }
}

function formatDistance(station) {
  if (station.distance_miles != null && Number.isFinite(station.distance_miles)) {
    return `${station.distance_miles.toFixed(1)} mi`;
  }
  if (station.distance_km != null && Number.isFinite(station.distance_km)) {
    return `${station.distance_km.toFixed(1)} km`;
  }
  return null;
}

export default function BestOptionCard({
  bestOption = null,
  bestValue = null,
  bestValueReason = null,
  stations = [],
  fuelType = 'petrol',
  onPress,
  selectedReason = null,
}) {
  const valueFeatureOn = isFeatureEnabled('breakEven');
  const toggleAvailable = valueFeatureOn && !!bestValue;
  const [mode, setMode] = useState(toggleAvailable ? 'value' : 'closest');

  // Load persisted mode on mount; default to "value" when the toggle is
  // actually available, else force "closest".
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(BEST_OPTION_MODE_KEY)
      .then((stored) => {
        if (!mounted) return;
        if (stored === 'value' && toggleAvailable) setMode('value');
        else if (stored === 'closest') setMode('closest');
        else if (toggleAvailable) setMode('value');
        else setMode('closest');
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [toggleAvailable]);

  const setModePersisted = (next) => {
    setMode(next);
    AsyncStorage.setItem(BEST_OPTION_MODE_KEY, next).catch(() => {});
  };

  // Resolve the active station for the current mode, with graceful fallback:
  //   value  → bestValue, else bestOption
  //   closest → bestOption, else legacy chooseBestOption
  const activeStation =
    mode === 'value'
      ? bestValue || bestOption || chooseBestOption(null, stations, fuelType)
      : bestOption || chooseBestOption(null, stations, fuelType);

  const activeReason =
    mode === 'value' && bestValue
      ? (typeof bestValueReason === 'string' && bestValueReason.trim()) || null
      : normaliseSelectedReason(selectedReason);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (activeStation) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 380, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(12);
    }
  }, [activeStation, fadeAnim, slideAnim]);

  if (!activeStation) return null;

  const price = resolvePrice(activeStation, fuelType);
  const dist = formatDistance(activeStation);
  const updated = activeStation.last_updated ? timeAgo(activeStation.last_updated) : null;
  const fuelLabel = fuelType === 'diesel' ? 'Diesel' : fuelType === 'e10' ? 'E10' : 'Petrol';

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {toggleAvailable && (
        <View
          style={styles.segmentedRow}
          accessibilityRole="tablist"
        >
          <TouchableOpacity
            style={[styles.segBtn, mode === 'closest' && styles.segBtnActive]}
            onPress={() => setModePersisted('closest')}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'closest' }}
            accessibilityLabel="Closest station mode"
          >
            <Ionicons
              name="navigate-outline"
              size={12}
              color={mode === 'closest' ? THEME.accent : THEME.muted}
            />
            <Text style={[styles.segBtnText, mode === 'closest' && styles.segBtnTextActive]}>
              Closest
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segBtn, mode === 'value' && styles.segBtnActive]}
            onPress={() => setModePersisted('value')}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'value' }}
            accessibilityLabel="Best value mode"
          >
            <Ionicons
              name="trending-down-outline"
              size={12}
              color={mode === 'value' ? THEME.accent : THEME.muted}
            />
            <Text style={[styles.segBtnText, mode === 'value' && styles.segBtnTextActive]}>
              Best Value
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity activeOpacity={0.75} onPress={() => onPress && onPress(activeStation)} style={styles.inner}>
        <View style={styles.topRow}>
          <Ionicons name="bulb" size={16} color={THEME.accent} />
          <Text style={styles.topLabel}>
            {mode === 'value' ? 'Best value near you' : 'Closest option'}
          </Text>
        </View>
        <Text style={styles.stationName} numberOfLines={1}>
          {safeText(activeStation.name) || brandToString(activeStation.brand) || 'Station'}
        </Text>

        {/* Break-even chip takes primary position when in value mode */}
        {mode === 'value' && activeStation.break_even ? (
          <View style={{ marginBottom: 6 }}>
            <BreakEvenBadge breakEven={activeStation.break_even} size="md" />
          </View>
        ) : null}

        <View style={styles.metaRow}>
          {price != null && Number.isFinite(price) && (
            <Text style={styles.price}>{price.toFixed(1)}p <Text style={styles.fuelLabel}>{fuelLabel}</Text></Text>
          )}
          {dist && (
            <Text style={styles.meta}>
              <Ionicons name="location-outline" size={12} color={THEME.muted} /> {dist}
            </Text>
          )}
          {updated && (
            <Text style={styles.meta}>
              <Ionicons name="time-outline" size={12} color={THEME.muted} /> {updated}
            </Text>
          )}
        </View>
        {activeReason && (
          <View
            style={styles.reasonRow}
            accessible
            accessibilityLabel={activeReason}
          >
            <Ionicons name="checkmark-circle" size={12} color={THEME.muted} />
            <Text style={styles.reasonText} numberOfLines={2}>
              {activeReason}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.bg,
    shadowColor: THEME.accent,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  inner: { padding: 14 },
  segmentedRow: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.segBg,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 10,
  },
  segBtnActive: {
    backgroundColor: THEME.segActive,
  },
  segBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.muted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  segBtnTextActive: {
    color: THEME.accent,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  topLabel: { fontSize: 11, fontWeight: '700', color: THEME.accent, marginLeft: 5, letterSpacing: 0.5, textTransform: 'uppercase' },
  stationName: { fontSize: 16, fontWeight: '700', color: THEME.text, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  price: { fontSize: 15, fontWeight: '700', color: THEME.accent },
  fuelLabel: { fontSize: 12, fontWeight: '500', color: THEME.muted },
  meta: { fontSize: 12, color: THEME.muted },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  reasonText: { fontSize: 12, color: THEME.muted, flexShrink: 1 },
});
