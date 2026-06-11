/**
 * FuelIntelCard — consolidated intel card replacing the dual Monthly/Lifetime
 * savings tiles and the PersonalisationChip at the top of HomeScreen.
 *
 * Design: "Perplexity feel" — alive, subtle, intentional.
 *  - Animated breathing pulse dot (top-left) — always running
 *  - Auto-rotating headline every 5s with crossfade
 *  - Subtle keyline glow when station data is freshly refreshed (within 30s)
 *  - "..." overflow menu: tracking horizon, vehicle settings, filters, E5 prompt
 *
 * The component REUSES existing maths from:
 *   - summariseLifetimeSavings / computeRealLifetimeSavings (LifetimeSavingsCard)
 *   - computeMonthlySaving (MonthlySavingsCard)
 *
 * Props:
 *   stations        — array of station objects
 *   fuelType        — current fuel key
 *   userVehicle     — vehicle object or null
 *   lastUpdated     — ISO string of last data fetch (drives glow + "Updated X ago")
 *   radiusMiles     — current search radius in miles (default 3)
 *   perTankSavingPence — pence saving vs nearest station
 *   tankLitres      — tank size from API
 *   lifetimeRefreshKey — bump to re-read lifetime savings
 *   onMenuVehicleSettings — navigate to VehicleSettings
 *   onMenuFilters         — open radius/fuel filter sheet
 *   style           — optional style override
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../lib/theme';
import {
  LIFETIME_SAVINGS_KEY,
  summariseLifetimeSavings,
} from '../lib/lifetimeSavings';
import { loadReceipts } from '../lib/receiptRepository';
import { computeRealLifetimeSavings } from '../lib/receiptSavings';
import { computeMonthlySaving } from '../lib/monthlySaving';
import { buildTrimString } from '../lib/formatVehicleHeader';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelative(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60_000) return 'just now';
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

function isFreshData(isoString, windowMs = 30_000) {
  if (!isoString) return false;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() < windowMs;
}

function resolveCheapest(stations, fuelType) {
  if (!Array.isArray(stations) || stations.length === 0) return null;
  let best = null;
  let bestPrice = Infinity;
  for (const s of stations) {
    let price = null;
    if (fuelType === 'unleaded' || fuelType === 'petrol') {
      price = s.e10_price ?? s.petrol_price ?? null;
    } else {
      price = s[`${fuelType}_price`] ?? null;
    }
    const p = Number(price);
    if (Number.isFinite(p) && p > 0 && p < bestPrice) {
      bestPrice = p;
      best = s;
    }
  }
  return best ? { station: best, price: bestPrice } : null;
}

// ─── Pulse Dot ───────────────────────────────────────────────────────────────

function PulseDot({ color = COLORS.accent }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.4,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.5,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);

  return (
    <Animated.View
      style={[
        styles.pulseDot,
        { backgroundColor: color, transform: [{ scale }], opacity },
      ]}
    />
  );
}

// ─── Rotating Headline ────────────────────────────────────────────────────────

function RotatingHeadline({ lines }) {
  const [idx, setIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!lines || lines.length < 2) return;
    const interval = setInterval(() => {
      // Crossfade: fade out → update → fade in
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setIdx((prev) => (prev + 1) % lines.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start();
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [lines, fadeAnim]);

  const text = lines && lines.length > 0 ? lines[idx % lines.length] : null;
  if (!text) return null;

  return (
    <Animated.Text
      style={[styles.headlineLine, { opacity: fadeAnim }]}
      numberOfLines={1}
    >
      {text}
    </Animated.Text>
  );
}

// ─── Overflow Menu ─────────────────────────────────────────────────────────

const HORIZON_KEY = '@fueluk/tracking_horizon_v1';

function OverflowMenu({
  visible,
  onClose,
  onVehicleSettings,
  onFilters,
  showE5Prompt,
  onE5Prompt,
}) {
  const [horizon, setHorizon] = useState('monthly');

  useEffect(() => {
    if (visible) {
      AsyncStorage.getItem(HORIZON_KEY)
        .then((v) => { if (v === 'lifetime' || v === 'monthly') setHorizon(v); })
        .catch(() => {});
    }
  }, [visible]);

  const toggleHorizon = (val) => {
    setHorizon(val);
    AsyncStorage.setItem(HORIZON_KEY, val).catch(() => {});
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <View style={styles.menuSheet}>
          <Text style={styles.menuTitle}>Options</Text>

          {/* Tracking horizon */}
          <View style={styles.menuSection}>
            <Text style={styles.menuSectionLabel}>Tracking horizon</Text>
            <View style={styles.horizonRow}>
              <TouchableOpacity
                style={[styles.horizonBtn, horizon === 'monthly' && styles.horizonBtnActive]}
                onPress={() => toggleHorizon('monthly')}
                accessibilityRole="radio"
                accessibilityState={{ selected: horizon === 'monthly' }}
              >
                <Text style={[styles.horizonBtnText, horizon === 'monthly' && styles.horizonBtnTextActive]}>
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.horizonBtn, horizon === 'lifetime' && styles.horizonBtnActive]}
                onPress={() => toggleHorizon('lifetime')}
                accessibilityRole="radio"
                accessibilityState={{ selected: horizon === 'lifetime' }}
              >
                <Text style={[styles.horizonBtnText, horizon === 'lifetime' && styles.horizonBtnTextActive]}>
                  Lifetime
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.menuDivider} />

          {/* Vehicle settings */}
          <TouchableOpacity style={styles.menuRow} onPress={() => { onClose(); onVehicleSettings?.(); }}>
            <Ionicons name="car-sport-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.menuRowText}>Vehicle settings</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Filters */}
          <TouchableOpacity style={styles.menuRow} onPress={() => { onClose(); onFilters?.(); }}>
            <Ionicons name="options-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.menuRowText}>Radius &amp; fuel filters</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* E5 prompt — only surfaced if relevant */}
          {showE5Prompt ? (
            <TouchableOpacity style={styles.menuRow} onPress={() => { onClose(); onE5Prompt?.(); }}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.menuRowText}>Older car? View E5 prices</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.menuClose} onPress={onClose}>
            <Text style={styles.menuCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FuelIntelCard({
  stations = [],
  fuelType = 'unleaded',
  userVehicle = null,
  lastUpdated = null,
  radiusMiles = 3,
  perTankSavingPence = null,
  tankLitres = null,
  lifetimeRefreshKey = 0,
  onMenuVehicleSettings,
  onMenuFilters,
  onMenuE5Prompt,
  style,
}) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [savingLabel, setSavingLabel] = useState(null);

  // Keyline glow when data is fresh
  const glowAnim = useRef(new Animated.Value(0)).current;
  const fresh = isFreshData(lastUpdated, 30_000);

  useEffect(() => {
    if (fresh) {
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.in(Easing.ease),
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      glowAnim.setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUpdated]);

  // Load lifetime/monthly saving for the headline rotation
  useEffect(() => {
    let mounted = true;
    (async () => {
      // Try real savings first (Phase 2A receipts)
      try {
        const receipts = await loadReceipts();
        const real = computeRealLifetimeSavings(receipts);
        if (mounted && real?.isSufficient && real.totalPounds > 0) {
          setSavingLabel(`Saving £${real.totalPounds} vs UK average`);
          return;
        }
      } catch (_e) {}

      // Fallback to synthetic monthly estimate
      try {
        const result = computeMonthlySaving({
          mpg: userVehicle?.mpg,
          weekly_miles: userVehicle?.weekly_miles,
          tank_size_litres: tankLitres,
          per_tank_saving_pence: perTankSavingPence,
        });
        if (mounted && result && !result.isLowSaving) {
          setSavingLabel(`Saving ~£${result.monthlyPounds}/mo vs nearest station`);
          return;
        }
      } catch (_e) {}

      // Fallback to synthetic lifetime
      try {
        const raw = await AsyncStorage.getItem(LIFETIME_SAVINGS_KEY);
        const list = raw ? JSON.parse(raw) : [];
        const summary = summariseLifetimeSavings(Array.isArray(list) ? list : []);
        if (mounted && !summary.isEmpty && summary.totalPounds > 0) {
          setSavingLabel(`£${summary.totalPounds} saved with FuelUK`);
        }
      } catch (_e) {}
    })();
    return () => { mounted = false; };
  }, [
    lifetimeRefreshKey,
    perTankSavingPence,
    tankLitres,
    userVehicle?.mpg,
    userVehicle?.weekly_miles,
  ]);

  // Build the rotating headlines
  const cheapest = resolveCheapest(stations, fuelType);
  const headlineLines = [];

  if (stations.length > 0) {
    headlineLines.push(`Watching ${stations.length} station${stations.length !== 1 ? 's' : ''} within ${radiusMiles} miles`);
  }
  if (cheapest) {
    const name = cheapest.station.name || cheapest.station.brand || 'nearby';
    headlineLines.push(`Cheapest near you: ${name} · ${cheapest.price.toFixed(1)}p`);
  }
  if (lastUpdated) {
    const rel = formatRelative(lastUpdated);
    if (rel) headlineLines.push(`Updated ${rel}`);
  }
  if (savingLabel && userVehicle) {
    headlineLines.push(savingLabel);
  }
  // Fallback when no data yet
  if (headlineLines.length === 0) {
    headlineLines.push('Scanning for the best prices near you');
  }

  // E5 prompt gate: show only if no vehicle, or vehicle year < 2002
  const vehicleYear = userVehicle?.yearOfManufacture ?? userVehicle?.year ?? null;
  const showE5Prompt = !userVehicle || (vehicleYear && vehicleYear < 2002);

  // Vehicle trim string for subtitle
  const trimString = userVehicle ? buildTrimString(userVehicle) : null;

  // Animated border colour for fresh glow
  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.border, COLORS.accent],
  });

  return (
    <>
      <Animated.View
        style={[
          styles.card,
          style,
          { borderColor },
        ]}
        accessibilityRole="summary"
        accessibilityLabel="Fuel intelligence summary"
      >
        {/* Top row: pulse dot + headline + menu */}
        <View style={styles.topRow}>
          <PulseDot color={COLORS.accent} />
          <View style={styles.headlineWrap}>
            <RotatingHeadline lines={headlineLines} />
            {trimString ? (
              <Text style={styles.trimLine} numberOfLines={1}>
                {trimString}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={styles.menuBtn}
            accessibilityLabel="Open options menu"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <OverflowMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onVehicleSettings={onMenuVehicleSettings}
        onFilters={onMenuFilters}
        showE5Prompt={!!showE5Prompt}
        onE5Prompt={onMenuE5Prompt}
      />
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headlineWrap: {
    flex: 1,
  },
  headlineLine: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: 0.1,
  },
  trimLine: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  menuBtn: {
    paddingLeft: 4,
  },
  // ─── Overflow menu ────────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  menuSection: {
    marginBottom: 12,
  },
  menuSectionLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  horizonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  horizonBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.card,
  },
  horizonBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  horizonBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  horizonBtnTextActive: {
    color: COLORS.background,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  menuRowText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  menuClose: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
