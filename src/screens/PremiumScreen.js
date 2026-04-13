import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getPremiumStatus } from '../api/fuelApi';

/**
 * PremiumScreen - Sprint 7
 * Displays the user's current premium tier and available features.
 * Initially renders free tier; premium tier unlocked in future sprint.
 */
export default function PremiumScreen() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const data = await getPremiumStatus();
        setStatus(data);
      } catch (err) {
        setError('Unable to load premium status.');
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color="#E8562A" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centre}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const isPremium = status?.is_premium || false;
  const tier = status?.tier || 'free';
  const features = status?.features || [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FreeFuelPrice Premium</Text>

      <View style={[styles.tierBadge, isPremium ? styles.premiumBadge : styles.freeBadge]}>
        <Text style={styles.tierText}>{tier.toUpperCase()} TIER</Text>
      </View>

      <Text style={styles.sectionTitle}>Your Features</Text>
      {features.map((f) => (
        <View key={f} style={styles.featureRow}>
          <Text style={styles.featureTick}>{String.fromCharCode(10003)}</Text>
          <Text style={styles.featureText}>{f.replace(/_/g, ' ')}</Text>
        </View>
      ))}

      {!isPremium && (
        <View style={styles.upgradeBox}>
          <Text style={styles.upgradeTitle}>Unlock Premium</Text>
          <Text style={styles.upgradeDesc}>
            Get route intelligence, price alerts, and ad-free experience.
          </Text>
          <TouchableOpacity style={styles.upgradeBtn} disabled>
            <Text style={styles.upgradeBtnText}>Coming Soon</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  centre: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  freeBadge: { backgroundColor: '#B0BEC5' },
  premiumBadge: { backgroundColor: '#E8562A' },
  tierText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureTick: {
    color: '#E8562A',
    fontWeight: '700',
    fontSize: 16,
    marginRight: 8,
  },
  featureText: {
    fontSize: 15,
    color: '#444',
    textTransform: 'capitalize',
  },
  upgradeBox: {
    marginTop: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  upgradeDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  upgradeBtn: {
    backgroundColor: '#B0BEC5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  upgradeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  errorText: {
    color: '#E8562A',
    fontSize: 16,
  },
});
