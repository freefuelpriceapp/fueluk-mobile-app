import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
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
// Conditional imports — react-native-maps + clustering don't support web
let MapView;
let Marker;
if (Platform.OS !== 'web') {
  // ClusteredMapView wraps react-native-maps' MapView with built-in supercluster.
  MapView = require('react-native-map-clustering').default;
  Marker = require('react-native-maps').Marker;
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
import { COLORS, FUEL_COLORS } from '../lib/theme';
import { brandToString, safeText } from '../lib/brand';

const FUEL_TYPES = [
  { key: 'petrol',         label: 'Petrol',         color: FUEL_COLORS.petrol },
  { key: 'diesel',         label: 'Diesel',         color: FUEL_COLORS.diesel },
  { key: 'e10',            label: 'E10',            color: FUEL_COLORS.e10 },
  { key: 'super_unleaded', label: 'Super',          color: FUEL_COLORS.super_unleaded },
  { key: 'premium_diesel', label: 'Prem. Diesel',   color: FUEL_COLORS.premium_diesel },
];

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: COLORS.background }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: COLORS.background }] },
  { elementType: 'labels.text.fill', stylers: [{ color: COLORS.textSecondary }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: COLORS.surface }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: COLORS.border }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: COLORS.card }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: COLORS.border }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: COLORS.text }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: COLORS.surface }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: COLORS.mapParkGreen }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: COLORS.mapWaterBlue }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: FUEL_COLORS.diesel }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: COLORS.surface }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: COLORS.border }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: COLORS.textSecondary }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: COLORS.text }] },
];

const BOTTOM_SHEET_HEIGHT = 180;

