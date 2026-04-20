import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '../lib/theme';
import { FEATURES } from '../lib/featureFlags';

function MenuRow({ icon, label, sublabel, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.iconWrapper}>
        <Ionicons name={icon} size={20} color={COLORS.accent} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

export default function MoreScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionHeader}>TOOLS</Text>
        <View style={styles.section}>
          {FEATURES.tripCalculator ? (
            <>
              <MenuRow
                icon="calculator-outline"
                label="Trip Calculator"
                sublabel="Estimate fuel cost for a journey"
                onPress={() => navigation.navigate('TripCalculator')}
              />
              <View style={styles.divider} />
            </>
          ) : null}
          <MenuRow
            icon="notifications-outline"
            label="Price Alerts"
            sublabel="Get notified when prices drop"
            onPress={() => navigation.navigate('Alerts')}
          />
        </View>

        <Text style={styles.sectionHeader}>APP</Text>
        <View style={styles.section}>
          <MenuRow
            icon="settings-outline"
            label="Settings"
            sublabel="Privacy, support, app info"
            onPress={() => navigation.navigate('Settings')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: FONT_SIZES.sm - 1,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    marginTop: 24,
    marginBottom: 6,
    marginHorizontal: 16,
  },
  section: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    marginHorizontal: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderAlt,
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
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: FONT_SIZES.md + 1,
    color: COLORS.white,
    fontWeight: '500',
  },
  rowSublabel: {
    fontSize: FONT_SIZES.sm,
    color: '#666',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderAlt,
    marginLeft: 62,
  },
});
