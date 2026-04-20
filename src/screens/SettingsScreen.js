import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const PRIVACY_URL = 'https://api.freefuelpriceapp.com/privacy';
const SUPPORT_URL = 'https://api.freefuelpriceapp.com/support';
const CONTACT_EMAIL = 'support@freefuelpriceapp.com';

// Read the version from Expo's app config (app.json / app.config.js).
// Falls back to '1.0.0' if the config is not available (e.g. bare workflow edge cases).
const APP_VERSION = Constants.expoConfig?.version || Constants.manifest?.version || '1.0.0';

function SettingsRow({ icon, label, sublabel, onPress, showChevron = true, danger = false }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.iconWrapper, danger && styles.iconWrapperDanger]}>
        <Ionicons name={icon} size={20} color={danger ? '#e74c3c' : '#2ECC71'} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      {showChevron ? (
        <Ionicons name="chevron-forward" size={16} color="#555" />
      ) : null}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function SettingsScreen() {
  const openURL = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open this link.');
      }
    } catch (_e) {
      Alert.alert('Error', 'Unable to open this link.');
    }
  };

  const contactSupport = () => {
    openURL(`mailto:${CONTACT_EMAIL}?subject=FreeFuelPrice%20Support`);
  };

  const clearFavourites = () => {
    Alert.alert(
      'Clear Favourites',
      'This will remove all your saved stations. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('user_favourites');
            Alert.alert('Done', 'Your favourites have been cleared.');
          },
        },
      ]
    );
  };

  const clearLocalData = () => {
    Alert.alert(
      'Clear Local Data',
      'This clears cached data on this device. Your price alerts live on our servers — to remove those, open the Alerts screen and swipe each one individually.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove([
              'price_alerts',
              'cached_nearby_stations',
            ]);
            Alert.alert('Done', 'Local cached data has been cleared.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <SectionHeader title="SUPPORT" />
      <View style={styles.section}>
        <SettingsRow
          icon="help-circle-outline"
          label="Help & Support"
          sublabel={SUPPORT_URL}
          onPress={() => openURL(SUPPORT_URL)}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="mail-outline"
          label="Contact Us"
          sublabel={CONTACT_EMAIL}
          onPress={contactSupport}
        />
      </View>

      <SectionHeader title="PRIVACY & LEGAL" />
      <View style={styles.section}>
        <SettingsRow
          icon="shield-checkmark-outline"
          label="Privacy Policy"
          sublabel={PRIVACY_URL}
          onPress={() => openURL(PRIVACY_URL)}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="location-outline"
          label="Location Data"
          sublabel="Used only to find nearby stations. Never stored."
          onPress={() => {}}
          showChevron={false}
        />
      </View>

      <SectionHeader title="DATA" />
      <View style={styles.section}>
        <SettingsRow
          icon="heart-dislike-outline"
          label="Clear Favourites"
          onPress={clearFavourites}
          danger
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="trash-outline"
          label="Clear Local Data"
          sublabel="Remove cached stations on this device. Server alerts stay — delete them from the Alerts screen."
          onPress={clearLocalData}
          danger
        />
      </View>

      <SectionHeader title="ABOUT" />
      <View style={styles.section}>
        <SettingsRow
          icon="information-circle-outline"
          label="App Version"
          sublabel={APP_VERSION}
          onPress={() => {}}
          showChevron={false}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="flash-outline"
          label="Data Source"
          sublabel="UK Government fuel price data"
          onPress={() => {}}
          showChevron={false}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="time-outline"
          label="Price Freshness"
          sublabel="Prices older than 7 days are flagged as potentially outdated."
          onPress={() => {}}
          showChevron={false}
        />
      </View>

      <Text style={styles.footer}>
        {`FreeFuelPrice \u00A9 2025-26. All rights reserved.\nHelping UK drivers find the cheapest fuel nearby.`}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  content: {
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 1.2,
    marginTop: 24,
    marginBottom: 6,
    marginHorizontal: 16,
  },
  section: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    marginHorizontal: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a45',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#0d2d1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconWrapperDanger: {
    backgroundColor: '#2d0d0d',
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
  },
  rowLabelDanger: {
    color: '#e74c3c',
  },
  rowSublabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a45',
    marginLeft: 62,
  },
  footer: {
    fontSize: 12,
    color: '#444',
    textAlign: 'center',
    marginTop: 32,
    marginHorizontal: 24,
    lineHeight: 18,
  },
});
