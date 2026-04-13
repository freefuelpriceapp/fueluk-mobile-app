import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const FUEL_LABELS = {
  petrol: 'Petrol (E10)',
  diesel: 'Diesel (B7)',
  super_unleaded: 'Super Unleaded',
  premium_diesel: 'Premium Diesel',
};

const StationCard = ({ station, onPress }) => {
  const { name, brand, address, prices = {} } = station;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.header}>
        <Text style={styles.brand}>{brand ?? 'Unknown'}</Text>
        <Text style={styles.name}>{name}</Text>
        {address ? <Text style={styles.address}>{address}</Text> : null}
      </View>
      <View style={styles.pricesRow}>
        {Object.entries(prices).map(([fuelType, pencePerLitre]) => (
          <View key={fuelType} style={styles.priceChip}>
            <Text style={styles.fuelLabel}>
              {FUEL_LABELS[fuelType] ?? fuelType}
            </Text>
            <Text style={styles.priceValue}>
              {typeof pencePerLitre === 'number'
                ? `${pencePerLitre.toFixed(1)}p`
                : 'N/A'}
            </Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    marginBottom: 12,
  },
  brand: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E63946',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    marginTop: 2,
  },
  address: {
    fontSize: 13,
    color: '#6C757D',
    marginTop: 2,
  },
  pricesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priceChip: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  fuelLabel: {
    fontSize: 10,
    color: '#6C757D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212529',
    marginTop: 2,
  },
});

export default StationCard;
