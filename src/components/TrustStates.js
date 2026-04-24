/**
 * TrustStates.js
 * Reusable, launch-safe trust UI primitives for the FuelUK core journey.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function LoadingState({ label = 'Loading…' }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#2ECC71" />
      <Text style={styles.mutedLabel}>{label}</Text>
    </View>
  );
}

export function EmptyState({ icon = 'search-outline', title = 'Nothing to show yet', subtitle = 'Try widening the search or pulling to refresh.', actionLabel, onAction }) {
  return (
    <View style={styles.centered}>
      <Ionicons name={icon} size={56} color="#444" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.primaryBtn} onPress={onAction} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function NetworkErrorState({ title = 'Can’t reach fuel prices', subtitle = 'Check your connection and try again. Prices only show when we can confirm them.', onRetry }) {
  return (
    <View style={styles.centered}>
      <Ionicons name="cloud-offline-outline" size={56} color="#e74c3c" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {onRetry ? (
        <TouchableOpacity style={styles.primaryBtn} onPress={onRetry} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function PermissionDeniedBanner({ onOpenSettings }) {
  return (
    <View style={[styles.banner, styles.bannerAmber]}>
      <Ionicons name="location-outline" size={18} color="#F39C12" />
      <Text style={styles.bannerText} numberOfLines={2}>
        Location access is off. Showing a default area — enable location for accurate nearby prices.
      </Text>
      {onOpenSettings ? (
        <TouchableOpacity onPress={onOpenSettings} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.bannerAction}>Settings</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function isStale(lastUpdatedIso, thresholdHours = 24) {
  if (!lastUpdatedIso) return false;
  const t = new Date(lastUpdatedIso).getTime();
  if (Number.isNaN(t)) return false;
  return (Date.now() - t) > thresholdHours * 60 * 60 * 1000;
}

export function StaleDataBanner({ lastUpdatedIso }) {
  const when = lastUpdatedIso ? new Date(lastUpdatedIso) : null;
  const label = when ? `Prices last refreshed ${when.toLocaleString()}.` : 'Prices may be out of date.';
  return (
    <View style={[styles.banner, styles.bannerMuted]}>
      <Ionicons name="time-outline" size={18} color="#aaa" />
      <Text style={styles.bannerText} numberOfLines={2}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48, backgroundColor: '#0d0d1a' },
  title: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginTop: 14, marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 21, marginBottom: 16 },
  mutedLabel: { marginTop: 10, fontSize: 13, color: '#888' },
  primaryBtn: { backgroundColor: '#2ECC71', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  primaryBtnText: { color: '#0D1117', fontWeight: '700', fontSize: 14 },
  banner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, marginHorizontal: 12, marginTop: 8, borderRadius: 10, borderWidth: 1, gap: 8 },
  bannerAmber: { backgroundColor: '#2a1d0d', borderColor: '#F39C12' },
  bannerMuted: { backgroundColor: '#1a1a2e', borderColor: '#2a2a45' },
  bannerText: { flex: 1, fontSize: 12, color: '#ddd' },
  bannerAction: { fontSize: 12, fontWeight: '700', color: '#2ECC71' },
});
