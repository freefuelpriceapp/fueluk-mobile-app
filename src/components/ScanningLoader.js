import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

/**
 * ScanningLoader — premium "AI scanning" loading state for the Nearby screen.
 *
 * Visual elements:
 *   1. A scanning ring (rotating dashed arc) around a fuel-drop glyph.
 *   2. A shimmer sweep bar underneath.
 *   3. Cycling helper text (Scanning → Comparing → Ranking).
 *
 * All motion uses the native-driver Animated API — no extra dependencies.
 * Designed to transition cleanly when results arrive (fade-out on unmount
 * handled by the parent; keep this component unmounted when done).
 */

const DEFAULT_THEME = {
  bg: '#0D1117',
  text: '#F5F7FA',
  muted: '#8B95A7',
  accent: '#2ECC71',
  track: '#1E2634',
  shimmer: '#2ECC7133',
};

const PHASES = [
  'Scanning nearby stations…',
  'Comparing live fuel prices…',
  'Ranking the best options for you…',
];

export default function ScanningLoader({ theme = DEFAULT_THEME, size = 96 }) {
  const rotate = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const [phase, setPhase] = useState(0);
  const textAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const rot = Animated.loop(
      Animated.timing(rotate, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true })
    );
    const pul = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const shim = Animated.loop(
      Animated.timing(sweep, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
    );
    rot.start(); pul.start(); shim.start();
    return () => { rot.stop(); pul.stop(); shim.stop(); };
  }, [rotate, pulse, sweep]);

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(textAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(textAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
      setTimeout(() => setPhase((p) => (p + 1) % PHASES.length), 220);
    }, 2200);
    return () => clearInterval(interval);
  }, [textAnim]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const counterSpin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });
  const coreScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.06] });
  const shimmerX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-120, 220] });

  const ringSize = size;
  const arcThickness = Math.max(2, Math.round(size * 0.04));

  return (
    <View style={[styles.wrap, { backgroundColor: theme.bg }]}>
      <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer rotating arc (achieved by a bordered circle with transparent halves) */}
        <Animated.View
          style={{
            position: 'absolute',
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderWidth: arcThickness,
            borderColor: theme.accent,
            borderRightColor: 'transparent',
            borderBottomColor: 'transparent',
            transform: [{ rotate: spin }],
          }}
        />
        {/* Inner counter-rotating soft arc */}
        <Animated.View
          style={{
            position: 'absolute',
            width: ringSize * 0.78,
            height: ringSize * 0.78,
            borderRadius: ringSize / 2,
            borderWidth: arcThickness - 1,
            borderColor: theme.accent + '55',
            borderLeftColor: 'transparent',
            borderTopColor: 'transparent',
            transform: [{ rotate: counterSpin }],
          }}
        />
        {/* Core pulsing fuel-drop */}
        <Animated.View
          style={{
            width: ringSize * 0.42,
            height: ringSize * 0.42,
            borderTopLeftRadius: ringSize,
            borderTopRightRadius: ringSize,
            borderBottomLeftRadius: ringSize * 0.35,
            borderBottomRightRadius: ringSize * 0.35,
            backgroundColor: theme.accent,
            transform: [{ scale: coreScale }, { rotate: '-12deg' }],
            shadowColor: theme.accent,
            shadowOpacity: 0.5,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
      </View>

      {/* Shimmer bar */}
      <View style={[styles.shimmerTrack, { backgroundColor: theme.track }]}>
        <Animated.View
          style={[
            styles.shimmerFill,
            { backgroundColor: theme.shimmer, transform: [{ translateX: shimmerX }] },
          ]}
        />
      </View>

      <Animated.Text
        style={[styles.phase, { color: theme.text, opacity: textAnim }]}
        accessibilityLiveRegion="polite"
      >
        {PHASES[phase]}
      </Animated.Text>
      <Text style={[styles.hint, { color: theme.muted }]}>This usually takes a second or two</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  shimmerTrack: {
    marginTop: 28,
    width: 180,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  shimmerFill: {
    width: 80,
    height: 4,
    borderRadius: 2,
  },
  phase: {
    marginTop: 18,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  hint: {
    marginTop: 6,
    fontSize: 12,
    letterSpacing: 0.1,
  },
});
