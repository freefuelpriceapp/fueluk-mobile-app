import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVOURITES_KEY = 'user_favourites';

export default function FavouritesScreen({ navigation }) {
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavourites = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVOURITES_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      setFavourites(parsed);
    } catch (err) {
      console.error('Failed to load favourites:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadFavourites);
    return unsubscribe;
  }, [navigation, loadFavourites]);

  const removeFavourite = async (stationId) => {
    Alert.alert(
      'Remove Favourite',
      'Remove this station from your favourites?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = favourites.filter((s) => s.id !== stationId);
              await AsyncStorage.setItem(FAVOURITES_KEY, JSON.stringify(updated));
              setFavourites(updated);
            } catch (err) {
              Alert.alert('Error', 'Could not remove favourite.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('StationDetail', { station: item })}
      activeOpacity={0.85}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.stationName} numberOfLines={1}>
          {item.brand || 'Station'}
        </Text>
        <Text style={styles.stationAddress} numberOfLines={2}>
          {item.address || item.postcode || 'Address unavailable'}
        </Text>
        <View style={styles.priceRow}>
          {item.petrol_price_pence ? (
            <View style={styles.priceBadge}>
              <Text style={styles.priceLabel}>Petrol</Text>
              <Text style={styles.priceValue}>{(item.petrol_price_pence / 100).toFixed(2)}p</Text>
            </View>
          ) : null}
          {item.diesel_price_pence ? (
            <View style={[styles.priceBadge, styles.dieselBadge]}>
              <Text style={styles.priceLabel}>Diesel</Text>
              <Text style={styles.priceValue}>{(item.diesel_price_pence / 100).toFixed(2)}p</Text>
            </View>
          ) : null}
        </View>
      </View>
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => removeFavourite(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="heart" size={24} color="#e74c3c" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2ECC71" />
      </View>
    );
  }

  if (favourites.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="heart-outline" size={64} color="#444" />
        <Text style={styles.emptyTitle}>No Favourites Yet</Text>
        <Text style={styles.emptySubtext}>
          Save stations you visit often by tapping the heart icon on any station.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favourites}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadFavourites();
            }}
            tintColor="#2ECC71"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d0d1a',
  },
  list: {
    padding: 12,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a45',
  },
  cardLeft: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  stationAddress: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priceBadge: {
    backgroundColor: '#0d2d1a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2ECC71',
  },
  dieselBadge: {
    backgroundColor: '#1a1a0d',
    borderColor: '#f39c12',
  },
  priceLabel: {
    fontSize: 10,
    color: '#888',
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2ECC71',
  },
  removeBtn: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d0d1a',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 21,
  },
});
