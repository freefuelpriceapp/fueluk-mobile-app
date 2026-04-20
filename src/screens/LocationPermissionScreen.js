import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS, SPACING, FONT_SIZES } from '../lib/theme';

/**
 * LocationPermissionScreen
 *
 * A dedicated full-screen prompt shown on first launch before we trigger the
 * OS permission dialog. Explains the value of granting location access and
 * offers a postcode-search fallback for users who prefer not to share it.
 *
 * Props:
 *   onGranted   — called when the OS returns a granted permission status
 *   onSkip      — called when the user opts to search by postcode instead
 */
export default function LocationPermissionScreen({ onGranted, onSkip }) {
  const [requesting, setRequesting] = useState(false);

  const handleEnable = async () => {
    setRequesting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted' && typeof onGranted === 'function') {
        onGranted();
      } else if (typeof onSkip === 'function') {
        // If the user denied, fall through to the postcode-search fallback.
        onSkip();
      }
    } catch (_e) {
      if (typeof onSkip === 'function') onSkip();
    } finally {
      setRequesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="location" size={96} color={COLORS.accent} />
        </View>

        <Text style={styles.title}>Find cheap fuel near you</Text>
        <Text style={styles.subtitle}>
          We use your location to show the nearest and cheapest stations. Your
          location is never stored.
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleEnable}
          disabled={requesting}
          activeOpacity={0.82}
        >
          {requesting ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <Text style={styles.primaryBtnText}>Enable Location</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={onSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryBtnText}>Search by postcode instead</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  iconWrap: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: FONT_SIZES.md + 1,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xxl,
  },
  primaryBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xxl,
    borderRadius: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  primaryBtnText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  secondaryBtnText: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.md + 1,
    fontWeight: '600',
  },
});
