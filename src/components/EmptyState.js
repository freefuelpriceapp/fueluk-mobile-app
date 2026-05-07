/**
 * EmptyState — shared empty / error state primitive.
 *
 * Voice rules: short, plain English, no exclamation marks, no apologies.
 * Use `type="empty"` for "nothing to show" states and `type="error"` for
 * fetch failures. Both share the same shape: glyph, headline, helper, optional CTA.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../lib/theme';

const DEFAULT_ICONS = {
  empty: 'search-outline',
  error: 'cloud-offline-outline',
};

const DEFAULT_HEADLINES = {
  empty: 'Nothing here yet',
  error: 'Something went wrong',
};

export default function EmptyState({
  type = 'empty',
  icon,
  headline,
  helper,
  cta,
  onCta,
  compact = false,
  testID,
}) {
  const resolvedIcon = icon || DEFAULT_ICONS[type] || DEFAULT_ICONS.empty;
  const resolvedHeadline = headline || DEFAULT_HEADLINES[type];
  const iconColor = type === 'error' ? COLORS.danger : COLORS.textDisabled;

  return (
    <View
      style={[styles.container, compact && styles.containerCompact]}
      testID={testID}
      accessibilityRole={type === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion={type === 'error' ? 'polite' : undefined}
    >
      <Ionicons name={resolvedIcon} size={compact ? 36 : 48} color={iconColor} />
      <Text style={styles.headline}>{String(resolvedHeadline)}</Text>
      {helper ? <Text style={styles.helper}>{String(helper)}</Text> : null}
      {cta && onCta ? (
        <TouchableOpacity
          style={styles.cta}
          onPress={onCta}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={cta}
        >
          <Text style={styles.ctaText}>{cta}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  containerCompact: {
    paddingVertical: 24,
  },
  headline: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 14,
    marginBottom: 6,
    textAlign: 'center',
  },
  helper: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 14,
  },
  cta: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  ctaText: {
    color: COLORS.background,
    fontWeight: '700',
    fontSize: 14,
  },
});
