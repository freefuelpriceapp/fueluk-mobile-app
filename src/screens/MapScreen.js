import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useLocation from '../hooks/useLocation';
import useStations from '../hooks/useStations';

/**
 * MapScreen — Sprint 2
 * Displays nearby and cheapest fuel stations.
 * Dark theme aligned with app design system.
 * Uses useLocation + useStations hooks wired to live production API.
 */

const FUEL_TYPES = [
  { key: 'petrol',         label: 'Petrol',         color: '#2ECC71' },
  { key: 'diesel',         label: 'Diesel',         color: '#3498DB' },
  { key: 'e10',            label: 'E10',            color: '#F39C12' },
  { key: 'super_unleaded', label: 'Super',          color: '#9B59B6' },
  { key: 'premium_diesel', label: 'Premium Diesel', color: '#E74C3C' },
];

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

  const selectedFuelMeta = FUEL_TYPES.find(f => f.key === fuelType) || FUEL_TYPES[0];

  const renderStation = ({ item }) => (
    <TouchableOpacity
      style={styles.stationCard}
      onPress={() => navigation.navigate('StationDetail', { station: item })}
      activeOpacity={0.8}
    >
      <View style={styles.stationHeader}>
        <Text style={styles.stationName} numberOfLines={1}>{item.name || item.brand}</Text>
        {item.brand && <Text style={[styles.stationBrand, { color: selectedFuelMeta.color }]}>{item.brand}</Text>}
      </View>
      <Text style={styles.stationAddress} numberOfLines={1}>{item.address}</Text>
      {item.distance_km != null && (
        <Text style={styles.distance}>
          <Ionicons name="location-outline" size={11} color="#555" /> {item.distance_km.toFixed(1)} km away
        </Text>
      )}
      <View style={styles.pricesRow}>
        {item.petrol_price != null && (
          <View style={[styles.priceTag, { borderColor: '#2ECC71' }]}>
            <Text style={styles.priceLabel}>Petrol</Text>
            <Text style={[styles.priceValue, { color: '#2ECC71' }]}>{(item.petrol_price / 100).toFixed(1)}p</Text>
          </View>
        )}
        {item.diesel_price != null && (
          <View style={[styles.priceTag, { borderColor: '#3498DB' }]}>
            <Text style={styles.priceLabel}>Diesel</Text>
            <Text style={[styles.priceValue, { color: '#3498DB' }]}>{(item.diesel_price / 100).toFixed(1)}p</Text>
          </View>
        )}
        {item.e10_price != null && (
          <View style={[styles.priceTag, { borderColor: '#F39C12' }]}>
            <Text style={styles.priceLabel}>E10</Text>
            <Text style={[styles.priceValue, { color: '#F39C12' }]}>{(item.e10_price / 100).toFixed(1)}p</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (locationLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2ECC71" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color="#DC3545" />
        <Text style={styles.errorText}>Location error: {locationError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Fuel type filter */}
      <View style={styles.filterRow}>
        {FUEL_TYPES.map((ft) => (
          <TouchableOpacity
            key={ft.key}
            style={[
              styles.filterChip,
              fuelType === ft.key && { backgroundColor: ft.color, borderColor: ft.color },
            ]}
            onPress={() => setFuelType(ft.key)}
          >
            <Text style={[
              styles.filterChipText,
              fuelType === ft.key && { color: '#0D1117' },
            ]}>
              {ft.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Mode toggle: Nearby vs Cheapest */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'nearby' && [styles.modeBtnActive, { borderColor: selectedFuelMeta.color }]]}
          onPress={() => setMode('nearby')}
        >
          <Ionicons
            name="navigate-outline"
            size={14}
            color={mode === 'nearby' ? selectedFuelMeta.color : '#555'}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.modeBtnText, mode === 'nearby' && { color: selectedFuelMeta.color }]}>Nearby</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'cheapest' && [styles.modeBtnActive, { borderColor: selectedFuelMeta.color }]]}
          onPress={() => setMode('cheapest')}
        >
          <Ionicons
            name="trending-down-outline"
            size={14}
            color={mode === 'cheapest' ? selectedFuelMeta.color : '#555'}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.modeBtnText, mode === 'cheapest' && { color: selectedFuelMeta.color }]}>Cheapest</Text>
        </TouchableOpacity>
      </View>

      {stationsLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2ECC71" />
          <Text style={styles.loadingText}>Loading stations...</Text>
        </View>
      ) : stationsError ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color="#DC3545" />
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
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} tintColor="#2ECC71" />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={48} color="#333" />
              <Text style={styles.emptyText}>No stations found nearby.</Text>
              <Text style={styles.emptySubtext}>Try switching fuel type or mode.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0D1117' },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#0D1117',
    borderWidth: 1,
    borderColor: '#333',
    margin: 3,
  },
  filterChipText: { fontSize: 12, color: '#888', fontWeight: '600' },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  modeBtnActive: { borderBottomWidth: 2 },
  modeBtnText: { fontSize: 14, color: '#555', fontWeight: '600' },
  list: { padding: 12 },
  stationCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  stationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  stationName: { fontSize: 15, fontWeight: '700', color: '#ffffff', flex: 1 },
  stationBrand: { fontSize: 12, fontWeight: '600', marginLeft: 8 },
  stationAddress: { fontSize: 13, color: '#666', marginTop: 2 },
  distance: { fontSize: 12, color: '#555', marginTop: 3 },
  pricesRow: { flexDirection: 'row', marginTop: 10, flexWrap: 'wrap' },
  priceTag: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    marginTop: 4,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: '#0D1117',
  },
  priceLabel: { fontSize: 10, color: '#666' },
  priceValue: { fontSize: 14, fontWeight: '700' },
  loadingText: { marginTop: 12, color: '#888', fontSize: 14 },
  errorText: { color: '#DC3545', fontSize: 14, textAlign: 'center', marginTop: 12, marginBottom: 12 },
  retryBtn: { backgroundColor: '#2ECC71', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { color: '#0D1117', fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyText: { fontSize: 15, color: '#888', textAlign: 'center', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#555', textAlign: 'center', marginTop: 6 },
});
