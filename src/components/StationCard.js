import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVOURITES_KEY = 'user_favourites';

const FUEL_LABELS = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  e10: 'E10',
  super_unleaded: 'Super Unleaded',
  premium_diesel: 'Premium Diesel',
};

const FUEL_COLORS = {
  petrol: '#2ECC71',
  diesel: '#3498DB',
  e10: '#F39C12',
  super_unleaded: '#9B59B6',
  premium_diesel: '#E74C3C',
};

function formatFreshness(updatedAt) {
  if (!updatedAt) return null;
  const diffMs = Date.now() - new Date(updatedAt).getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHrs < 1) return 'Updated just now';
  if (diffHrs < 24) return `Updated ${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `Updated ${diffDays}d ago`;
}

function formatDistance(km) {
  if (km == null) return null;
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

const StationCard = ({ station, fuelType = 'petrol', onPress }) => {
  const {
    id,
    name,
    brand,
    address,
    distance_km,
    prices = {},
    last_updated,
  } = station;

  const [isFavourite, setIsFavourite] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(FAVOURITES_KEY).then((stored) => {
      if (!mounted) return;
      const favs = stored ? JSON.parse(stored) : [];
      setIsFavourite(favs.some((s) => s.id === id));
    });
    return () => { mounted = false; };
  }, [id]);

  const toggleFavourite = async (e) => {
    e.stopPropagation?.();
    const stored = await AsyncStorage.getItem(FAVOURITES_KEY);
    let favs = stored ? JSON.parse(stored) : [];
    if (isFavourite) {
      favs = favs.filter((s) => s.id !== id);
    } else {
      favs.push(station);
    }
    await AsyncStorage.setItem(FAVOURITES_KEY, JSON.stringify(favs));
    setIsFavourite(!isFavourite);
  };

  const selectedPrice = prices[fuelType];
  const selectedColor = FUEL_COLORS[fuelType] ?? '#2ECC71';
  const freshnessLabel = formatFreshness(last_updated);
  const distanceLabel = formatDistance(distance_km);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.78}>
      {/* Top row: brand + distance + favourite */}
      <View style={styles.topRow}>
        <Text style={styles.brand}>{brand ?? 'Unknown'}</Text>
        <View style={styles.topRight}>
          {distanceLabel ? (
            <View style={styles.distanceBadge}>
              <Ionicons name="navigate-outline" size={11} color="#888" />
              <Text style={styles.distanceText}>{distanceLabel}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            onPress={toggleFavourite}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.favBtn}
          >
            <Ionicons
              name={isFavourite ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavourite ? '#E74C3C' : '#555'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Station name + address */}
      <Text style={styles.name}>{name}</Text>
      {address ? <Text style={styles.address}>{address}</Text> : null}

      {/* Primary price for selected fuel type */}
      <View style={styles.priceRow}>
        <View style={[styles.primaryPriceBadge, { borderColor: selectedColor }]}>
          <Text style={styles.primaryFuelLabel}>
            {FUEL_LABELS[fuelType] ?? fuelType}
          </Text>
          <Text style={[styles.primaryPrice, { color: selectedColor }]}>
            {typeof selectedPrice === 'number'
              ? `${selectedPrice.toFixed(1)}p`
              : 'N/A'}
          </Text>
        </View>

        {/* Other fuel prices at smaller size */}
        <View style={styles.otherPrices}>
          {Object.entries(prices)
            .filter(([ft]) => ft !== fuelType)
            .slice(0, 2)
            .map(([ft, ppl]) => (
              <View key={ft} style={styles.otherChip}>
                <Text style={styles.otherFuelLabel}>{FUEL_LABELS[ft] ?? ft}</Text>
                <Text style={styles.otherPrice}>
                  {typeof ppl === 'number' ? `${ppl.toFixed(1)}p` : 'N/A'}
                </Text>
              </View>
            ))}
        </View>
      </View>

      {/* Freshness signal */}
      {freshnessLabel ? (
        <View style={styles.freshnessRow}>
          <Ionicons name="time-outline" size={11} color="#555" />
          <Text style={styles.freshnessText}>{freshnessLabel}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a45',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  brand: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  distanceText: {
    fontSize: 11,
    color: '#888',
  },
  favBtn: {
    padding: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  address: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  primaryPriceBadge: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 72,
  },
  primaryFuelLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  primaryPrice: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 1,
  },
  otherPrices: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  otherChip: {
    backgroundColor: '#0d0d1a',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  otherFuelLabel: {
    fontSize: 9,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  otherPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#aaa',
    marginTop: 1,
  },
  freshnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  freshnessText: {
    fontSize: 11,
    color: '#555',
  },
});

export default StationCard;
