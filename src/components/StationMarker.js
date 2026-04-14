/**
 * StationMarker.js
 * Custom map marker for fuel stations on the MapScreen.
 * Sprint 9 — MVP map marker component
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Marker, Callout } from 'react-native-maps';

/**
 * @param {object} props
 * @param {object} props.station - Station object with id, name, latitude, longitude
 * @param {number} props.cheapestPrice - Cheapest price in pence per litre
 * @param {string} props.fuelType - 'petrol' or 'diesel'
 * @param {function} props.onPress - Called when marker is tapped
 * @param {boolean} props.isCheapest - Highlight as cheapest nearby
 */
const StationMarker = ({ station, cheapestPrice, fuelType, onPress, isCheapest }) => {
  const priceLabel = cheapestPrice
    ? `${(cheapestPrice / 100).toFixed(1)}p`
    : '?';

  return (
    <Marker
      coordinate={{
        latitude: station.latitude,
        longitude: station.longitude,
      }}
      onPress={() => onPress && onPress(station)}
      tracksViewChanges={false}
    >
      <View style={[styles.marker, isCheapest && styles.cheapestMarker]}>
        <Text style={styles.priceText}>{priceLabel}</Text>
        <View style={[styles.arrow, isCheapest && styles.cheapestArrow]} />
      </View>

      <Callout tooltip>
        <View style={styles.callout}>
          <Text style={styles.calloutName} numberOfLines={1}>
            {station.name}
          </Text>
          <Text style={styles.calloutPrice}>
            {fuelType === 'diesel' ? 'Diesel' : 'Petrol'}: {priceLabel}/L
          </Text>
          <Text style={styles.calloutTap}>Tap for details</Text>
        </View>
      </Callout>
    </Marker>
  );
};

const styles = StyleSheet.create({
  marker: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  cheapestMarker: {
    backgroundColor: '#16a34a',
  },
  priceText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#2563eb',
    alignSelf: 'center',
    marginTop: 2,
  },
  cheapestArrow: {
    borderTopColor: '#16a34a',
  },
  callout: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  calloutName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    maxWidth: 160,
  },
  calloutPrice: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  calloutTap: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});

export default StationMarker;
