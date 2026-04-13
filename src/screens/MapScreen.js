import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import useLocation from '../hooks/useLocation';
import useStations from '../hooks/useStations';

/**
 * MapScreen — Sprint 6
 * Displays nearby fuel stations with prices.
 * Uses useLocation + useStations hooks.
 */
export default function MapScreen({ navigation }) {
  const [fuelType, setFuelType] = useState('petrol');
  const [mode, setMode] = useState('nearby'); // 'nearby' | 'cheapest'

  const { location, loading: locationLoading, error: locationError } = useLocation();
  const {
    stations,
    loading: stationsLoading,
    error: stationsError,
    refetch,
  } = useStations(location, { fuelType, mode, radiusKm: 5 });

  const fuelOptions = ['petrol', 'diesel', 'super_unleaded', 'premium_diesel'];

  const renderStation = ({ item }) => (
    <TouchableOpacity
      style={styles.stationCard}
      onPress={() => navigation.navigate('StationDetail', { station: item })}
    >
      <View style={styles.stationHeader}>
        <Text style={styles.stationName}>{item.name || item.brand}</Text>
        <Text style={styles.stationBrand}>{item.brand}</Text>
      </View>
      <Text style={styles.stationAddress}>{item.address}</Text>
      {item.distance_km && (
        <Text style={styles.distance}>{item.distance_km.toFixed(1)} km away</Text>
      )}
      <View style={styles.pricesRow}>
        {item.petrol_price && (
          <View style={styles.priceTag}>
            <Text style={styles.priceLabel}>Petrol</Text>
            <Text style={styles.priceValue}>{(item.petrol_price / 100).toFixed(1)}p</Text>
          </View>
        )}
        {item.diesel_price && (
          <View style={styles.priceTag}>
            <Text style={styles.priceLabel}>Diesel</Text>
            <Text style={styles.priceValue}>{(item.diesel_price / 100).toFixed(1)}p</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (locationLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E63946" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Location error: {locationError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fuel type filter */}
      <View style={styles.filterRow}>
        {fuelOptions.map((ft) => (
          <TouchableOpacity
            key={ft}
            style={[styles.filterChip, fuelType === ft && styles.filterChipActive]}
            onPress={() => setFuelType(ft)}
          >
            <Text style={[styles.filterChipText, fuelType === ft && styles.filterChipTextActive]}>
              {ft.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Mode toggle */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'nearby' && styles.modeBtnActive]}
          onPress={() => setMode('nearby')}
        >
          <Text style={[styles.modeBtnText, mode === 'nearby' && styles.modeBtnTextActive]}>Nearby</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'cheapest' && styles.modeBtnActive]}
          onPress={() => setMode('cheapest')}
        >
          <Text style={[styles.modeBtnText, mode === 'cheapest' && styles.modeBtnTextActive]}>Cheapest</Text>
        </TouchableOpacity>
      </View>

      {stationsLoading ? (
        <ActivityIndicator style={{ marginTop: 20 }} size="large" color="#E63946" />
      ) : stationsError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{stationsError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={stations}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderStation}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No stations found nearby.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, backgroundColor: '#fff' },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#eee',
    margin: 4,
  },
  filterChipActive: { backgroundColor: '#E63946' },
  filterChipText: { fontSize: 12, color: '#333' },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  modeRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  modeBtn: { flex: 1, alignItems: 'center', padding: 10 },
  modeBtnActive: { borderBottomWidth: 2, borderColor: '#E63946' },
  modeBtnText: { fontSize: 14, color: '#666' },
  modeBtnTextActive: { color: '#E63946', fontWeight: '600' },
  list: { padding: 10 },
  stationCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  stationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  stationName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  stationBrand: { fontSize: 12, color: '#E63946', fontWeight: '600', marginLeft: 8 },
  stationAddress: { fontSize: 13, color: '#666', marginTop: 2 },
  distance: { fontSize: 12, color: '#999', marginTop: 2 },
  pricesRow: { flexDirection: 'row', marginTop: 8 },
  priceTag: {
    backgroundColor: '#FFF3F3',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    alignItems: 'center',
  },
  priceLabel: { fontSize: 10, color: '#666' },
  priceValue: { fontSize: 14, fontWeight: '700', color: '#E63946' },
  loadingText: { marginTop: 12, color: '#666', fontSize: 14 },
  errorText: { color: '#E63946', fontSize: 14, textAlign: 'center' },
  retryBtn: { marginTop: 12, backgroundColor: '#E63946', borderRadius: 8, padding: 10, paddingHorizontal: 20 },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 14 },
});
