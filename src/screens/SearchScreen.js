import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StationCard from '../components/StationCard';
import { searchStations, getNearbyStations } from '../api/fuelApi';
import { trackSearchPerformed } from '../lib/analytics';
import useLocation from '../hooks/useLocation';
import { rankStationsByValue } from '../lib/smartDecision';

// ─── Constants ────────────────────────────────────────────────────────────────

const FUEL_TYPES = [
  { key: 'petrol',         label: 'Petrol',         color: '#2ECC71' },
  { key: 'diesel',         label: 'Diesel',         color: '#3498DB' },
  { key: 'e10',            label: 'E10',            color: '#F39C12' },
  { key: 'super_unleaded', label: 'Super',          color: '#9B59B6' },
  { key: 'premium_diesel', label: 'Premium Diesel', color: '#E74C3C' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// API flat-price field names keyed by fuel type.
const PRICE_FIELD = {
  petrol: 'petrol_price',
  diesel: 'diesel_price',
  e10: 'e10_price',
  super_unleaded: 'super_unleaded_price',
  premium_diesel: 'premium_diesel_price',
};

// Alias used by the smart-ranking helper.
const FUEL_PRICE_KEY = PRICE_FIELD;

/**
 * Normalize an API station row so it renders correctly in StationCard:
 *  - distance_km derived from distance_miles when present
 *  - prices object built from the flat <fuel>_price fields
 */
function normalizeStation(s) {
  const km =
    typeof s.distance_km === 'number'
      ? s.distance_km
      : typeof s.distance_miles === 'number'
        ? s.distance_miles * 1.60934
        : undefined;
  return {
    ...s,
    distance_km: km,
    prices: {
      petrol: s.petrol_price ?? null,
      diesel: s.diesel_price ?? null,
      e10: s.e10_price ?? null,
      super_unleaded: s.super_unleaded_price ?? null,
      premium_diesel: s.premium_diesel_price ?? null,
    },
  };
}

/**
 * Rank a list of raw stations for the currently selected fuel by effective
 * price (pump price + amortised round-trip fuel cost). Stations without a
 * price for that fuel are kept but pushed to the bottom.
 */
function rankForFuel(stations, fuelKey) {
  if (!Array.isArray(stations) || stations.length === 0) return stations;
  const field = FUEL_PRICE_KEY[fuelKey];
  if (!field) return stations;
  return rankStationsByValue(stations, { fuelKey: field });
}

// ─── Component ────────────────────────────────────────────────────────────────

const SearchScreen = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [nearbyResults, setNearbyResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFuel, setSelectedFuel] = useState('petrol');
  const debounceRef = useRef(null);
  const { location } = useLocation();

  // ─── Search handler ──────────────────────────────────────────────────────────

  const handleSearch = useCallback(
    async (q) => {
      const searchQ = (q || query).trim();
      if (!searchQ) return;
      setLoading(true);
      setError(null);
      setSearched(true);
      trackSearchPerformed({ query: searchQ, fuelType: selectedFuel });
      try {
        const data = await searchStations(searchQ, { fuelType: selectedFuel });
        const raw = (data.stations || []).map(normalizeStation);
        setResults(rankForFuel(raw, selectedFuel));
      } catch (err) {
        setError('Search failed. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [query, selectedFuel]
  );

  // ─── Default to nearby stations (user location) when query is empty ──────────

  useEffect(() => {
    let cancelled = false;
    if (!location?.coords) return undefined;
    if (query.trim()) return undefined;
    const lat = location.coords.latitude;
    const lon = location.coords.longitude;
    if (lat == null || lon == null) return undefined;
    (async () => {
      try {
        const data = await getNearbyStations({
          lat,
          lng: lon,
          radiusKm: location.radiusKm || 5,
          fuel: selectedFuel,
        });
        if (cancelled) return;
        const raw = (data.stations || []).map(normalizeStation);
        setNearbyResults(rankForFuel(raw, selectedFuel));
      } catch (_err) {
        if (!cancelled) setNearbyResults([]);
      }
    })();
    return () => { cancelled = true; };
  }, [location?.coords?.latitude, location?.coords?.longitude, location?.radiusKm, selectedFuel, query]);

  // Re-search when fuel type changes while a query is active.
  useEffect(() => {
    if (searched && query.trim()) {
      handleSearch(query.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFuel]);

  // ─── Debounced live search — fires 400ms after user stops typing ─────────────

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleSearch(query.trim());
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, handleSearch]);

  // ─── Navigation ──────────────────────────────────────────────────────────────

  const handleStationPress = (station) => {
    navigation.navigate('StationDetail', { station });
  };

  const handleRetry = () => {
    handleSearch(query.trim());
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Town, postcode or station name..."
            placeholderTextColor="#555"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setResults([]);
                setSearched(false);
              }}
            >
              <Ionicons name="close-circle" size={18} color="#555" />
            </TouchableOpacity>
          )}
        </View>

        {/* Fuel type filter */}
        <View style={styles.filterRow}>
          {FUEL_TYPES.map((ft) => (
            <TouchableOpacity
              key={ft.key}
              style={[
                styles.filterBtn,
                selectedFuel === ft.key && {
                  backgroundColor: ft.color,
                  borderColor: ft.color,
                },
              ]}
              onPress={() => setSelectedFuel(ft.key)}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  selectedFuel === ft.key && { color: '#0D1117' },
                ]}
              >
                {ft.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Results */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2ECC71" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Ionicons name="alert-circle-outline" size={36} color="#DC3545" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
              <Text style={styles.retryBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={searched ? results : nearbyResults}
            keyExtractor={(item) => item.id?.toString()}
            renderItem={({ item }) => (
              <StationCard
                station={item}
                fuelType={selectedFuel}
                onPress={() => handleStationPress(item)}
              />
            )}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              !searched && nearbyResults.length > 0 ? (
                <Text style={styles.sectionHeading}>Nearby stations</Text>
              ) : null
            }
            ListEmptyComponent={
              searched ? (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={48} color="#333" />
                  <Text style={styles.emptyText}>No stations found for "{query}"</Text>
                  <Text style={styles.emptySubtext}>
                    Try a different postcode, town, or station name.
                  </Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="map-outline" size={48} color="#333" />
                  <Text style={styles.emptyText}>Search for a fuel station</Text>
                  <Text style={styles.emptySubtext}>
                    Enter a postcode, town name, or station brand.
                  </Text>
                </View>
              )
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    margin: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#ffffff',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    margin: 3,
  },
  filterBtnText: { fontSize: 12, fontWeight: '600', color: '#888' },
  list: { padding: 12 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#888' },
  errorText: { fontSize: 14, color: '#DC3545', textAlign: 'center', marginTop: 12 },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#2ECC71',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: { color: '#0D1117', fontWeight: '700', fontSize: 14 },
  sectionHeading: {
    fontSize: 12,
    color: '#8B949E',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyText: { fontSize: 15, color: '#888', textAlign: 'center', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#555', textAlign: 'center', marginTop: 6 },
});

export default SearchScreen;
