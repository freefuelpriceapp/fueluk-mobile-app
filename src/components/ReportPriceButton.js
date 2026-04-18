import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * ReportPriceButton (Phase 2)
 *
 * Lets a user flag an incorrect price on a station.
 * Presentational only — caller owns submission + network.
 *
 * Props:
 *   onPress    - required callback, invoked on tap
 *   disabled   - optional boolean
 *   compact    - optional, renders a smaller pill variant
 *   label      - optional custom label (defaults to "Report price")
 */
export default function ReportPriceButton({ onPress, disabled = false, compact = false, label = 'Report price' }) {
  const handlePress = () => {
    if (disabled) return;
    if (typeof onPress === 'function') onPress();
  };
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      activeOpacity={0.7}
      onPress={handlePress}
      disabled={disabled}
      style={[styles.base, compact && styles.compact, disabled && styles.disabled]}
    >
      <View style={styles.row}>
        <Ionicons name="flag-outline" size={compact ? 12 : 14} color="#F5F7FA" />
        <Text style={[styles.text, compact && styles.textCompact]} numberOfLines={1}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    backgroundColor: '#2ECC7120',
    borderColor: '#2ECC7144',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  compact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  disabled: {
    opacity: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: '#F5F7FA',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  textCompact: {
    fontSize: 11,
    marginLeft: 4,
  },
});

