import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VehicleCardShell from './VehicleCardShell';
import { COLORS, SPACING, FONT_SIZES } from '../../lib/theme';
import { lightHaptic } from '../../lib/haptics';

let WebBrowser = null;
try {
  WebBrowser = require('expo-web-browser');
} catch (_e) {
  WebBrowser = null;
}

const FALLBACK_URL = 'https://enquiry.navigate.mib.org.uk/checkyourvehicle';

export default function InsuranceCard({ info }) {
  const [opening, setOpening] = useState(false);

  const url = info?.url || FALLBACK_URL;
  const provider = info?.provider || 'MIB Navigate';
  const disclaimer =
    info?.disclaimer ||
    'Opens MIB Navigate. You must be the vehicle owner or an authorised driver.';

  const handleOpen = async () => {
    lightHaptic();
    setOpening(true);
    try {
      if (WebBrowser && typeof WebBrowser.openBrowserAsync === 'function') {
        await WebBrowser.openBrowserAsync(url, {
          toolbarColor: COLORS.surfaceAlt,
          controlsColor: COLORS.accent,
          dismissButtonStyle: 'close',
        });
      } else {
        const supported = await Linking.canOpenURL(url);
        if (supported) await Linking.openURL(url);
        else Alert.alert('Unavailable', 'Unable to open the insurance checker.');
      }
    } catch (_e) {
      Alert.alert('Unavailable', 'Unable to open the insurance checker right now.');
    } finally {
      setOpening(false);
    }
  };

  return (
    <VehicleCardShell icon="shield-outline" title="Insurance">
      <TouchableOpacity
        style={styles.linkButton}
        onPress={handleOpen}
        disabled={opening}
        activeOpacity={0.8}
      >
        <Ionicons name="open-outline" size={16} color={COLORS.accent} />
        <Text style={styles.linkText}>Check via {provider}</Text>
      </TouchableOpacity>
      <Text style={styles.disclaimer}>{disclaimer}</Text>
    </VehicleCardShell>
  );
}

const styles = StyleSheet.create({
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(46,204,113,0.10)',
  },
  linkText: {
    color: COLORS.accent,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    marginLeft: 6,
  },
  disclaimer: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    lineHeight: 17,
  },
});
