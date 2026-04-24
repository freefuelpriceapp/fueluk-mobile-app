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
  Linking,
  useColorScheme,
  AccessibilityInfo,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import useLocation from '../hooks/useLocation';
import useStations from '../hooks/useStations';
import { loadUserVehicle } from '../lib/userVehicle';
// StationMarker also depends on react-native-maps
let StationMarker;
if (Platform.OS !== 'web') {
  StationMarker = require('../components/StationMarker').default;
}
import { resolvePrice } from '../lib/quarantine';
import { COLORS, FUEL_COLORS } from '../lib/theme';
import { brandToString, safeText } from '../lib/brand';
import { toRenderableString } from '../lib/safeRender';
import { formatPencePrice, parsePrice, isPlausiblePrice } from '../lib/price';
import { darkMapStyleRefined, lightMapStyleRefined } from '../lib/mapStyles';
import { buildTierClassifier, PIN_TIER } from '../lib/priceTiers';
import TrajectoryBadge from '../components/TrajectoryBadge';
import BreakEvenBadge from '../components/BreakEvenBadge';
import FlagPriceSheet from '../components/FlagPriceSheet';
import { FEATURE_FLAGS } from '../config/featureFlags';

const FUEL_TYPES = [
  { key: 'petrol',         label: 'Petrol',         color: FUEL_COLORS.petrol },
  { key: 'diesel',         label: 'Diesel',         color: FUEL_COLORS.diesel },
  { key: 'e10',            label: 'E10',            color: FUEL_COLORS.e10 },
  { key: 'super_unleaded', label: 'Super',          color: FUEL_COLORS.super_unleaded },
  { key: 'premium_diesel', label: 'Prem. Diesel',   color: FUEL_COLORS.premium_diesel },
];

const BOTTOM_SHEET_HEIGHT = 240;

function freshnessState(iso) {
  if (!iso) return 'unknown';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'unknown';
  const hours = (Date.now() - d.getTime()) / 3600000;
  if (hours < 1) return 'fresh';
  if (hours < 24) return 'ok';
  return 'stale';
}

