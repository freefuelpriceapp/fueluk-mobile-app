import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Animated,
  Easing,
  Platform,
} from 'react-native';
// Conditional import — react-native-maps doesn't support web
let MapView;
if (Platform.OS !== 'web') {
  MapView = require('react-native-maps').default;
}
import { Ionicons } from '@expo/vector-icons';
import useLocation from '../hooks/useLocation';
import useStations from '../hooks/useStations';
// StationMarker also depends on react-native-maps
let StationMarker;
if (Platform.OS !== 'web') {
  StationMarker = require('../components/StationMarker').default;
}
import { resolvePrice } from '../lib/quarantine';

/**
 * MapScreen — Phase 4 rebuild
 *
 * Changes from Sprint 2 stub:
 *  - Real MapView with custom dark map style
 *  - StationMarker components for each station
 *  - User's current location via showsUserLocation
 *  - Coordinate mismatch fix: transforms useLocation { coords: { latitude, longitude } }
 *    output into the { lat, lng } shape expected by useStations
 *  - Fuel type filter chips overlaid on the map
 *  - Nearby / Cheapest toggle preserved from Sprint 2
 *  - Bottom sheet detail card slides up when a marker is tapped
 *  - Callout "Tap for details" navigates to StationDetail
 */

const FUEL_TYPES = [
  { key: 'petrol',         label: 'Petrol',         color: '#2ECC71' },
  { key: 'diesel',         label: 'Diesel',         color: '#3498DB' },
  { key: 'e10',            label: 'E10',            color: '#F39C12' },
  { key: 'super_unleaded', label: 'Super',          color: '#9B59B6' },
  { key: 'premium_diesel', label: 'Prem. Diesel',   color: '#E74C3C' },
];

// Google Maps-compatible dark style that matches the app's dark theme.
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0D1117' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0D1117' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8B949E' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#161B22' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#30363D' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1C2128' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#30363D' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#E6EDF3' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#161B22' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0f1a0f' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1520' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3498DB' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#161B22' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#30363D' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#8B949E' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#E6EDF3' }] },
];

const BOTTOM_SHEET_HEIGHT = 180;

