/**
 * ReceiptOnboardingSheet — one-time celebration bottom sheet.
 *
 * Shown after 3rd app open OR when synthetic savings > £20 AND no receipts yet.
 * Dismissible. Navigates to FuelLogScreen on CTA tap.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../lib/theme';
import { markOnboardingDone } from '../lib/receiptOnboarding';

export default function ReceiptOnboardingSheet({ visible, onDismiss, onSetUp }) {
  const handleSetUp = async () => {
    await markOnboardingDone();
    if (onSetUp) onSetUp();
  };

  const handleDismiss = async () => {
    await markOnboardingDone();
    if (onDismiss) onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={handleDismiss}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Trophy icon */}
          <View style={styles.iconWrap}>
            <Ionicons name="receipt-outline" size={40} color={COLORS.accent} />
          </View>

          <Text style={styles.title}>Track your real savings</Text>
          <Text style={styles.body}>
            Want to know exactly how much you&apos;re saving on fuel? Snap your receipts — FuelUK
            compares your p/L to the national average and shows your real £ saved.
          </Text>
          <Text style={styles.subBody}>No sign-up. All data stays on your device.</Text>

          {/* CTA */}
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={handleSetUp}
            activeOpacity={0.85}
            accessibilityLabel="Set up Fuel Log"
            accessibilityRole="button"
          >
            <Ionicons name="camera-outline" size={18} color={COLORS.background} />
            <Text style={styles.ctaBtnText}>Set up Fuel Log</Text>
          </TouchableOpacity>

          {/* Dismiss */}
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={handleDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissText}>Maybe later</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: 20,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0d2d1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  subBody: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 24,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    marginBottom: 12,
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.background,
  },
  dismissBtn: {
    paddingVertical: 8,
  },
  dismissText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
