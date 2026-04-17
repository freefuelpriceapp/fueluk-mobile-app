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
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StationCard from '../components/StationCard';
import { getNearbyStations, searchStations, getLastUpdated } from '../api/fuelApi';
import useLocation from '../hooks/useLocation';
import { trackNearbyScreenView, trackRefreshInitiated, trackRefreshCompleted } from '../lib/analytics';

const FUEL_TYPES = [
  { key: 'petrol', label: 'Petrol', color: '#2ECC71' },
  { key: 'diesel', label: 'Diesel', color: '#3498DB' },
  { key: 'e10',    label: 'E10',    color: '#F39C12' },
];

const STATIONS_CACHE_KEY = 'cached_nearby_stations';

/** D-10: detect offline vs server errors */
const isOffline = (err) =>
  err && (err.message === 'Network Error' || err.code === 'ECONNABORTED' || !err.response);

const formatUpdated = (iso) => {
  try {
    const d = new Date(iso);
    if (isNaN(d)) return null;
    const now = Date.now();
    const ageH = Math.round((now - d.getTime()) / 3600000);
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString([], { day: 'numeric', month: 'short' });
    return { label: `${dateStr} at ${timeStr}`, stale: ageH > 24, ageH };
  } catch (_e) {
    // Ignore date parse errors.
    return null;
  }
};

const HomeScreen = ({ navigation }) => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [offline, setOffline] = useState(false);
  const [selectedFuel, setSelectedFuel] = useState('petrol');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const { location } = useLocation();

  // D-13: track screen view
  useEffect(() => { trackNearbyScreenView(); }, []);

  const fetchStations = useCallback(async () => {
    if (!location) return;
    try {
      setError(null);
      setOffline(false);
      const lat = location.coords?.latitude;
      const lng = location.coords?.longitude;

      let data;
      if (lat && lng) {
        setUsingFallback(false);
        data = await getNearbyStations({ lat, lng, radiusKm: location.radiusKm || 5, fuel: selectedFuel });
      } else if (location.postcode) {
        setUsingFallback(true);
        data = await searchStations(location.postcode);
      } else {
        setError('We\u2019can\u2019t determine your location. Enable location in Settings to see nearby stations, or search by postcode.');
        setLoading(false);
        return;
      }
      const rawList = data.stations || []; const list = rawList.map(s => ({ ...s, distance_km: typeof s.distance_km === 'number' ? s.distance_km : (typeof s.distance_miles === 'number' ? s.distance_miles * 1.60934 : undefined), prices: { petrol: s.petrol_price ?? null, diesel: s.diesel_price ?? null, e10: s.e10_price ?? null } }));
      // D-11: cache successful response
      try {
        await AsyncStorage.setItem(STATIONS_CACHE_KEY, JSON.stringify(list));
      } catch (_e) {
        // Ignore cache write errors.
      }
    } catch (err) {
      // D-10: differentiate offline vs server error
      if (isOffline(err)) {
        setOffline(true);
        // D-11: serve cached stations when offline
        try {
          const cached = await AsyncStorage.getItem(STATIONS_CACHE_KEY);
          if (cached) {
            setStations(JSON.parse(cached));
            setError(null);
          } else {
            setError('You\u2019re offline and no cached data is available.');
          }
        } catch (_e) {
          // Ignore cache read errors when offline.
          setError('You\u2019re offline. Please check your connection.');
        }
      } else {
        setError('Unable to load stations. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [location, selectedFuel]);

  const fetchLastUpdated = useCallback(async () => {
    try {
      const data = await getLastUpdated();
      if (data?.last_updated) setLastUpdated(data.last_updated);
    } catch (_e) {
      // Ignore last-updated fetch errors.
    }
  }, []);

  useEffect(() => {
    fetchStations();
    fetchLastUpdated();
  }, [fetchStations, fetchLastUpdated]);

  const onRefresh = () => {
    setRefreshing(true);
    trackRefreshInitiated();
    fetchStations().then(() => trackRefreshCompleted());
    fetchLastUpdated();
  };

  const handleStationPress = (station) => {
    navigation.navigate('StationDetail', { station });
  };

  // D-09: deep-link to OS settings
  const openSettings = () => {
    if (Platform.OS === 'ios') Linking.openURL('app-settings:');
    else Linking.openSettings();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2ECC71" />
        <Text style={styles.loadingText}>Finding nearby stations...</Text>
      </View>
    );
  }

  const updatedInfo = lastUpdated ? formatUpdated(lastUpdated) : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Nearby Fuel Prices</Text>
          {location && (
            <Text style={styles.subtitle}>
              {location.postcode}{location.coords ? ` \u00B7 within ${location.radiusKm || 5}km` : ' (default area)'}
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

      {/* D-08 + D-09: fallback banner with settings link */}
      {usingFallback && (
        <View style={styles.fallbackBanner}>
          <Ionicons name="navigate-outline" size={14} color="#F39C12" />
          <Text style={styles.fallbackText}>
            Precise location is off \u2014 showing results for your default area. Turn on location for prices near you.
          </Text>
          <TouchableOpacity onPress={openSettings}>
            <Text style={styles.settingsLink}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* D-10: offline banner */}
      {offline && !error && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color="#DC3545" />
          <Text style={styles.offlineText}>You\u2019re offline \u2014 showing cached prices.</Text>
        </View>
      )}

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
        /* D-03: error state uses red icon + distinct copy */
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
            /* D-03: empty state uses green search icon + distinct copy */
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#2ECC71" />
              <Text style={styles.emptyTitle}>No stations found</Text>
              <Text style={styles.emptyText}>No {FUEL_TYPES.find(f => f.key === selectedFuel)?.label} stations found nearby.</Text>
              <Text style={styles.emptySubtext}>Try switching fuel type or searching a different area.</Text>
            </View>
          }
          ListFooterComponent={
            updatedInfo ? (
              <Text style={[styles.footerText, updatedInfo.stale && styles.footerStale]}>
                Prices last checked: {updatedInfo.label}{updatedInfo.stale ? ' (data may be out of date \u2014 pull down to refresh)' : ''}
              </Text>
            ) : null
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#1a1a2e', borderBottomWidth: 1, borderBottomColor: '#222',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  subtitle: { fontSize: 12, color: '#888', marginTop: 2 },
  searchBtn: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#2ECC71' },
  fallbackBanner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#2a2200',
  },
  fallbackText: { fontSize: 12, color: '#F39C12', marginLeft: 6, flex: 1 },
  settingsLink: { fontSize: 12, color: '#2ECC71', fontWeight: '600', textDecorationLine: 'underline' },
  offlineBanner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#220000',
  },
  offlineText: { fontSize: 12, color: '#DC3545', marginLeft: 6 },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#1a1a2e', borderBottomWidth: 1, borderBottomColor: '#222',
  },
  filterBtn: {
    flex: 1, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
    borderColor: '#333', alignItems: 'center', marginHorizontal: 3,
  },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: '#888' },
  list: { padding: 12 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#888' },
  errorText: { fontSize: 14, color: '#DC3545', textAlign: 'center', marginTop: 12, marginBottom: 16 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#2ECC71', borderRadius: 8 },
  retryBtnText: { color: '#0D1117', fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#2ECC71', marginTop: 12 },
  emptyText: { fontSize: 15, color: '#888', textAlign: 'center', marginTop: 6 },
  emptySubtext: { fontSize: 13, color: '#555', textAlign: 'center', marginTop: 6 },
  footerText: { fontSize: 11, color: '#555', textAlign: 'center', paddingVertical: 16 },
  footerStale: { color: '#F39C12' },
});

export default HomeScreen;
