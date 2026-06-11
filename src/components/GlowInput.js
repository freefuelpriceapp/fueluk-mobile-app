/**
 * GlowInput — a TextInput wrapper that adds a subtle animated keyline glow
 * when the input is focused. The glow is a 1px outer ring that pulses
 * opacity 0.4 → 0.9 → 0.4 over 2.5s while focused, and fades to 0 on blur.
 *
 * Design intent: "Perplexity feel" — focused inputs signal active attention
 * through subtle breath animation, not a hard colour swap.
 *
 * Usage:
 *   <GlowInput
 *     style={styles.myInput}
 *     placeholder="Enter UK reg..."
 *     value={value}
 *     onChangeText={setText}
 *   />
 *
 * All TextInput props are forwarded. The glow ring is rendered as a sibling
 * View (not inside the TextInput) so it never interferes with layout.
 *
 * Props:
 *   glowColor — colour of the ring (defaults to COLORS.accent)
 *   containerStyle — style applied to the outer wrapper View
 *   All other props — forwarded to TextInput
 */

import React, { useRef, useState, useCallback, useEffect, forwardRef } from 'react';
import { View, TextInput, Animated, Easing, StyleSheet } from 'react-native';
import { COLORS } from '../lib/theme';

const GlowInput = forwardRef(function GlowInput(
  { style, containerStyle, glowColor, onFocus, onBlur, ...rest },
  ref
) {
  const color = glowColor || COLORS.accent;
  const [focused, setFocused] = useState(false);
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const loopRef = useRef(null);

  // Start the pulse loop when focused; stop + fade out when blurred
  useEffect(() => {
    if (focused) {
      // Initial fade-in
      Animated.timing(ringOpacity, {
        toValue: 0.4,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        // Continuous pulse: 0.4 → 0.9 → 0.4 over 2.5s
        loopRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(ringOpacity, {
              toValue: 0.9,
              duration: 1250,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(ringOpacity, {
              toValue: 0.4,
              duration: 1250,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
        loopRef.current.start();
      });
    } else {
      if (loopRef.current) {
        loopRef.current.stop();
        loopRef.current = null;
      }
      Animated.timing(ringOpacity, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
    return () => {
      if (loopRef.current) {
        loopRef.current.stop();
        loopRef.current = null;
      }
    };
  }, [focused, ringOpacity]);

  const handleFocus = useCallback(
    (e) => {
      setFocused(true);
      onFocus?.(e);
    },
    [onFocus]
  );

  const handleBlur = useCallback(
    (e) => {
      setFocused(false);
      onBlur?.(e);
    },
    [onBlur]
  );

  return (
    <View style={[styles.container, containerStyle]} pointerEvents="box-none">
      {/* Glow ring — absolutely positioned, sits behind the input's border */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.glowRing,
          {
            borderColor: color,
            opacity: ringOpacity,
          },
        ]}
        pointerEvents="none"
      />
      <TextInput
        ref={ref}
        style={[styles.input, style]}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...rest}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  glowRing: {
    borderRadius: 8,
    borderWidth: 1,
    margin: -1, // compensate for the 1px border so it sits outside the input
    pointerEvents: 'none',
  },
  input: {
    // No default styles — inherits from the passed `style` prop
  },
});

export default GlowInput;
