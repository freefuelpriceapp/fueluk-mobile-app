import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { getPriceHistory } from '../api/fuelApi';

const FUEL_TYPES = ['petrol', 'diesel', 'e10'];

const FUEL_LABELS = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  e10: 'E10',
};

const StationDetailScreen = ({ route, navigation }) => {
  const { station } = route.params;
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFuel, setSelectedFuel] = useState('petrol');

  const fetchHistory = useCallback(async () => {
    try {
      setError(null);
      const data = await getPriceHistory(station.stationId || station.id, 30);
      setHistory(data);
    } catch (err) {
      setError('Unable to load price history. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [station]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const formatPrice = (pence) => {
    if (pence == null) return 'N/A';
    return `${(pence / 100).toFixed(1)}p`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const currentPrices = station.prices || {};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2ECC71" />
        }
      >
        {/* Station Header */}
        <View style={styles.header}>
          <Text style={styles.stationName}>{station.name || station.brand}</Text>
          <Text style={styles.stationAddress}>{station.address}</Text>
          {station.distanceKm != null && (
            <Text style={styles.distance}>{station.distanceKm.toFixed(1)} km away</Text>
          )}
        </View>

        {/* Current Prices */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Prices</Text>
          <View style={styles.pricesGrid}>
            {FUEL_TYPES.map((fuel) => (
              <View key={fuel} style={styles.priceCard}>
                <Text style={styles.fuelLabel}>{FUEL_LABELS[fuel]}</Text>
                <Text style={styles.fuelPrice}>
                  {currentPrices[fuel] != null
                    ? formatPrice(currentPrices[fuel])
                    : 'N/A'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Fuel Selector for History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price History (30 days)</Text>
          <View style={styles.fuelTabs}>
            {FUEL_TYPES.map((fuel) => (
              <TouchableOpacity
                key={fuel}
                style={[styles.tab, selectedFuel === fuel && styles.tabActive]}
                onPress={() => setSelectedFuel(fuel)}
              >
                <Text style={[styles.tabText, selectedFuel === fuel && styles.tabTextActive]}>
                  {FUEL_LABELS[fuel]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#2ECC71" style={styles.loader} />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : history && history.history && history.history.length > 0 ? (
            <View style={styles.historyList}>
              {history.history
                .filter((row) => row.fuel_type === selectedFuel)
                .map((row, idx) => (
                  <View key={idx} style={styles.historyRow}>
                    <Text style={styles.historyDate}>{formatDate(row.recorded_at)}</Text>
                    <Text style={styles.historyPrice}>{formatPrice(row.price_pence)}</Text>
                  </View>
                ))}
              {history.history.filter((row) => row.fuel_type === selectedFuel).length === 0 && (
                <Text style={styles.noData}>No {FUEL_LABELS[selectedFuel]} history available.</Text>
              )}
            </View>
          ) : (
            <Text style={styles.noData}>No price history available for this station.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
  },
  stationName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#E6EDF3',
    marginBottom: 4,
  },
  stationAddress: {
    fontSize: 14,
    color: '#8B949E',
    marginBottom: 4,
  },
  distance: {
    fontSize: 13,
    color: '#2ECC71',
    fontWeight: '600',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E6EDF3',
    marginBottom: 12,
  },
  pricesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceCard: {
    flex: 1,
    backgroundColor: '#161B22',
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  fuelLabel: {
    fontSize: 12,
    color: '#8B949E',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fuelPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2ECC71',
  },
  fuelTabs: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#161B22',
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: '#2ECC71',
  },
  tabText: {
    color: '#8B949E',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#0D1117',
  },
  loader: {
    marginVertical: 20,
  },
  historyList: {
    backgroundColor: '#161B22',
    borderRadius: 10,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
  },
  historyDate: {
    fontSize: 14,
    color: '#8B949E',
  },
  historyPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E6EDF3',
  },
  errorText: {
    color: '#F85149',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 16,
  },
  noData: {
    color: '#8B949E',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 16,
  },
});

export default StationDetailScreen;
