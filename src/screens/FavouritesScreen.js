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
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FUEL_COLORS } from '../lib/theme';
import { lightHaptic, mediumHaptic } from '../lib/haptics';

const FAVOURITES_KEY = 'user_favourites';

export default function FavouritesScreen({ navigation }) {
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavourites = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVOURITES_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      // Filter out legacy ID-only entries (pre-bugfix) — they lack price/name data.
      const normalised = Array.isArray(parsed)
        ? parsed.filter((s) => s && typeof s === 'object' && s.id != null)
        : [];
      setFavourites(normalised);
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
              mediumHaptic();
            } catch (err) {
              Alert.alert('Error', 'Could not remove favourite.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    // Prices are stored in item.prices.{petrol,diesel,e10} (set by HomeScreen)
    const petrolPrice = item.prices?.petrol ?? null;
    const dieselPrice = item.prices?.diesel ?? null;
    const e10Price    = item.prices?.e10    ?? null;

    // Prefer station name; fall back to brand if name is absent
    const displayName = item.name || item.brand || 'Station';

    const a11yParts = [];
    if (item.brand) a11yParts.push(item.brand);
    if (item.name) a11yParts.push(item.name);
    if (petrolPrice != null) a11yParts.push(`Petrol ${petrolPrice.toFixed(1)}p`);
    const cardA11y = a11yParts.join(', ') || displayName;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('StationDetail', { station: item })}
        activeOpacity={0.85}
        accessibilityLabel={cardA11y}
        accessibilityRole="button"
      >
        <View style={styles.cardLeft}>
          <Text style={styles.stationName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.stationAddress} numberOfLines={2}>
            {item.address || item.postcode || 'Address unavailable'}
          </Text>
          <View style={styles.priceRow}>
            {petrolPrice != null ? (
              <View style={[styles.priceBadge, { borderColor: FUEL_COLORS.petrol }]}>
                <Text style={styles.priceLabel}>Petrol</Text>
                <Text style={[styles.priceValue, { color: FUEL_COLORS.petrol }]}>
                  {petrolPrice.toFixed(1)}p
                </Text>
              </View>
            ) : null}
            {dieselPrice != null ? (
              <View style={[styles.priceBadge, { borderColor: FUEL_COLORS.diesel }]}>
                <Text style={styles.priceLabel}>Diesel</Text>
                <Text style={[styles.priceValue, { color: FUEL_COLORS.diesel }]}>
                  {dieselPrice.toFixed(1)}p
                </Text>
              </View>
            ) : null}
            {e10Price != null ? (
              <View style={[styles.priceBadge, { borderColor: FUEL_COLORS.e10 }]}>
                <Text style={styles.priceLabel}>E10</Text>
                <Text style={[styles.priceValue, { color: FUEL_COLORS.e10 }]}>
                  {e10Price.toFixed(1)}p
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => removeFavourite(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Remove from favourites"
          accessibilityRole="button"
          accessibilityState={{ checked: true }}
        >
          <Ionicons name="heart" size={24} color={COLORS.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  if (favourites.length === 0) {
    return (
      <SafeAreaView style={styles.emptyState}>
        <Ionicons name="heart-outline" size={64} color={COLORS.textDisabled} />
        <Text style={styles.emptyTitle}>No saved stations</Text>
        <Text style={styles.emptySubtext}>
          Tap the heart icon on any station to save it here for quick access.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
              loadFavourites().then(lightHaptic);
            }}
            tintColor={COLORS.accent}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  list: {
    padding: 12,
  },
  card: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderAlt,
  },
  cardLeft: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  stationAddress: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  priceBadge: {
    backgroundColor: COLORS.background,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    borderWidth: 1,
  },
  priceLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  removeBtn: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
});
