/**
 * PriceCard.js
 * Displays fuel price information for a single fuel type.
 * Sprint 9 — MVP price display component
 *
 * Phase 1 fix: prices are in pence-per-litre; no /100 division needed.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * @param {object} props
 * @param {string} props.fuelType - e.g. 'Petrol', 'Diesel'
 * @param {number} props.pricePerLitre - Price in pence per litre
 * @param {string} props.updatedAt - ISO date string of last update
 * @param {boolean} props.isCheapest - Highlight if cheapest nearby
 */
const PriceCard = ({ fuelType, pricePerLitre, updatedAt, isCheapest }) => {
  const formattedPrice = pricePerLitre != null
    ? `${pricePerLitre.toFixed(1)}p`
    : 'N/A';

  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown';

  return (
    <View style={[styles.card, isCheapest && styles.cheapest]}>
      <Text style={styles.fuelType}>{fuelType}</Text>
      <Text style={styles.price}>{formattedPrice}</Text>
      <Text style={styles.updated}>Updated: {formattedDate}</Text>
      {isCheapest && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Cheapest Nearby</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 120,
    alignItems: 'center',
  },
  cheapest: {
    borderWidth: 2,
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  fuelType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  updated: {
    fontSize: 11,
    color: '#9ca3af',
  },
  badge: {
    marginTop: 8,
    backgroundColor: '#22c55e',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '700',
  },
});

export default PriceCard;
