/**
 * ConsentBanner — GDPR consent bottom sheet.
 *
 * Renders only when the FEATURE_CONSENT_BANNER flag is on AND
 * the user's consent status is 'unset' or 'expired'. Non-dismissable
 * except via the two action buttons.
 *
 * No third "essential only" toggle at launch — binary by design.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { COLORS } from '../lib/theme';

export default function ConsentBanner({ visible, onGrant, onDecline }) {
  return (
    <Modal
      visible={!!visible}
      transparent
      animationType="slide"
      // The banner is non-dismissable except via the buttons. We swallow the
      // hardware-back / outside-tap dismiss by passing a no-op handler.
      onRequestClose={() => {}}
      statusBarTranslucent
    >
      <View style={styles.backdrop} pointerEvents="auto">
        {/* Backdrop swallows touches so the user must use a button. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} />

        <View
          style={styles.sheet}
          accessible
          accessibilityRole="alert"
          accessibilityViewIsModal
          accessibilityLabel="Help us improve FuelUK"
          testID="consent-banner"
        >
          <View style={styles.handle} />
          <Text style={styles.headline}>Help us improve FuelUK</Text>
          <Text style={styles.body}>
            We'd like to collect anonymous crash and usage data to fix bugs and
            make the app better. No personal data, ever. You can change your
            mind any time in Settings.
          </Text>

          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={onGrant}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Yes, help out"
            testID="consent-banner-grant"
          >
            <Text style={styles.btnPrimaryText}>Yes, help out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            onPress={onDecline}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Not now"
            testID="consent-banner-decline"
          >
            <Text style={styles.btnSecondaryText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderSubtle,
    marginBottom: 14,
  },
  headline: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  btn: {
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  btnPrimary: {
    backgroundColor: COLORS.accent,
  },
  btnPrimaryText: {
    color: COLORS.background,
    fontSize: 15,
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  btnSecondaryText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