export default function MapScreen({ navigation }) {
  const [fuelType, setFuelType] = useState('petrol');
  const [mode, setMode] = useState('nearby'); // 'nearby' | 'cheapest'
  const [selectedStation, setSelectedStation] = useState(null);

  // Bottom sheet slide animation
  const sheetAnim = useRef(new Animated.Value(BOTTOM_SHEET_HEIGHT)).current;

  // ── Location ──────────────────────────────────────────────────────
  // useLocation returns { coords: { latitude, longitude }, postcode, radiusKm }
  // useStations expects { lat, lng }  — transform here to fix the mismatch.
  const { location, loading: locationLoading, error: locationError } = useLocation();

  const stationLocation = useMemo(() => {
    if (!location) return null;
    const lat = location.coords?.latitude;
    const lng = location.coords?.longitude;
    if (lat == null || lng == null) return null;
    return { lat, lng };
  }, [location]);

  // ── Stations ──────────────────────────────────────────────────────
  const {
    stations,
    loading: stationsLoading,
    error: stationsError,
    refetch,
  } = useStations(stationLocation, { fuelType, mode, radiusKm: location?.radiusKm ?? 5 });

  // Derive initial map region from user location.
  const initialRegion = useMemo(() => {
    const lat = location?.coords?.latitude ?? 51.5074;
    const lng = location?.coords?.longitude ?? -0.1278;
    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    };
  }, [location]);

  // Cheapest station for marker highlighting.
  const cheapestStationId = useMemo(() => {
    if (!stations.length) return null;
    let best = null;
    let bestPrice = Infinity;
    for (const s of stations) {
      const p = resolvePrice(s, fuelType);
      if (p !== null && p < bestPrice) {
        bestPrice = p;
        best = s.id;
      }
    }
    return best;
  }, [stations, fuelType]);

  const selectedFuelMeta = FUEL_TYPES.find(f => f.key === fuelType) || FUEL_TYPES[0];

  // ── Marker tap → show bottom sheet ───────────────────────────────
  const handleMarkerPress = useCallback((station) => {
    setSelectedStation(station);
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [sheetAnim]);

  const dismissSheet = useCallback(() => {
    Animated.timing(sheetAnim, {
      toValue: BOTTOM_SHEET_HEIGHT,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setSelectedStation(null));
  }, [sheetAnim]);

  const navigateToDetail = useCallback(() => {
    if (!selectedStation) return;
    dismissSheet();
    // Small delay so the sheet dismiss animation plays cleanly
    setTimeout(() => {
      navigation.navigate('StationDetail', { station: selectedStation });
    }, 230);
  }, [selectedStation, navigation, dismissSheet]);

  // ── Loading / error states ────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Map fills the whole screen — web fallback shows a message */}
      {!MapView ? (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1117' }]}>
          <Ionicons name="map-outline" size={48} color="#8B949E" />
          <Text style={{ color: '#8B949E', marginTop: 12, fontSize: 14 }}>Map view is available on iOS and Android</Text>
        </View>
      ) : (
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={Platform.OS === 'android'}
        customMapStyle={DARK_MAP_STYLE}
        onPress={dismissSheet}
      >
        {stations.map((station) => {
          const price = resolvePrice(station, fuelType);
          return (
            <StationMarker
              key={String(station.id)}
              station={station}
              cheapestPrice={price}
              fuelType={fuelType}
              onPress={handleMarkerPress}
              isCheapest={station.id === cheapestStationId}
              isSelected={selectedStation?.id === station.id}
            />
          );
        })}
      </MapView>
      )}

      {/* Safe-area overlay container — positioned at top */}
      <SafeAreaView style={styles.overlayTop} pointerEvents="box-none">
        {/* Fuel type filter chips */}
        <View style={styles.filterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
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
          </ScrollView>
        </View>

        {/* Mode toggle: Nearby vs Cheapest */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              mode === 'nearby' && [styles.modeBtnActive, { borderColor: selectedFuelMeta.color }],
            ]}
            onPress={() => setMode('nearby')}
          >
            <Ionicons
              name="navigate-outline"
              size={14}
              color={mode === 'nearby' ? selectedFuelMeta.color : '#8B949E'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.modeBtnText, mode === 'nearby' && { color: selectedFuelMeta.color }]}>
              Nearby
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              mode === 'cheapest' && [styles.modeBtnActive, { borderColor: selectedFuelMeta.color }],
            ]}
            onPress={() => setMode('cheapest')}
          >
            <Ionicons
              name="trending-down-outline"
              size={14}
              color={mode === 'cheapest' ? selectedFuelMeta.color : '#8B949E'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.modeBtnText, mode === 'cheapest' && { color: selectedFuelMeta.color }]}>
              Cheapest
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading / error banner */}
        {stationsLoading && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color="#2ECC71" />
            <Text style={styles.loadingBannerText}>Loading stations...</Text>
          </View>
        )}
        {stationsError && !stationsLoading && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={14} color="#DC3545" />
            <Text style={styles.errorBannerText}>{stationsError}</Text>
            <TouchableOpacity onPress={refetch} style={{ marginLeft: 8 }}>
              <Text style={styles.retryInline}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {/* Bottom sheet: selected station detail */}
      <Animated.View
        style={[
          styles.bottomSheet,
          { transform: [{ translateY: sheetAnim }] },
        ]}
        pointerEvents={selectedStation ? 'auto' : 'none'}
      >
        {selectedStation && (
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetName} numberOfLines={1}>
                  {selectedStation.name || selectedStation.brand}
                </Text>
                {selectedStation.brand && (
                  <Text style={[styles.sheetBrand, { color: selectedFuelMeta.color }]}>
                    {selectedStation.brand}
                  </Text>
                )}
                <Text style={styles.sheetAddress} numberOfLines={1}>
                  {selectedStation.address}
                </Text>
                {selectedStation.distance_km != null && (
                  <Text style={styles.sheetDistance}>
                    {selectedStation.distance_km.toFixed(1)} km away
                  </Text>
                )}
              </View>
              {/* Price badge */}
              {resolvePrice(selectedStation, fuelType) !== null && (
                <View style={[styles.sheetPriceBadge, { borderColor: selectedFuelMeta.color }]}>
                  <Text style={styles.sheetPriceLabel}>{selectedFuelMeta.label}</Text>
                  <Text style={[styles.sheetPrice, { color: selectedFuelMeta.color }]}>
                    {Number(resolvePrice(selectedStation, fuelType)).toFixed(1)}p
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.dismissBtn} onPress={dismissSheet}>
                <Text style={styles.dismissBtnText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.detailBtn, { backgroundColor: selectedFuelMeta.color }]}
                onPress={navigateToDetail}
              >
                <Text style={styles.detailBtnText}>View Details</Text>
                <Ionicons name="chevron-forward" size={14} color="#0D1117" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0D1117',
  },
  // Top overlay
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: 'box-none',
  },
  filterRow: {
    backgroundColor: 'rgba(13,17,23,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  filterScroll: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: '#30363D',
    marginRight: 6,
  },
  filterChipText: { fontSize: 12, color: '#8B949E', fontWeight: '600' },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(22,27,34,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
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
  modeBtnText: { fontSize: 14, color: '#8B949E', fontWeight: '600' },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13,17,23,0.88)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    margin: 10,
    borderRadius: 8,
    alignSelf: 'center',
    gap: 8,
  },
  loadingBannerText: { color: '#8B949E', fontSize: 13 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40,0,0,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    margin: 10,
    borderRadius: 8,
    alignSelf: 'stretch',
  },
  errorBannerText: { color: '#DC3545', fontSize: 12, flex: 1, marginLeft: 6 },
  retryInline: { color: '#2ECC71', fontSize: 12, fontWeight: '700' },
  // Bottom sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#161B22',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: '#30363D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 16,
  },
  sheetContent: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8 },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#30363D',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  sheetName: { fontSize: 16, fontWeight: '700', color: '#E6EDF3' },
  sheetBrand: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  sheetAddress: { fontSize: 13, color: '#8B949E', marginTop: 2 },
  sheetDistance: { fontSize: 12, color: '#555', marginTop: 2 },
  sheetPriceBadge: {
    marginLeft: 12,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    minWidth: 64,
    backgroundColor: '#0D1117',
  },
  sheetPriceLabel: { fontSize: 10, color: '#8B949E', fontWeight: '600', marginBottom: 2 },
  sheetPrice: { fontSize: 20, fontWeight: '800' },
  sheetActions: { flexDirection: 'row', gap: 10 },
  dismissBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#30363D',
    alignItems: 'center',
  },
  dismissBtnText: { color: '#8B949E', fontWeight: '600' },
  detailBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  detailBtnText: { color: '#0D1117', fontWeight: '700', fontSize: 15 },
  // Misc
  loadingText: { marginTop: 12, color: '#8B949E', fontSize: 14 },
  errorText: { color: '#DC3545', fontSize: 14, textAlign: 'center', marginTop: 12, marginBottom: 12 },
  retryBtn: { backgroundColor: '#2ECC71', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { color: '#0D1117', fontWeight: '700' },
});