function formatRelativeTime(iso) {
  if (!iso) return 'just now';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'recently';
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60 * 1000) return 'just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Isolates native map mount failures so a crash in react-native-maps
// renders a safe fallback instead of tearing down the whole app.
class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: null };
  }
  static getDerivedStateFromError(err) {
    return { hasError: true, message: err && err.message ? String(err.message) : 'Map unavailable' };
  }
  componentDidCatch(err, info) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('[MapScreen] native map error:', err, info);
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 24 }]}>
          <Ionicons name="map-outline" size={48} color={COLORS.textSecondary} />
          <Text style={{ color: COLORS.text, marginTop: 12, fontSize: 15, fontWeight: '600' }}>Map couldn't load</Text>
          <Text style={{ color: COLORS.textSecondary, marginTop: 6, fontSize: 13, textAlign: 'center' }}>
            Use the Home tab to browse nearby stations while we sort this out.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function MapScreen({ navigation }) {
  const [fuelType, setFuelType] = useState('petrol');
  const [mode, setMode] = useState('nearby');
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [visibleRegion, setVisibleRegion] = useState(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [userVehicle, setUserVehicle] = useState(null);
  const [flagTarget, setFlagTarget] = useState(null);
  const [showFreshnessPopover, setShowFreshnessPopover] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadUserVehicle().then((v) => { if (mounted) setUserVehicle(v); });
    // Re-load on focus so returning from VehicleSettings refreshes the mpg.
    const unsub = navigation?.addListener?.('focus', () => {
      loadUserVehicle().then((v) => { if (mounted) setUserVehicle(v); });
    });
    return () => { mounted = false; if (typeof unsub === 'function') unsub(); };
  }, [navigation]);

  const colorScheme = useColorScheme();
  const mapStyle = colorScheme === 'light' ? lightMapStyleRefined : darkMapStyleRefined;

  const mapRef = useRef(null);
  const sheetAnim = useRef(new Animated.Value(BOTTOM_SHEET_HEIGHT)).current;
  const regionDebounceRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => { if (!cancelled) setReduceMotion(!!v); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener
      ? AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduceMotion(!!v))
      : null;
    return () => {
      cancelled = true;
      if (sub && sub.remove) sub.remove();
    };
  }, []);

  // First-run "tap a pin" hint (v2 copy). Shown once per install; key v2
  // means users who dismissed v1 still see the upgraded copy once.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem('map_hint_dismissed_v2')
      .then((v) => { if (!cancelled && !v) setShowHint(true); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const dismissHint = useCallback(() => {
    setShowHint(false);
    AsyncStorage.setItem('map_hint_dismissed_v2', '1').catch(() => {});
  }, []);

  const { location, loading: locationLoading, error: locationError } = useLocation();

  const stationLocation = useMemo(() => {
    if (!location) return null;
    const lat = Number(location.coords?.latitude);
    const lng = Number(location.coords?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, [location]);

  const {
    stations,
    loading: stationsLoading,
    error: stationsError,
    refetch,
    meta: stationsMeta,
  } = useStations(stationLocation, {
    fuelType,
    mode,
    radiusKm: 25,
    mpg: userVehicle?.mpg ?? null,
  });

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

  // Only render stations with valid finite numeric coordinates —
  // NaN or undefined lat/lng can trigger a native crash in Google Maps.
  const mappableStations = useMemo(() => {
    if (!Array.isArray(stations)) return [];
    return stations.filter((s) => {
      if (!s) return false;
      const lat = Number(s.lat ?? s.latitude);
      const lng = Number(s.lon ?? s.lng ?? s.longitude);
      return Number.isFinite(lat) && Number.isFinite(lng);
    });
  }, [stations]);

  const filteredStations = useMemo(() => {
    const base = selectedBrand
      ? mappableStations.filter(s => brandToString(s.brand) === selectedBrand)
      : mappableStations;
    // Drop stations whose price doesn't normalise to something plausible —
    // last-defence quarantine so "1374" / "1666" wire-format leaks never
    // surface as pins. Stations with a null price still show on the list
    // views elsewhere; they're just excluded from the visual map.
    const plausible = base.filter((s) => isPlausiblePrice(resolvePrice(s, fuelType)));
    return plausible.length > 150 ? plausible.slice(0, 150) : plausible;
  }, [mappableStations, selectedBrand, fuelType]);

  // Regional cohort used for tier thresholds on each pin. Recomputed
  // only when the filtered set or fuel type changes.
  const cohortPrices = useMemo(() => {
    return filteredStations
      .map((s) => parsePrice(resolvePrice(s, fuelType)))
      .filter((p) => typeof p === 'number' && Number.isFinite(p));
  }, [filteredStations, fuelType]);

  // Stations inside the visible region + 20% buffer. Falls back to
  // all stations until the first onRegionChange event arrives.
  const visibleStations = useMemo(() => {
    if (!visibleRegion) return filteredStations;
    const { latitude, longitude, latitudeDelta, longitudeDelta } = visibleRegion;
    const latPad = latitudeDelta * 0.6;
    const lngPad = longitudeDelta * 0.6;
    const minLat = latitude - latPad;
    const maxLat = latitude + latPad;
    const minLng = longitude - lngPad;
    const maxLng = longitude + lngPad;
    return filteredStations.filter((s) => {
      const lat = Number(s.lat ?? s.latitude);
      const lng = Number(s.lon ?? s.lng ?? s.longitude);
      return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
    });
  }, [filteredStations, visibleRegion]);

  // Prices from the currently-visible stations. Drives the tier
  // classifier below so pin colouring re-flows as the user pans/zooms.
  const visiblePrices = useMemo(() => {
    return visibleStations
      .map((s) => parsePrice(resolvePrice(s, fuelType)))
      .filter((p) => typeof p === 'number' && Number.isFinite(p));
  }, [visibleStations, fuelType]);

  const tierClassifier = useMemo(
    () => buildTierClassifier(visiblePrices),
    [visiblePrices]
  );

  // Average visible price — cached once per region change so each pin
  // doesn't re-reduce the full cohort to compute its delta.
  const visibleAvgPrice = useMemo(() => {
    if (!visiblePrices.length) return null;
    const sum = visiblePrices.reduce((a, b) => a + b, 0);
    return sum / visiblePrices.length;
  }, [visiblePrices]);

  // Whether the visible cohort is large enough to compute meaningful
  // savings deltas (mirrors computeSavingsDelta's threshold).
  const hasDeltaCohort = visiblePrices.length >= 3;

  // Summary stats for the status strip at the top of the map.
  const mapStatus = useMemo(() => {
    const count = visibleStations.length;
    let min = Infinity;
    let minStation = null;
    for (const s of visibleStations) {
      const p = parsePrice(resolvePrice(s, fuelType));
      if (p !== null && p < min) {
        min = p;
        minStation = s;
      }
    }
    const cheapestPrice = Number.isFinite(min) ? min : null;
    return { count, cheapestPrice, cheapestStation: minStation };
  }, [visibleStations, fuelType]);

  // Count off-screen stations cheaper than the cheapest visible one —
  // drives the subtle "+N cheaper nearby" hint at the bottom.
  const cheaperOffscreenCount = useMemo(() => {
    if (!visibleRegion || visibleStations.length === filteredStations.length) return 0;
    let visibleMin = Infinity;
    for (const s of visibleStations) {
      const p = parsePrice(resolvePrice(s, fuelType));
      if (p !== null && p < visibleMin) visibleMin = p;
    }
    if (!Number.isFinite(visibleMin)) return 0;
    let count = 0;
    const visibleIds = new Set(visibleStations.map((s) => s.id));
    for (const s of filteredStations) {
      if (visibleIds.has(s.id)) continue;
      const p = parsePrice(resolvePrice(s, fuelType));
      if (p !== null && p < visibleMin) count += 1;
    }
    return count;
  }, [filteredStations, visibleStations, visibleRegion, fuelType]);

  const initialRegion = useMemo(() => {
    // London as last-resort fallback — always a valid finite region.
    const rawLat = Number(location?.coords?.latitude);
    const rawLng = Number(location?.coords?.longitude);
    const lat = Number.isFinite(rawLat) ? rawLat : 51.5074;
    const lng = Number.isFinite(rawLng) ? rawLng : -0.1278;
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
    const lat = Number(location?.coords?.latitude);
    const lng = Number(location?.coords?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    try {
      mapRef.current.animateToRegion(
        { latitude: lat, longitude: lng, latitudeDelta: 0.15, longitudeDelta: 0.15 },
        600
      );
    } catch (_e) {}
  }, [location?.coords?.latitude, location?.coords?.longitude]);

  const cheapestStationId = useMemo(() => {
    if (!filteredStations.length) return null;
    let best = null;
    let bestPrice = Infinity;
    for (const s of filteredStations) {
      const p = parsePrice(resolvePrice(s, fuelType));
      if (p !== null && p < bestPrice) {
        bestPrice = p;
        best = s.id;
      }
    }
    return best;
  }, [filteredStations, fuelType]);

  const onRegionChangeComplete = useCallback((region) => {
    if (regionDebounceRef.current) clearTimeout(regionDebounceRef.current);
    regionDebounceRef.current = setTimeout(() => setVisibleRegion(region), 150);
  }, []);

  useEffect(() => () => {
    if (regionDebounceRef.current) clearTimeout(regionDebounceRef.current);
  }, []);

  const selectedFuelMeta = FUEL_TYPES.find(f => f.key === fuelType) || FUEL_TYPES[0];

  const handleMarkerPress = useCallback((station) => {
    setSelectedStation(station);
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: reduceMotion ? 0 : 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [sheetAnim, reduceMotion]);

  const dismissSheet = useCallback(() => {
    Animated.timing(sheetAnim, {
      toValue: BOTTOM_SHEET_HEIGHT,
      duration: reduceMotion ? 0 : 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setSelectedStation(null));
  }, [sheetAnim, reduceMotion]);

  const navigateToDetail = useCallback(() => {
    if (!selectedStation) return;
    dismissSheet();
    setTimeout(() => {
      navigation.navigate('StationDetail', { station: selectedStation });
    }, reduceMotion ? 0 : 230);
  }, [selectedStation, navigation, dismissSheet, reduceMotion]);

  const [isFavourite, setIsFavourite] = useState(false);
  useEffect(() => {
    if (!selectedStation) return;
    let mounted = true;
    AsyncStorage.getItem('user_favourites').then((stored) => {
      if (!mounted) return;
      const favs = stored ? JSON.parse(stored) : [];
      setIsFavourite(
        Array.isArray(favs) &&
        favs.some((s) => (typeof s === 'object' ? s?.id === selectedStation.id : s === selectedStation.id))
      );
    }).catch(() => {});
    return () => { mounted = false; };
  }, [selectedStation]);

  const toggleFavourite = useCallback(async () => {
    if (!selectedStation) return;
    try {
      const stored = await AsyncStorage.getItem('user_favourites');
      const parsed = stored ? JSON.parse(stored) : [];
      let favs = Array.isArray(parsed)
        ? parsed.filter((s) => s && typeof s === 'object' && s.id != null)
        : [];
      if (isFavourite) {
        favs = favs.filter((s) => s.id !== selectedStation.id);
      } else {
        favs = [...favs.filter((s) => s.id !== selectedStation.id), selectedStation];
      }
      await AsyncStorage.setItem('user_favourites', JSON.stringify(favs));
      setIsFavourite(!isFavourite);
    } catch (_e) {}
  }, [selectedStation, isFavourite]);

  const openDirections = useCallback(async () => {
    if (!selectedStation) return;
    const destination = encodeURIComponent(
      selectedStation.address || selectedStation.name || ''
    );
    const native =
      Platform.OS === 'ios'
        ? `maps://?daddr=${destination}`
        : Platform.OS === 'android'
          ? `google.navigation:q=${destination}`
          : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    const fallback = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    try {
      const canOpen = await Linking.canOpenURL(native).catch(() => false);
      await Linking.openURL(canOpen ? native : fallback);
    } catch (_e) {}
  }, [selectedStation]);

  const recenterCheapest = useCallback(() => {
    const s = mapStatus.cheapestStation;
    if (!s || !mapRef.current) return;
    const lat = Number(s.lat ?? s.latitude);
    const lng = Number(s.lon ?? s.lng ?? s.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    try {
      mapRef.current.animateToRegion(
        { latitude: lat, longitude: lng, latitudeDelta: 0.08, longitudeDelta: 0.08 },
        450
      );
    } catch (_e) {}
  }, [mapStatus.cheapestStation]);

  const recenterMap = useCallback(() => {
    const lat = Number(location?.coords?.latitude);
    const lng = Number(location?.coords?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !mapRef.current) return;
    try {
      mapRef.current.animateToRegion(
        { latitude: lat, longitude: lng, latitudeDelta: 0.1, longitudeDelta: 0.1 },
        400
      );
    } catch (_e) {}
  }, [location]);

  const renderCluster = useCallback((cluster) => {
    const { id, geometry, onPress, properties } = cluster || {};
    const coords = geometry && Array.isArray(geometry.coordinates) ? geometry.coordinates : null;
    const lng = coords ? Number(coords[0]) : NaN;
    const lat = coords ? Number(coords[1]) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const points = properties?.point_count ?? 0;

    // Compute the cheapest price among this cluster's member stations.
    // Use a simple radius check keyed off the supercluster geometry —
    // the library doesn't hand us the raw leaves in renderCluster.
    let minPrice = Infinity;
    const latTol = 0.2;
    const lngTol = 0.2;
    for (const s of filteredStations) {
      const sLat = Number(s.lat ?? s.latitude);
      const sLng = Number(s.lon ?? s.lng ?? s.longitude);
      if (!Number.isFinite(sLat) || !Number.isFinite(sLng)) continue;
      if (Math.abs(sLat - lat) > latTol || Math.abs(sLng - lng) > lngTol) continue;
      const p = parsePrice(resolvePrice(s, fuelType));
      if (p !== null && p < minPrice) minPrice = p;
    }
    const hasOverallCheapest = Number.isFinite(minPrice)
      && cheapestStationId != null
      && filteredStations.some((s) => {
        if (s.id !== cheapestStationId) return false;
        const sLat = Number(s.lat ?? s.latitude);
        const sLng = Number(s.lon ?? s.lng ?? s.longitude);
        return Number.isFinite(sLat) && Number.isFinite(sLng)
          && Math.abs(sLat - lat) <= latTol
          && Math.abs(sLng - lng) <= lngTol;
      });
    const priceLabel = Number.isFinite(minPrice) ? `${minPrice.toFixed(0)}p` : null;

    const a11y = priceLabel
      ? `Cluster of ${points} stations, cheapest ${minPrice.toFixed(1)} pence. Tap to expand.`
      : `Cluster of ${points} stations. Tap to expand.`;

    return (
      <Marker
        key={`cluster-${id}`}
        coordinate={{ latitude: lat, longitude: lng }}
        onPress={onPress}
        accessibilityLabel={a11y}
        tracksViewChanges={false}
      >
        <View style={[styles.cluster, hasOverallCheapest && styles.clusterCheapest]}>
          <Text style={styles.clusterCount} numberOfLines={1}>
            {String(points)}
          </Text>
          {priceLabel ? (
            <Text
              style={[
                styles.clusterPrice,
                hasOverallCheapest && styles.clusterPriceOnGreen,
              ]}
              numberOfLines={1}
            >
              {priceLabel}
            </Text>
          ) : null}
        </View>
      </Marker>
    );
  }, [filteredStations, fuelType, cheapestStationId]);

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
      <MapErrorBoundary>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={Platform.OS === 'android'}
          customMapStyle={mapStyle}
          onPress={dismissSheet}
          onRegionChangeComplete={onRegionChangeComplete}
          clusterColor={'#10B981'}
          clusterTextColor={'#0B0F14'}
          clusterFontFamily={undefined}
          // v4: supercluster radius bumped from 50 → 80 (screen pixels at
          // extent=256). On a 360dp-wide Android, 80px ≈ 22% of the map
          // width, so stations tighter than that collapse into a cluster
          // instead of stacking as overlapping illegible cards. maxZoom
          // reduced from 16 → 14 so the "no more clustering" cutoff
          // happens at a further-in zoom level, keeping city views
          // clean while still letting the user zoom in to see individuals.
          radius={80}
          minZoom={1}
          maxZoom={14}
          minPoints={2}
          extent={256}
          animationEnabled={!reduceMotion}
          renderCluster={renderCluster}
        >
          {visibleStations.map((station, idx) => {
            const price = resolvePrice(station, fuelType);
            const parsed = parsePrice(price);
            const tier = station.id === cheapestStationId
              ? PIN_TIER.CHEAPEST
              : tierClassifier(parsed);
            // Savings delta pre-computed against the cached avg — cheap
            // path, no full-cohort reduce per marker.
            let delta = null;
            if (hasDeltaCohort && parsed != null && visibleAvgPrice != null) {
              delta = Math.round((parsed - visibleAvgPrice) * 10) / 10;
            }
            return (
              <StationMarker
                key={String(station.id)}
                station={station}
                cheapestPrice={price}
                tier={tier}
                fuelType={fuelType}
                savingsDelta={delta}
                onPress={handleMarkerPress}
                onLongPress={FEATURE_FLAGS.priceFlags ? (s) => setFlagTarget(s) : undefined}
                isSelected={selectedStation?.id === station.id}
                staggerIndex={idx}
                reduceMotion={reduceMotion}
              />
            );
          })}
        </MapView>
      </MapErrorBoundary>
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
              {brands.map((brand) => {
                const brandLabel = toRenderableString(brand);
                if (!brandLabel) return null;
                return (
                  <TouchableOpacity
                    key={brandLabel}
                    style={[styles.brandChip, selectedBrand === brandLabel && styles.brandChipActive]}
                    onPress={() => setSelectedBrand(prev => prev === brandLabel ? null : brandLabel)}
                  >
                    <Text style={[styles.brandChipText, selectedBrand === brandLabel && styles.brandChipTextActive]}>
                      {brandLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
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

        {mapStatus.count > 0 && (
          <TouchableOpacity
            style={[
              styles.statusStrip,
              colorScheme === 'light' && styles.statusStripLight,
            ]}
            onPress={recenterCheapest}
            accessibilityRole="button"
            accessibilityLabel={`${mapStatus.count} stations visible. Cheapest ${
              mapStatus.cheapestPrice != null ? mapStatus.cheapestPrice.toFixed(1) + ' pence' : 'unavailable'
            }. Updated ${formatRelativeTime(mapStatus.cheapestStation?.last_updated)}. Tap to recentre on cheapest.`}
          >
            <View style={styles.statusCluster}>
              <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} style={{ marginRight: 3 }} />
              <Text style={styles.statusStripStrong}>{String(mapStatus.count)}</Text>
            </View>

            {mapStatus.cheapestPrice != null && (
              <View style={styles.statusCluster}>
                <Text style={styles.statusDot}>{'·'}</Text>
                <Text style={styles.statusCheapestPrice}>
                  {mapStatus.cheapestPrice.toFixed(1)}p
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.statusCluster}
              onPress={(e) => {
                e.stopPropagation?.();
                setShowFreshnessPopover(v => !v);
              }}
              accessibilityRole="button"
              accessibilityLabel="Price freshness info. Live prices from the UK Government Fuel Finder register."
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Text style={styles.statusDot}>{'·'}</Text>
              <View
                style={[
                  styles.freshnessDot,
                  freshnessState(mapStatus.cheapestStation?.last_updated) === 'fresh' && styles.freshnessDotGreen,
                  freshnessState(mapStatus.cheapestStation?.last_updated) === 'ok' && styles.freshnessDotAmber,
                  freshnessState(mapStatus.cheapestStation?.last_updated) === 'stale' && styles.freshnessDotGrey,
                ]}
              />
              <Text style={styles.statusStripText} numberOfLines={1}>
                {formatRelativeTime(mapStatus.cheapestStation?.last_updated)}
              </Text>
            </TouchableOpacity>

            {FEATURE_FLAGS.trajectory && stationsMeta?.nationalTrajectory ? (
              <View style={[styles.statusCluster, { marginLeft: 'auto' }]}>
                <TrajectoryBadge
                  trajectory={stationsMeta.nationalTrajectory}
                  scope="national"
                  size="sm"
                />
              </View>
            ) : null}
          </TouchableOpacity>
        )}

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

      {FEATURE_FLAGS.vehicleSettings && MapView ? (
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('VehicleSettings')}
          accessibilityLabel="Vehicle settings"
          accessibilityRole="button"
        >
          <Ionicons name="car-sport-outline" size={20} color={COLORS.accent} />
          {!userVehicle ? <View style={styles.settingsBtnDot} /> : null}
        </TouchableOpacity>
      ) : null}

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
              <View
                style={[
                  styles.sheetBrandBadge,
                  { backgroundColor: brandToString(selectedStation.brand) ? '#1F2937' : '#374151' },
                ]}
              >
                <Text style={styles.sheetBrandInitial}>
                  {(brandToString(selectedStation.brand) || safeText(selectedStation.name) || '?')
                    .trim()
                    .charAt(0)
                    .toUpperCase() || '?'}
                </Text>
              </View>
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
            </View>

            {FEATURE_FLAGS.breakEven && selectedStation.break_even ? (
              <View style={styles.sheetBadgeRow}>
                <BreakEvenBadge breakEven={selectedStation.break_even} size="md" />
              </View>
            ) : null}

            <View style={styles.sheetPriceRow}>
              {FUEL_TYPES.map((ft) => {
                const label = formatPencePrice(resolvePrice(selectedStation, ft.key));
                if (!label) return null;
                const isActive = ft.key === fuelType;
                return (
                  <View
                    key={ft.key}
                    style={[
                      styles.sheetPricePill,
                      isActive && { borderColor: ft.color, backgroundColor: 'rgba(16,185,129,0.08)' },
                    ]}
                  >
                    <Text style={styles.sheetPricePillLabel}>{ft.label}</Text>
                    <Text style={[styles.sheetPricePillValue, { color: ft.color }]}>{label}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={styles.sheetActionBtn}
                onPress={openDirections}
                accessibilityLabel="Get directions"
              >
                <Ionicons name="navigate" size={16} color={COLORS.accent} />
                <Text style={styles.sheetActionBtnText}>Directions</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sheetActionBtn}
                onPress={toggleFavourite}
                accessibilityLabel={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                accessibilityState={{ checked: isFavourite }}
              >
                <Ionicons
                  name={isFavourite ? 'heart' : 'heart-outline'}
                  size={16}
                  color={isFavourite ? '#EF4444' : COLORS.textSecondary}
                />
                <Text style={styles.sheetActionBtnText}>
                  {isFavourite ? 'Saved' : 'Save'}
                </Text>
              </TouchableOpacity>
              {FEATURE_FLAGS.priceFlags && (
                <TouchableOpacity
                  style={styles.sheetActionBtn}
                  onPress={() => {
                    const s = selectedStation;
                    dismissSheet();
                    setTimeout(() => setFlagTarget(s), reduceMotion ? 0 : 240);
                  }}
                  accessibilityLabel="Report wrong price"
                >
                  <Ionicons name="flag-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.sheetActionBtnText}>Report</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.sheetPrimaryBtn, { backgroundColor: selectedFuelMeta.color }]}
                onPress={navigateToDetail}
                accessibilityLabel="See station details"
              >
                <Text style={styles.sheetPrimaryBtnText}>See details</Text>
                <Ionicons name="chevron-forward" size={14} color={COLORS.background} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>

      <FlagPriceSheet
        visible={!!flagTarget}
        station={flagTarget}
        initialFuelType={fuelType}
        onClose={() => setFlagTarget(null)}
      />

      {cheaperOffscreenCount > 0 && !selectedStation && (
        <View style={styles.offscreenHint} pointerEvents="none">
          <Ionicons name="trending-down" size={12} color="#10B981" />
          <Text style={styles.offscreenHintText}>
            +{cheaperOffscreenCount} cheaper nearby — zoom out
          </Text>
        </View>
      )}

      {showHint && !selectedStation && (
        <TouchableOpacity
          style={styles.firstRunHint}
          onPress={dismissHint}
          accessibilityRole="button"
          accessibilityLabel="Tap any pin to see the real-time price. All data from the official UK fuel register. Tap to dismiss."
        >
          <Ionicons name="shield-checkmark-outline" size={14} color="#10B981" />
          <Text style={styles.firstRunHintText} numberOfLines={2}>
            Tap any pin to see the real-time price — all data from the official UK fuel register
          </Text>
          <Ionicons name="close" size={12} color="rgba(255,255,255,0.6)" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      )}

      {showFreshnessPopover && (
        <TouchableOpacity
          style={styles.freshnessPopover}
          activeOpacity={0.9}
          onPress={() => setShowFreshnessPopover(false)}
          accessibilityRole="button"
          accessibilityLabel={`Live prices from the UK Government Fuel Finder register. Updated ${formatRelativeTime(mapStatus.cheapestStation?.last_updated)}. Tap to close.`}
        >
          <View style={styles.freshnessPopoverArrow} />
          <Ionicons name="shield-checkmark-outline" size={14} color="#10B981" />
          <View style={{ flex: 1 }}>
            <Text style={styles.freshnessPopoverTitle}>
              Official UK price data
            </Text>
            <Text style={styles.freshnessPopoverBody}>
              Live from the UK Government Fuel Finder register. Updated {formatRelativeTime(mapStatus.cheapestStation?.last_updated)}.
            </Text>
          </View>
          <Ionicons name="close" size={12} color="rgba(255,255,255,0.55)" />
        </TouchableOpacity>
      )}
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
    zIndex: 10,
    elevation: 10,
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
  statusStrip: {
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,39,0.96)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    zIndex: 11,
    elevation: 11,
    gap: 6,
  },
  statusCluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusCheapestPrice: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.2,
  },
  freshnessDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#6B7280',
    marginHorizontal: 6,
  },
  freshnessDotGreen: { backgroundColor: '#10B981' },
  freshnessDotAmber: { backgroundColor: '#F59E0B' },
  freshnessDotGrey:  { backgroundColor: '#6B7280' },
  statusStripLight: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  statusStripText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    letterSpacing: 0.1,
  },
  statusStripStrong: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 13,
  },
  statusDot: {
    color: COLORS.textMuted,
    marginHorizontal: 2,
  },
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
    minWidth: 48,
    height: 48,
    paddingHorizontal: 8,
    borderRadius: 24,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  clusterCheapest: {
    backgroundColor: '#10B981',
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#10B981',
    shadowOpacity: 0.75,
    shadowRadius: 10,
    elevation: 10,
  },
  clusterCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 16,
  },
  clusterPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 0,
    letterSpacing: 0.2,
  },
  clusterPriceOnGreen: {
    color: '#0B0F14',
  },
  offscreenHint: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,30,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    gap: 6,
  },
  offscreenHintText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '700',
  },
  firstRunHint: {
    position: 'absolute',
    top: 170,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(15,23,30,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  firstRunHintText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.1,
    maxWidth: 240,
  },
  freshnessPopover: {
    position: 'absolute',
    top: 210,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,30,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 20,
  },
  freshnessPopoverArrow: {
    position: 'absolute',
    top: -6,
    alignSelf: 'center',
    width: 10,
    height: 10,
    backgroundColor: 'rgba(15,23,30,0.97)',
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    transform: [{ rotate: '45deg' }],
  },
  freshnessPopoverTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  freshnessPopoverBody: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    lineHeight: 14,
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
  settingsBtn: {
    position: 'absolute',
    top: 160,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  settingsBtnDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  sheetBadgeRow: {
    flexDirection: 'row',
    marginBottom: 6,
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
  sheetRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  sheetBrandBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sheetBrandInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sheetName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  sheetBrand: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  sheetAddress: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  sheetDistance: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  sheetPriceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  sheetPricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  sheetPricePillLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  sheetPricePillValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  sheetActions: { flexDirection: 'row', gap: 8 },
  sheetActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  sheetActionBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  sheetPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  sheetPrimaryBtnText: {
    color: COLORS.background,
    fontWeight: '800',
    fontSize: 14,
  },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 14 },
  errorText: { color: COLORS.danger, fontSize: 14, textAlign: 'center', marginTop: 12, marginBottom: 12 },
  retryBtn: { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { color: COLORS.background, fontWeight: '700' },
});
