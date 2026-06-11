/**
 * AmbientParticles.js
 *
 * Subtle floating green dots behind the BrandHeader — "data being processed"
 * ambience. Purely decorative; pointer events are disabled.
 *
 * Design constraints:
 *   - ≤30 particles
 *   - Opacity 0.10 – 0.30 (well below header content)
 *   - Slow upward drift, 8–14s per cycle, randomised per particle
 *   - Pauses when app is backgrounded (AppState.addEventListener)
 *   - Animated API with useNativeDriver: true — no JS-thread frame work
 *   - Single <View pointerEvents="none"> positioned absolutely behind content
 *
 * Props:
 *   count   {number}  Number of particles (default 24, max 30)
 *   accent  {string}  Particle colour (default '#2ECC71')
 *   height  {number}  Height of the particle field in px (default 120)
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { View, Animated, AppState, StyleSheet, Dimensions } from 'react-native';

// ---------------------------------------------------------------------------
// Deterministic pseudo-random seeded by particle index so the layout is
// stable across renders (no flash of repositioned particles on re-mount).
// ---------------------------------------------------------------------------
function seededRandom(seed) {
  // Simple xorshift32
  let x = seed === 0 ? 1 : seed;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967296;
}

function particleConfig(i, screenWidth, height) {
  const r0 = seededRandom(i * 7 + 1);
  const r1 = seededRandom(i * 7 + 2);
  const r2 = seededRandom(i * 7 + 3);
  const r3 = seededRandom(i * 7 + 4);
  return {
    left: r0 * (screenWidth - 4),          // horizontal position (px)
    size: 2 + r1 * 2,                       // diameter 2–4px
    duration: 8000 + r2 * 6000,             // 8–14s per cycle
    delay: r3 * 8000,                       // 0–8s stagger
    startY: height + 8,                     // off-screen bottom
    endY: -8,                               // off-screen top
  };
}

// ---------------------------------------------------------------------------
// Single particle — one Animated.Value drives Y; opacity is interpolated
// from the same value so it fades in, peaks, then fades out.
// ---------------------------------------------------------------------------
function Particle({ config, accent, paused }) {
  const anim = useRef(new Animated.Value(0)).current; // 0→1 progress

  useEffect(() => {
    let loop = null;

    function startLoop() {
      anim.setValue(0);
      loop = Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: config.duration,
          delay: config.delay,
          useNativeDriver: true,
        })
      );
      loop.start();
    }

    if (!paused) {
      startLoop();
    } else {
      if (loop) loop.stop();
    }

    return () => {
      if (loop) loop.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  // Y: interpolate from startY → endY
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [config.startY, config.endY],
  });

  // Opacity: 0 → 0.25 at midpoint → 0 (bell curve via 3-stop interpolation)
  const opacity = anim.interpolate({
    inputRange: [0, 0.2, 0.5, 0.8, 1],
    outputRange: [0, 0.15, 0.25, 0.15, 0],
    extrapolate: 'clamp',
  });

  const s = Math.round(config.size);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: config.left,
          width: s,
          height: s,
          borderRadius: s / 2,
          backgroundColor: accent,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="none"
    />
  );
}

// ---------------------------------------------------------------------------
// AmbientParticles
// ---------------------------------------------------------------------------
export default function AmbientParticles({
  count = 24,
  accent = '#2ECC71',
  height = 120,
}) {
  const clampedCount = Math.min(count, 30);
  const screenWidth = Dimensions.get('window').width;

  // Stable per-particle configs — recalculated only when count or height changes
  const configs = useMemo(
    () => Array.from({ length: clampedCount }, (_, i) => particleConfig(i, screenWidth, height)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clampedCount, height]
  );

  // AppState pause/resume
  const paused = useRef(false);
  // We use a state-like approach via a ref + forced re-render only when
  // state crosses the foreground/background boundary.
  const [isPaused, setIsPaused] = React.useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const shouldPause = nextState === 'background' || nextState === 'inactive';
      if (shouldPause !== paused.current) {
        paused.current = shouldPause;
        setIsPaused(shouldPause);
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <View
      pointerEvents="none"
      style={[styles.container, { height }]}
      testID="ambient-particles-container"
    >
      {configs.map((cfg, i) => (
        <Particle
          key={i}
          config={cfg}
          accent={accent}
          paused={isPaused}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    top: 0,
  },
});
