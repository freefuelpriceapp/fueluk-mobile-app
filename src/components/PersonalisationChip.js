import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { describePersonalisation } from '../lib/personalisation';
import { COLORS } from '../lib/theme';

/**
 * PersonalisationChip — subtle "🚗  Personalised to your 2022 Mercedes · E10 · 45 mpg"
 * chip shown at the top of HomeScreen when we already know the user's vehicle.
 *
 * Returns null when `vehicle` is null or unusable — HomeScreen handles the
 * "tell us your car" chip in that case.
 */
export default function PersonalisationChip({ vehicle, onPress, style }) {
  const desc = describePersonalisation(vehicle);
  if (!desc || !desc.present) return null;

  return (
    <TouchableOpacity
      style={[styles.wrap, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={desc.accessibilityLabel}
      accessibilityHint="Edit your vehicle for more accurate savings"
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      <Ionicons name="car-sport-outline" size={14} color={COLORS.accent} />
      <View style={styles.textWrap}>
        <Text style={styles.headline} numberOfLines={1}>
          {desc.headline}
        </Text>
        {desc.detail ? (
          <View style={styles.detailRow}>
            <Text style={styles.detail} numberOfLines={1}>
              {desc.detail}
            </Text>
            {desc.verifiedMpg ? (
              <Ionicons
                name="checkmark-circle"
                size={11}
                color={COLORS.accent}
                style={{ marginLeft: 4 }}
              />
            ) : null}
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  textWrap: {
    flex: 1,
  },
  headline: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  detail: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
