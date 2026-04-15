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
import { searchStations } from '../api/fuelApi';

const FUEL_TYPES = [
  { key: 'petrol',          label: 'Petrol',          color: '#2ECC71' },
  { key: 'diesel',          label: 'Diesel',          color: '#3498DB' },
  { key: 'e10',             label: 'E10',             color: '#F39C12' },
  { key: 'super_unleaded',  label: 'Super',           color: '#9B59B6' },
  { key: 'premium_diesel',  label: 'Premium Diesel',  color: '#E74C3C' },
];

const SearchScreen = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFuel, setSelectedFuel] = useState('petrol');
  const debounceRef = useRef(null);

  // Debounced live search — fires 400ms after user stops typing
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
  }, [query]);

  const handleSearch = useCallback(async (q) => {
    const searchQ = (q || query).trim();
    if (!searchQ) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const data = await searchStations(searchQ);
      setResults(data.stations || []);
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleStationPress = (station) => {
    navigation.navigate('StationDetail', { station });
  };

  const selectedFuelMeta = FUEL_TYPES.find(f => f.key === selectedFuel);

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
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
              <Ionicons name="close-circle" size={18} color="#555" />
            </TouchableOpacity>
          )}
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
          </View>
        ) : (
          <FlatList
            data={results}
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
            ListEmptyComponent={
              searched ? (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={48} color="#333" />
                  <Text style={styles.emptyText}>No stations found for "{query}"</Text>
                  <Text style={styles.emptySubtext}>Try a different postcode, town, or station name.</Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="map-outline" size={48} color="#333" />
                  <Text style={styles.emptyText}>Search for a fuel station</Text>
                  <Text style={styles.emptySubtext}>Enter a postcode, town name, or station brand.</Text>
                </View>
              )
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyText: { fontSize: 15, color: '#888', textAlign: 'center', marginTop: 12 },
  emptySubtext: { fontSize: 13, color: '#555', textAlign: 'center', marginTop: 6 },
});

export default SearchScreen;
