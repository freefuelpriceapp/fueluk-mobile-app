/**
 * PriceTicker.js
 *
 * Thin scrolling horizontal ticker of recent nearby price changes.
 * Replaces the AmbientParticles component which was imperceptible to users.
 *
 * Props:
 *   stations  {Array}  - Nearby station objects (passed from HomeScreen).
 *   fuelType  {string} - Currently selected fuel type (informational only).
 *
 * Returns null when there are no stations or no changes to show.
 *
 * Layout:
 *   [● live dot] [TESCO SOLIHULL −1.2p · ASDA COVENTRY −0.8p ···(scrolling)···]
 *
 * Animation: Animated.timing with translateX, useNativeDriver: true.
 * The full ticker string is rendered twice end-to-end so the scroll loops
 * seamlessly without a visible gap.
 * Pauses when the app moves to background (AppState).
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  AppState,
  Easing,
} from 'react-native';
import { getRecentPriceChanges } from '../lib/recentPriceChanges';

// Width reserved for the live dot indicator + its right margin
const DOT_AREA_WIDTH = 20;

// How long (ms) one full scroll cycle takes
const SCROLL_DURATION_MS = 60000;

// Pixel width we assume for the ticker text (used as the translate distance).
// We use a fixed estimate rather than onLayout so useNativeDriver stays true.
// A second copy of the text is rendered immediately after the first, so the
// loop is always seamless regardless of actual measured width.
const ASSUMED_TEXT_WIDTH = 800;

/**
 * Format a single ticker segment: "Tesco Solihull −1.2p"
 */
function formatSegment({ shortName, delta }) {
  const sign = delta >= 0 ? '+' : '−'; // en-dash minus for negatives
  const abs = Math.abs(delta).toFixed(1);
  return `${shortName} ${sign}${abs}p`;
}

/**
 * Build the full ticker string from an array of changes.
 * Segments separated by ' · ' (middle dot with spaces).
 */
function buildTickerString(changes) {
  return changes.map(formatSegment).join('  ·  ');
}

export default function PriceTicker({ stations, fuelType }) {
  const changes = useMemo(
    () => getRecentPriceChanges(stations, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stations, fuelType]
  );

  // AppState pause/resume
  const [isPaused, setIsPaused] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const shouldPause = nextState === 'background' || nextState === 'inactive';
      if (shouldPause !== pausedRef.current) {
        pausedRef.current = shouldPause;
        setIsPaused(shouldPause);
      }
    });
    return () => sub.remove();
  }, []);

  // ── Scroll animation ────────────────────────────────────────────────────
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const loopRef = useRef(null);

  useEffect(() => {
    if (changes.length === 0) return;

    function startLoop() {
      scrollAnim.setValue(0);
      loopRef.current = Animated.loop(
        Animated.timing(scrollAnim, {
          toValue: -ASSUMED_TEXT_WIDTH,
          duration: SCROLL_DURATION_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loopRef.current.start();
    }

    if (isPaused) {
      if (loopRef.current) loopRef.current.stop();
    } else {
      startLoop();
    }

    return () => {
      if (loopRef.current) loopRef.current.stop();
    };
  }, [changes, isPaused, scrollAnim]);

  // ── Pulsing live dot ─────────────────────────────────────────────────────
  const dotAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, {
          toValue: 1.0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dotAnim, {
          toValue: 0.4,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [dotAnim]);

  if (changes.length === 0) return null;

  const tickerStr = buildTickerString(changes);

  return (
    <View style={styles.container} testID="price-ticker">
      {/* Live dot */}
      <Animated.View
        style={[styles.dot, { opacity: dotAnim }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />

      {/* Scrolling text — two copies end-to-end for seamless looping */}
      <View style={styles.overflow}>
        <Animated.View
          style={[
            styles.textRow,
            { transform: [{ translateX: scrollAnim }] },
          ]}
        >
          <TickerText changes={changes} tickerStr={tickerStr} />
          {/* Second copy for seamless loop */}
          <TickerText changes={changes} tickerStr={tickerStr} separator="  ·  " />
        </Animated.View>
      </View>
    </View>
  );
}

/**
 * Renders one copy of the ticker string, colouring each delta segment
 * according to sign (green for −, muted-red for +).
 */
function TickerText({ changes, separator = '' }) {
  const segments = [];
  changes.forEach((change, idx) => {
    if (idx > 0) {
      segments.push(
        <Text key={`sep-${idx}`} style={styles.tickerBase}>
          {'  ·  '}
        </Text>
      );
    }
    const deltaColor =
      change.delta < 0 ? styles.deltaDown : styles.deltaUp;
    const sign = change.delta >= 0 ? '+' : '−';
    const abs = Math.abs(change.delta).toFixed(1);
    segments.push(
      <Text key={`seg-${idx}`} style={styles.tickerBase}>
        {change.shortName}{' '}
        <Text style={deltaColor}>
          {sign}{abs}p
        </Text>
      </Text>
    );
  });
  if (separator) {
    segments.push(
      <Text key="trailing-sep" style={styles.tickerBase}>
        {separator}
      </Text>
    );
  }
  return <>{segments}</>;
}

const styles = StyleSheet.create({
  container: {
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2ECC71',
    marginRight: 8,
    flexShrink: 0,
  },
  overflow: {
    flex: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tickerBase: {
    fontSize: 11,
    letterSpacing: 0.3,
    color: '#8B949E',
  },
  deltaDown: {
    color: '#2ECC71', // accent green — price dropped (good news)
  },
  deltaUp: {
    color: 'rgba(231,76,60,0.7)', // muted red — price rose
  },
});