export default function MapScreen({ navigation }) {
  const [fuelType, setFuelType] = useState('petrol');
  const [mode, setMode] = useState('nearby');
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);

  const mapRef = useRef(null);
  const sheetAnim = useRef(new Animated.Value(BOTTOM_SHEET_HEIGHT)).current;

  const { location, loading: locationLoading, error: locationError } = useLocation();

  const stationLocation = useMemo(() => {
    if (!location) return null;
    const lat = location.coords?.latitude;
    const lng = location.coords?.longitude;
    if (lat == null || lng == null) return null;
    return { lat, lng };
  }, [location]);

  const {
    stations,
    loading: stationsLoading,
    error: stationsError,
    refetch,
  } = useStations(stationLocation, { fuelType, mode, radiusKm: 25 });

  const brands = useMemo(
    () => [
      ...new Set(
        stations
          .map(s => brandToString(s.brand))
          .filter(n => typeof n === 'string' && n.length > 0)
      ),
    ].sort(),
    [stations]
  );

  const filteredStations = useMemo(() => {
    if (!selectedBrand) return stations;
    return stations.filter(s => brandToString(s.brand) === selectedBrand);
  }, [stations, selectedBrand]);

  const initialRegion = useMemo(() => {
    const lat = location?.coords?.latitude ?? 52.4862;
    const lng = location?.coords?.longitude ?? -1.8904;
    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.15,
      longitudeDelta: 0.15,
    };
  }, [location]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!mapRef.current) return;
    const lat = location?.coords?.latitude;
    const lng = location?.coords?.longitude;
    if (lat == null || lng == null) return;
    mapRef.current.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: 0.15, longitudeDelta: 0.15 },
      600
    );
  }, [location?.coords?.latitude, location?.coords?.longitude]);

  const cheapestStationId = useMemo(() => {
    if (!filteredStations.length) return null;
    let best = null;
    let bestPrice = Infinity;
    for (const s of filteredStations) {
      const p = resolvePrice(s, fuelType);
      if (p !== null && p < bestPrice) {
        bestPrice = p;
        best = s.id;
      }
    }
    return best;
  }, [filteredStations, fuelType]);

  const selectedFuelMeta = FUEL_TYPES.find(f => f.key === fuelType) || FUEL_TYPES[0];

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
    setTimeout(() => {
      navigation.navigate('StationDetail', { station: selectedStation });
    }, 230);
  }, [selectedStation, navigation, dismissSheet]);

  const recenterMap = useCallback(() => {
    const lat = location?.coords?.latitude;
    const lng = location?.coords?.longitude;
    if (lat == null || lng == null || !mapRef.current) return;
    mapRef.current.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: 0.1, longitudeDelta: 0.1 },
      400
    );
  }, [location]);

  const renderCluster = useCallback((cluster) => {
    const { id, geometry, onPress, properties } = cluster;
    const points = properties.point_count;
    const isLarge = points > 20;
    return (
      <Marker
        key={`cluster-${id}`}
        coordinate={{
          latitude: geometry.coordinates[1],
          longitude: geometry.coordinates[0],
        }}
        onPress={onPress}
      >
        <View style={[styles.cluster, isLarge && styles.clusterLarge]}>
          <Text style={[styles.clusterText, isLarge && styles.clusterTextLarge]}>
            {points}
          </Text>
        </View>
      </Marker>
    );
  }, []);

  if (locationLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (locationError && !location) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={COLORS.danger} />
        <Text style={styles.errorText}>Location error: {locationError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!MapView ? (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }]}>
          <Ionicons name="map-outline" size={48} color={COLORS.textSecondary} />
          <Text style={{ color: COLORS.textSecondary, marginTop: 12, fontSize: 14 }}>Map view is available on iOS and Android</Text>
        </View>
      ) : (
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={Platform.OS === 'android'}
        customMapStyle={DARK_MAP_STYLE}
        onPress={dismissSheet}
        clusterColor={COLORS.accent}
        clusterTextColor={COLORS.background}
        clusterFontFamily={undefined}
        radius={50}
        minZoom={1}
        maxZoom={16}
        extent={256}
        renderCluster={renderCluster}
      >
        {filteredStations.map((station) => {
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

      <SafeAreaView style={styles.overlayTop} pointerEvents="box-none">
        <View style={styles.filterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {FUEL_TYPES.map((ft) => {
              const isActive = fuelType === ft.key;
              return (
                <TouchableOpacity
                  key={ft.key}
                  style={[
                    styles.filterChip,
                    isActive && { backgroundColor: ft.color, borderColor: ft.color },
                  ]}
                  onPress={() => setFuelType(ft.key)}
                  accessibilityLabel={`Filter by ${ft.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={[
                    styles.filterChipText,
                    isActive && { color: COLORS.background },
                  ]}>
                    {ft.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {brands.length > 0 && (
          <View style={styles.brandFilterRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.brandFilterScroll}
            >
              <TouchableOpacity
                style={[styles.brandChip, !selectedBrand && styles.brandChipActive]}
                onPress={() => setSelectedBrand(null)}
              >
                <Text style={[styles.brandChipText, !selectedBrand && styles.brandChipTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              {brands.map((brand) => (
                <TouchableOpacity
                  key={brand}
                  style={[styles.brandChip, selectedBrand === brand && styles.brandChipActive]}
                  onPress={() => setSelectedBrand(prev => prev === brand ? null : brand)}
                >
                  <Text style={[styles.brandChipText, selectedBrand === brand && styles.brandChipTextActive]}>
                    {brand}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

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
              color={mode === 'nearby' ? selectedFuelMeta.color : COLORS.textSecondary}
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
              color={mode === 'cheapest' ? selectedFuelMeta.color : COLORS.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.modeBtnText, mode === 'cheapest' && { color: selectedFuelMeta.color }]}>
              Cheapest
            </Text>
          </TouchableOpacity>
        </View>

        {stationsLoading && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.loadingBannerText}>Loading stations...</Text>
          </View>
        )}
        {stationsError && !stationsLoading && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={14} color={COLORS.danger} />
            <Text style={styles.errorBannerText}>{stationsError}</Text>
            <TouchableOpacity onPress={refetch} style={{ marginLeft: 8 }}>
              <Text style={styles.retryInline}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

      </SafeAreaView>

      {/* Re-center on user location */}
      {MapView && (
        <TouchableOpacity
          style={styles.recenterBtn}
          onPress={recenterMap}
          accessibilityLabel="Re-center on my location"
        >
          <Ionicons name="locate-outline" size={22} color={COLORS.accent} />
        </TouchableOpacity>
      )}

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
                  {safeText(selectedStation.name) || brandToString(selectedStation.brand) || 'Station'}
                </Text>
                {brandToString(selectedStation.brand) ? (
                  <Text style={[styles.sheetBrand, { color: selectedFuelMeta.color }]}>
                    {brandToString(selectedStation.brand)}
                  </Text>
                ) : null}
                <Text style={styles.sheetAddress} numberOfLines={1}>
                  {safeText(selectedStation.address)}
                </Text>
                {selectedStation.distance_km != null && (
                  <Text style={styles.sheetDistance}>
                    {selectedStation.distance_km.toFixed(1)} km away
                  </Text>
                )}
              </View>
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
                <Ionicons name="chevron-forward" size={14} color={COLORS.background} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: 'box-none',
  },
  filterRow: {
    backgroundColor: COLORS.mapOverlayStrong,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 6,
  },
  filterChipText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  brandFilterRow: {
    backgroundColor: COLORS.mapOverlayMedium,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  brandFilterScroll: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  brandChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 4,
  },
  brandChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  brandChipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  brandChipTextActive: {
    color: COLORS.background,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.mapOverlaySurface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
  modeBtnText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.mapOverlayMedium,
    paddingHorizontal: 14,
    paddingVertical: 8,
    margin: 10,
    borderRadius: 8,
    alignSelf: 'center',
    gap: 8,
  },
  loadingBannerText: { color: COLORS.textSecondary, fontSize: 13 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.mapOverlayError,
    paddingHorizontal: 14,
    paddingVertical: 8,
    margin: 10,
    borderRadius: 8,
    alignSelf: 'stretch',
  },
  errorBannerText: { color: COLORS.danger, fontSize: 12, flex: 1, marginLeft: 6 },
  retryInline: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  cluster: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  clusterLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.clusterLarge,
  },
  clusterText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.background,
  },
  clusterTextLarge: {
    fontSize: 16,
  },
  recenterBtn: {
    position: 'absolute',
    bottom: 200,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  sheetName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  sheetBrand: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  sheetAddress: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  sheetDistance: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  sheetPriceBadge: {
    marginLeft: 12,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    minWidth: 64,
    backgroundColor: COLORS.background,
  },
  sheetPriceLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 2 },
  sheetPrice: { fontSize: 20, fontWeight: '800' },
  sheetActions: { flexDirection: 'row', gap: 10 },
  dismissBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  dismissBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  detailBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  detailBtnText: { color: COLORS.background, fontWeight: '700', fontSize: 15 },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 14 },
  errorText: { color: COLORS.danger, fontSize: 14, textAlign: 'center', marginTop: 12, marginBottom: 12 },
  retryBtn: { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { color: COLORS.background, fontWeight: '700' },
});
