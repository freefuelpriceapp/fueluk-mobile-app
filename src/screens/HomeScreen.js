import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import StationCard from '../components/StationCard';
import { getNearbyStations } from '../api/fuelApi';
import useLocation from '../hooks/useLocation';

const HomeScreen = () => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const { location } = useLocation();

  const fetchStations = async () => {
    if (!location) return;
    try {
      setError(null);
      const data = await getNearbyStations(
        location.postcode,
        location.radiusKm,
        'petrol'
      );
      setStations(data);
    } catch (err) {
      setError('Unable to load stations. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, [location]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStations();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E63946" />
        <Text style={styles.loadingText}>Finding nearby stations...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Fuel Prices</Text>
        {location && (
          <Text style={styles.subtitle}>{location.postcode}</Text>
        )}
      </View>
      {error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={stations}
          keyExtractor={(item) => item.site_id?.toString() ?? item.id?.toString()}
          renderItem={({ item }) => <StationCard station={item} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No stations found nearby.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212529',
  },
  subtitle: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 2,
  },
  list: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6C757D',
  },
  errorText: {
    fontSize: 14,
    color: '#DC3545',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6C757D',
    marginTop: 40,
    fontSize: 16,
  },
});

export default HomeScreen;
