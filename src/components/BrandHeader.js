import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * BrandHeader
 * Premium app header with a custom logo mark (fuel-drop + map-pin fusion),
 * a clean wordmark, and a calm dynamic subheading.
 *
 * Pure RN primitives + @expo/vector-icons — no new dependencies.
 * Works in both light/dark themes; colours come from the `theme` prop.
 */
const DEFAULT_THEME = {
  bg: '#0D1117',
  surface: '#12172040',
  text: '#F5F7FA',
  muted: '#8B95A7',
  accent: '#2ECC71',
  accentSoft: '#2ECC7122',
  border: '#1E2634',
};

function LogoMark({ size = 36, accent = '#2ECC71' }) {
  // A fuel-drop silhouette combined with a pin bottom-point, drawn with
  // nested Views for zero-dependency vector feel.
  const dropSize = size;
  const innerPin = size * 0.42;
  return (
    <View style={{ width: dropSize, height: dropSize, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: dropSize,
          height: dropSize,
          borderRadius: dropSize / 2,
          backgroundColor: accent + '22',
        }}
      />
      <View
        style={{
          width: dropSize * 0.72,
          height: dropSize * 0.72,
          borderTopLeftRadius: dropSize,
          borderTopRightRadius: dropSize,
          borderBottomLeftRadius: dropSize * 0.35,
          borderBottomRightRadius: dropSize * 0.35,
          backgroundColor: accent,
          transform: [{ rotate: '-12deg' }],
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: accent,
          shadowOpacity: 0.35,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        <View
          style={{
            width: innerPin,
            height: innerPin,
            borderRadius: innerPin / 2,
            backgroundColor: '#0D1117',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: innerPin * 0.42,
              height: innerPin * 0.42,
              borderRadius: innerPin,
              backgroundColor: accent,
            }}
          />
        </View>
      </View>
    </View>
  );
}

export default function BrandHeader({
  subtitle = 'Finding the best nearby fuel prices',
  onSearchPress,
  theme = DEFAULT_THEME,
  showSearch = true,
  pulse = false,
}) {
  // Subtle breathing pulse on the logo halo when loading.
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!pulse) { anim.setValue(0); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, anim]);

  const haloScale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const haloOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.0] });

  return (
    <View style={[styles.wrap, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
      <View style={styles.row}>
        <View style={styles.logoBlock}>
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.accent,
              opacity: haloOpacity,
              transform: [{ scale: haloScale }],
            }}
          />
          <LogoMark size={36} accent={theme.accent} />
        </View>
        <View style={styles.textBlock}>
          <Text style={[styles.wordmark, { color: theme.text }]} numberOfLines={1}>
            FreeFuel<Text style={{ color: theme.accent }}>Price</Text>
          </Text>
          <Text style={[styles.subtitle, { color: theme.muted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {showSearch && (
          <TouchableOpacity
            onPress={onSearchPress}
            accessibilityRole="button"
            accessibilityLabel="Search stations"
            style={[styles.searchBtn, { borderColor: theme.accent, backgroundColor: theme.accentSoft }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="search" size={18} color={theme.accent} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  logoBlock: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  textBlock: { flex: 1 },
  wordmark: { fontSize: 19, fontWeight: '700', letterSpacing: 0.2 },
  subtitle: { fontSize: 12, marginTop: 2, letterSpacing: 0.1 },
  searchBtn: {
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    marginLeft: 8,
  },
});
