import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StationCard from '../components/StationCard';
import { getNearbyStations } from '../api/fuelApi';
import useLocation from '../hooks/useLocation';

const FUEL_TYPES = [
  { key: 'petrol', label: 'Petrol', color: '#2ECC71' },
  { key: 'diesel', label: 'Diesel', color: '#3498DB' },
  { key: 'e10',    label: 'E10',    color: '#F39C12' },
];

const HomeScreen = ({ navigation }) => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFuel, setSelectedFuel] = useState('petrol');
  const { location } = useLocation();

  const fetchStations = useCallback(async () => {
    if (!location) return;
    try {
      setError(null);
      const lat = location.coords?.latitude;
      const lng = location.coords?.longitude;
      if (!lat || !lng) {
        setError('Location unavailable. Please enable location access.');
        setLoading(false);
        return;
      }
      const data = await getNearbyStations({ lat, lng, radiusKm: location.radiusKm || 5, fuel: selectedFuel });
      setStations(data.stations || []);
    } catch (err) {
      setError('Unable to load stations. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [location, selectedFuel]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStations();
  };

  const handleStationPress = (station) => {
    navigation.navigate('StationDetail', { station });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2ECC71" />
        <Text style={styles.loadingText}>Finding nearby stations...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Nearby Fuel Prices</Text>
          {location?.coords && (
            <Text style={styles.subtitle}>
              {location.postcode} · within {location.radiusKm || 5}km
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Search')}
          style={styles.searchBtn}
        >
          <Ionicons name="search" size={20} color="#2ECC71" />
        </TouchableOpacity>
      </View>

      {/* Fuel type filter */}
      <View style={styles.filterRow}>
        {FUEL_TYPES.map(ft => (
          <TouchableOpacity
            key={ft.key}
            style={[
              styles.filterBtn,
              selectedFuel === ft.key && { backgroundColor: ft.color, borderColor: ft.color },
            ]}
            onPress={() => setSelectedFuel(ft.key)}
          >
            <Text style={[
              styles.filterBtnText,
              selectedFuel === ft.key && { color: '#0D1117' },
            ]}>
              {ft.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color="#DC3545" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={stations}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item }) => (
            <StationCard
              station={item}
              fuelType={selectedFuel}
              onPress={() => handleStationPress(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2ECC71"
            />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={48} color="#333" />
              <Text style={styles.emptyText}>No {FUEL_TYPES.find(f => f.key === selectedFuel)?.label} stations found nearby.</Text>
              <Text style={styles.emptySubtext}>Try increasing the search radius or switching fuel type.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1117', padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  subtitle: { fontSize: 12, color: '#888', marginTop: 2 },
  searchBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2ECC71',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    marginHorizontal: 3,
  },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: '#888' },
  list: { padding: 12 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#888' },
  errorText: { fontSize: 14, color: '#DC3545', textAlign: 'center', marginTop: 12, marginBottom: 16 },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#2ECC71',
    borderRadius: 8,
  },
  retryBtnText: { color: '#0D1117', fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyText: { fontSize: 15, color: '#888', textAlign: 'center', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#555', textAlign: 'center', marginTop: 6 },
});

export default HomeScreen;
