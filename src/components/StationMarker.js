/**
 * StationMarker.js
 * Custom map marker for fuel stations on the MapScreen.
 *
 * FIX (Phase 4): Removed the erroneous /100 division on cheapestPrice.
 * Prices are already in pence-per-litre (e.g. 141.9), so no conversion
 * is needed before rendering. The label now correctly shows e.g. "141.9p".
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { brandToString } from '../lib/brand';

const FUEL_COLORS = {
  petrol: '#2ECC71',
  diesel: '#3498DB',
  e10: '#F39C12',
  super_unleaded: '#9B59B6',
  premium_diesel: '#E74C3C',
};

const FUEL_LABELS = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  e10: 'E10',
  super_unleaded: 'Super',
  premium_diesel: 'Prem. Diesel',
};

/**
 * @param {object} props
 * @param {object} props.station       - Station object with id, name, latitude, longitude
 * @param {number} props.cheapestPrice - Price in pence per litre (e.g. 141.9). Already in pence — do NOT divide by 100.
 * @param {string} props.fuelType      - Selected fuel type
 * @param {function} props.onPress     - Called when marker is tapped
 * @param {boolean} props.isCheapest   - Highlight as cheapest nearby
 * @param {boolean} props.isSelected   - Highlight as currently selected marker
 */
const StationMarker = ({ station, cheapestPrice, fuelType, onPress, isCheapest, isSelected }) => {
  // Prices are in pence-per-litre — display directly without /100.
  const priceLabel = cheapestPrice != null
    ? `${Number(cheapestPrice).toFixed(1)}p`
    : '?';

  const fuelColor = FUEL_COLORS[fuelType] || FUEL_COLORS.petrol;
  const markerBg = isCheapest ? '#16a34a' : isSelected ? fuelColor : '#1C2128';
  const arrowColor = isCheapest ? '#16a34a' : isSelected ? fuelColor : '#1C2128';

  // Ensure coordinates are valid numbers — API may return strings.
  const markerLat = Number(station.lat ?? station.latitude);
  const markerLng = Number(station.lon ?? station.lng ?? station.longitude);

  // Skip rendering if coordinates are not valid numbers.
  if (!Number.isFinite(markerLat) || !Number.isFinite(markerLng)) {
    return null;
  }

  return (
    <Marker
      coordinate={{
        latitude: markerLat,
        longitude: markerLng,
      }}
      onPress={() => onPress && onPress(station)}
    >
      <View style={[styles.marker, { backgroundColor: markerBg, borderColor: isCheapest || isSelected ? markerBg : '#30363D' }]}>
        <Text style={[styles.priceText, { color: isCheapest || isSelected ? '#ffffff' : '#E6EDF3' }]}>
          {priceLabel}
        </Text>
        <View style={[styles.arrow, { borderTopColor: arrowColor }]} />
      </View>

      <Callout
        tooltip
        onPress={() => onPress && onPress(station)}
      >
        <View style={styles.callout}>
          <Text style={styles.calloutName} numberOfLines={1}>
            {station.name || brandToString(station.brand)}
          </Text>
          {brandToString(station.brand) ? (
            <Text style={[styles.calloutBrand, { color: fuelColor }]}>{brandToString(station.brand)}</Text>
          ) : null}
          <Text style={styles.calloutPrice}>
            {FUEL_LABELS[fuelType] || fuelType}: {priceLabel}/L
          </Text>
          <Text style={styles.calloutTap}>Tap for details →</Text>
        </View>
      </Callout>
    </Marker>
  );
};

const styles = StyleSheet.create({
  marker: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 48,
  },
  priceText: {
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
    alignSelf: 'center',
    marginTop: 2,
  },
  callout: {
    backgroundColor: '#161B22',
    borderRadius: 10,
    padding: 12,
    minWidth: 160,
    maxWidth: 220,
    borderWidth: 1,
    borderColor: '#30363D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  calloutName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E6EDF3',
    marginBottom: 2,
  },
  calloutBrand: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  calloutPrice: {
    fontSize: 13,
    color: '#8B949E',
    marginBottom: 6,
  },
  calloutTap: {
    fontSize: 11,
    color: '#2ECC71',
    fontStyle: 'italic',
  },
});

export default StationMarker;
