import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../lib/theme';
import * as Haptics from 'expo-haptics';
import {
  FIRST_VEHICLE_CELEBRATION_KEY,
  shouldShowCelebration,
} from '../lib/firstVehicleCelebration';

export { FIRST_VEHICLE_CELEBRATION_KEY };

/**
 * FirstVehicleCelebration — one-time card that appears for ~4s after the
 * user successfully completes their first DVLA lookup.
 *
 *   Visible only when:
 *     - a vehicle exists in AsyncStorage
 *     - AsyncStorage["first_vehicle_celebration_seen_v1"] !== "1"
 *
 *   The check is performed when `vehicle` becomes non-null. Tap-to-dismiss
 *   or auto-dismiss at 4s.
 */
export default function FirstVehicleCelebration({ vehicle, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const slide = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => { if (!cancelled) setReduceMotion(!!v); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!vehicle) return;
    let cancelled = false;
    AsyncStorage.getItem(FIRST_VEHICLE_CELEBRATION_KEY).then((seen) => {
      if (cancelled) return;
      if (!shouldShowCelebration(vehicle, seen)) return;
      setVisible(true);
      // Mark as seen immediately so a re-render (or app quit during the
      // 4s window) doesn't resurface it next session.
      AsyncStorage.setItem(FIRST_VEHICLE_CELEBRATION_KEY, '1').catch(() => {});
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [vehicle]);

  useEffect(() => {
    if (!visible) return;
    // Haptic tap (soft) — native only.
    if (Platform.OS !== 'web') {
      Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle?.Light).catch(() => {});
    }
    if (reduceMotion) {
      slide.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    } else {
      Animated.parallel([
        Animated.timing(slide, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    }
    timerRef.current = setTimeout(dismiss, 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion]);

  const dismiss = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const cleanup = () => { setVisible(false); if (typeof onDismiss === 'function') onDismiss(); };
    if (reduceMotion) {
      Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }).start(cleanup);
    } else {
      Animated.parallel([
        Animated.timing(slide, { toValue: 80, duration: 240, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(cleanup);
    }
  };

  if (!visible) return null;

  const descriptor = (() => {
    if (!vehicle) return 'your car';
    const y = vehicle.year || '';
    const m = vehicle.make || '';
    const t = `${y} ${m}`.trim();
    return t || 'your car';
  })();
  const fuelLabel = (() => {
    const f = (vehicle?.fuel_type || '').toLowerCase();
    if (f === 'diesel' || f === 'b7') return 'Diesel';
    if (f === 'e10') return 'E10';
    if (f === 'super_unleaded') return 'Super';
    if (f === 'premium_diesel') return 'Premium diesel';
    return 'Petrol';
  })();

  return (
    <TouchableWithoutFeedback
      onPress={dismiss}
      accessibilityRole="button"
      accessibilityLabel="Dismiss personalisation confirmation"
    >
      <Animated.View
        style={[
          styles.card,
          { transform: [{ translateY: slide }], opacity },
        ]}
        accessible
        accessibilityLiveRegion="polite"
      >
        <Text style={styles.sparkle}>✨</Text>
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>
            Great — {descriptor} is ready.
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            Showing {fuelLabel} prices and personal savings at every station.
          </Text>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,30,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(46,204,113,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 100,
  },
  sparkle: {
    fontSize: 22,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
