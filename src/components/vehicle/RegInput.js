import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '../../lib/theme';

const PLATE_YELLOW = '#F5D300';
const PLATE_BORDER = '#b8a000';
const PLATE_TEXT = '#111111';

export default function RegInput({ value, onChangeText, onSubmit, loading, error }) {
  const handleChange = (t) => {
    const sanitised = String(t || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '');
    onChangeText(sanitised);
  };

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.plateWrap}>
          <View style={styles.plateLeftBadge}>
            <Text style={styles.plateLeftText}>GB</Text>
          </View>
          <TextInput
            value={value}
            onChangeText={handleChange}
            placeholder="AB12 CDE"
            placeholderTextColor="#7a6a00"
            maxLength={8}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={onSubmit}
            style={styles.plateInput}
          />
        </View>
        <TouchableOpacity
          style={[styles.checkBtn, loading && styles.checkBtnDisabled]}
          onPress={onSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.background} size="small" />
          ) : (
            <Text style={styles.checkBtnText}>Check</Text>
          )}
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plateWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: PLATE_YELLOW,
    borderRadius: 8,
    marginRight: SPACING.md,
    borderWidth: 2,
    borderColor: PLATE_BORDER,
    overflow: 'hidden',
    height: 56,
  },
  plateLeftBadge: {
    backgroundColor: '#003399',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plateLeftText: {
    color: '#FFCC00',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  plateInput: {
    flex: 1,
    color: PLATE_TEXT,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
    paddingVertical: 0,
    paddingHorizontal: 8,
    ...Platform.select({
      ios: { fontFamily: 'Menlo' },
      android: { fontFamily: 'monospace' },
      default: {},
    }),
  },
  checkBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    height: 56,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 96,
  },
  checkBtnDisabled: {
    opacity: 0.6,
  },
  checkBtnText: {
    color: COLORS.background,
    fontWeight: '800',
    fontSize: FONT_SIZES.md + 1,
    letterSpacing: 0.3,
  },
  error: {
    color: COLORS.error,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.sm,
    marginLeft: SPACING.xs,
  },
});
