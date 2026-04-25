import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StationCard from '../components/StationCard';
import BrandHeader from '../components/BrandHeader';
import BestOptionCard from '../components/BestOptionCard';
import BrandFilter from '../components/BrandFilter';
import { SkeletonList } from '../components/SkeletonCard';
import { getNearbyStations, searchStations, getLastUpdated } from '../api/fuelApi';
import useLocation from '../hooks/useLocation';
import { trackNearbyScreenView, trackRefreshInitiated, trackRefreshCompleted } from '../lib/analytics';
import { resolvePrice } from '../lib/quarantine';
import { extractSelectedReason } from '../lib/selectedReason';
import { chooseBestOption } from '../lib/bestOption';
import { COLORS, FUEL_COLORS } from '../lib/theme';
import { lightHaptic } from '../lib/haptics';
import { sanitizeStations } from '../lib/brand';
import { toRenderableString } from '../lib/safeRender';
import TrajectoryBadge from '../components/TrajectoryBadge';
import FlagPriceSheet from '../components/FlagPriceSheet';
import PersonalisationChip from '../components/PersonalisationChip';
import FirstVehicleCelebration from '../components/FirstVehicleCelebration';
import InstantAnswerHeadline from '../components/InstantAnswerHeadline';
import MonthlySavingsCard from '../components/MonthlySavingsCard';
import LifetimeSavingsCard from '../components/LifetimeSavingsCard';
import LiveDataTile from '../components/LiveDataTile';
import PriceTrajectorySparkline from '../components/PriceTrajectorySparkline';
import {
  LIFETIME_SAVINGS_KEY,
  appendLifetimeSaving,
} from '../lib/lifetimeSavings';
import {
  loadUserVehicle,
  isVehiclePromptDismissed,
  dismissVehiclePrompt,
} from '../lib/userVehicle';
import { FEATURE_FLAGS } from '../config/featureFlags';

const FUEL_TYPES = [
  { key: 'petrol', label: 'Petrol', color: FUEL_COLORS.petrol },
  { key: 'diesel', label: 'Diesel', color: FUEL_COLORS.diesel },
  { key: 'e10',    label: 'E10',    color: FUEL_COLORS.e10 },
];

const SORT_MODES = [
  { key: 'nearest',  label: 'Nearest',  icon: 'navigate-outline' },
  { key: 'cheapest', label: 'Cheapest', icon: 'trending-down-outline' },
];

const FUEL_PRICE_KEY = {
  petrol: 'petrol_price',
  diesel: 'diesel_price',
  e10: 'e10_price',
  super_unleaded: 'super_unleaded_price',
  premium_diesel: 'premium_diesel_price',
};

const STATIONS_CACHE_KEY = 'cached_nearby_stations';

const isOffline = (err) =>
  err && (err.message === 'Network Error' || err.code === 'ECONNABORTED' || !err.response);

const formatUpdated = (iso) => {
  try {
    const d = new Date(iso);
    if (isNaN(d)) return null;
    const now = Date.now();
    const ageH = Math.round((now - d.getTime()) / 3600000);
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString([], { day: 'numeric', month: 'short' });
    return { label: `${dateStr} at ${timeStr}`, stale: ageH > 24, ageH };
  } catch (_e) {
    return null;
  }
};

const HomeScreen = ({ navigation }) => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [offline, setOffline] = useState(false);
  const [selectedFuel, setSelectedFuel] = useState('petrol');
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [sortMode, setSortMode] = useState('nearest'); // 'nearest' | 'cheapest'
  const [selectedReason, setSelectedReason] = useState(null);
  const [bestOption, setBestOption] = useState(null);
  const [bestValue, setBestValue] = useState(null);
  const [bestValueReason, setBestValueReason] = useState(null);
  const [nationalTrajectory, setNationalTrajectory] = useState(null);
  const [userVehicle, setUserVehicle] = useState(null);
  const [promptDismissed, setPromptDismissed] = useState(true);
  const [flagTarget, setFlagTarget] = useState(null);
  const [lifetimeRefreshKey, setLifetimeRefreshKey] = useState(0);
  const { location } = useLocation();

  useEffect(() => { trackNearbyScreenView(); }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [v, dismissed] = await Promise.all([
        loadUserVehicle(),
        isVehiclePromptDismissed(),
      ]);
      if (!mounted) return;
      setUserVehicle(v);
      setPromptDismissed(dismissed);
    })();
    return () => { mounted = false; };
  }, []);

  // Re-load the vehicle when returning from VehicleSettings so the chip
  // + celebration refresh without a full remount.
  useEffect(() => {
    const unsub = navigation?.addListener?.('focus', () => {
      loadUserVehicle().then(setUserVehicle).catch(() => {});
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [navigation]);

  // Track the moment the first vehicle is linked (controls the celebration).
  useEffect(() => {
    if (!userVehicle) return;
    AsyncStorage.getItem('first_vehicle_linked_at').then((existing) => {
      if (!existing) {
        AsyncStorage.setItem('first_vehicle_linked_at', new Date().toISOString())
          .catch(() => {});
      }
    }).catch(() => {});
  }, [userVehicle]);

  const fetchStations = useCallback(async () => {
    if (!location) return;
    try {
      setError(null);
      setOffline(false);
      const lat = location.coords?.latitude;
      const lng = location.coords?.longitude;

      let data;
      if (lat && lng) {
        setUsingFallback(false);
        data = await getNearbyStations({
          lat,
          lng,
          radiusKm: location.radiusKm || 5,
          fuel: selectedFuel,
          brand: selectedBrand,
          mpg: userVehicle?.mpg ?? null,
        });
      } else if (location.postcode) {
        setUsingFallback(true);
        data = await searchStations(location.postcode);
      } else {
        setError('We\u2019can\u2019t determine your location. Enable location in Settings to see nearby stations, or search by postcode.');
        setLoading(false);
        return;
      }
      const list = (data.stations || []).map(s => ({
        ...s,
        distance_km: typeof s.distance_km === 'number' ? s.distance_km : (typeof s.distance_miles === 'number' ? s.distance_miles * 1.60934 : undefined),
        prices: {
          petrol: s.petrol_price ?? null,
          diesel: s.diesel_price ?? null,
          e10: s.e10_price ?? null,
          super_unleaded: s.super_unleaded_price ?? null,
          premium_diesel: s.premium_diesel_price ?? null,
        },
      }));
      setStations(list);
      setSelectedReason(extractSelectedReason(data));
      setBestOption(chooseBestOption(data, list, selectedFuel));
      // New differentiator fields — all optional; tolerate missing.
      setBestValue(data?.best_value || null);
      setBestValueReason(
        typeof data?.best_value_reason === 'string' ? data.best_value_reason : null
      );
      setNationalTrajectory(
        data?.national_trajectory && typeof data.national_trajectory === 'object'
          ? data.national_trajectory
          : null
      );
      try { await AsyncStorage.setItem(STATIONS_CACHE_KEY, JSON.stringify(list)); } catch (_e) {}
    } catch (err) {
      if (isOffline(err)) {
        setOffline(true);
        try {
          const cached = await AsyncStorage.getItem(STATIONS_CACHE_KEY);
          if (cached) { setStations(sanitizeStations(JSON.parse(cached)) || []); setError(null); }
          else setError('You\u2019re offline and no cached data is available.');
        } catch (_e) { setError('You\u2019re offline. Please check your connection.'); }
      } else {
        setError('Unable to load stations. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [location, selectedFuel, selectedBrand, userVehicle?.mpg]);

  const fetchLastUpdated = useCallback(async () => {
    try {
      const data = await getLastUpdated();
      if (data?.last_updated) setLastUpdated(data.last_updated);
    } catch (_e) {}
  }, []);

  useEffect(() => {
    fetchStations();
    fetchLastUpdated();
  }, [fetchStations, fetchLastUpdated]);

  const onRefresh = () => {
    setRefreshing(true);
    trackRefreshInitiated();
    fetchStations().then(() => {
      trackRefreshCompleted();
      lightHaptic();
    });
    fetchLastUpdated();
  };

  const handleStationPress = (station) => {
    // When the user picks a non-nearest station, record the saving so the
    // LifetimeSavingsCard can tally it. Device-local only.
    try {
      const savingPence = Number(station?.break_even?.savings_pence);
      const isNearest = station?.break_even?.is_closest === true;
      if (!isNearest && Number.isFinite(savingPence) && savingPence > 0) {
        AsyncStorage.getItem(LIFETIME_SAVINGS_KEY)
          .then((raw) => {
            const list = raw ? JSON.parse(raw) : [];
            const next = appendLifetimeSaving(Array.isArray(list) ? list : [], {
              ts: Date.now(),
              saving_pence: savingPence,
            });
            return AsyncStorage.setItem(LIFETIME_SAVINGS_KEY, JSON.stringify(next));
          })
          .then(() => setLifetimeRefreshKey((k) => k + 1))
          .catch(() => {});
      }
    } catch (_e) {}
    navigation.navigate('StationDetail', { station });
  };

  const openSettings = () => {
    if (Platform.OS === 'ios') Linking.openURL('app-settings:');
    else Linking.openSettings();
  };

  const sortedStations = useMemo(() => {
    if (!Array.isArray(stations) || stations.length === 0) return [];
    const fuelKey = FUEL_PRICE_KEY[selectedFuel] || 'petrol_price';
    const getDistance = (s) => {
      if (!s) return Infinity;
      const m = Number(s.distance_miles);
      if (Number.isFinite(m)) return m;
      const km = Number(s.distance_km);
      if (Number.isFinite(km)) return km / 1.60934;
      return Infinity;
    };
    const getPrice = (s) => {
      if (!s) return Infinity;
      const direct = Number(s[fuelKey]);
      if (Number.isFinite(direct) && direct > 0) return direct;
      const viaPrices = s.prices ? Number(s.prices[selectedFuel]) : NaN;
      if (Number.isFinite(viaPrices) && viaPrices > 0) return viaPrices;
      const viaResolve = Number(resolvePrice(s, selectedFuel));
      if (Number.isFinite(viaResolve) && viaResolve > 0) return viaResolve;
      return Infinity;
    };
    const copy = [...stations];
    if (sortMode === 'cheapest') {
      copy.sort((a, b) => {
        const pa = getPrice(a);
        const pb = getPrice(b);
        if (pa !== pb) return pa - pb;
        return getDistance(a) - getDistance(b);
      });
    } else {
      copy.sort((a, b) => getDistance(a) - getDistance(b));
    }
    return copy;
  }, [stations, sortMode, selectedFuel]);

  // Cheapest station within current results — used by InstantAnswerHeadline.
  const headlineStation = useMemo(() => {
    if (!Array.isArray(stations) || stations.length === 0) return null;
    const fuelKey = FUEL_PRICE_KEY[selectedFuel] || 'petrol_price';
    const priced = stations.filter((s) => {
      const p = Number(s[fuelKey] ?? s?.prices?.[selectedFuel]);
      return Number.isFinite(p) && p > 0;
    });
    if (priced.length === 0) return null;
    return priced.reduce((best, s) => {
      const sp = Number(s[fuelKey] ?? s?.prices?.[selectedFuel]);
      const bp = Number(best[fuelKey] ?? best?.prices?.[selectedFuel]);
      return sp < bp ? s : best;
    });
  }, [stations, selectedFuel]);

  // Per-tank saving from break_even on the headline station, or backend's
  // best_value if shaped differently. Used by both headline + monthly card.
  const perTankSavingPence = useMemo(() => {
    const fromHeadline = Number(headlineStation?.break_even?.savings_pence);
    if (Number.isFinite(fromHeadline) && fromHeadline > 0) return fromHeadline;
    const fromBestValue = Number(bestValue?.break_even?.savings_pence);
    if (Number.isFinite(fromBestValue) && fromBestValue > 0) return fromBestValue;
    return null;
  }, [headlineStation, bestValue]);

  const tankLitres = useMemo(() => {
    const n = Number(headlineStation?.break_even?.tank_litres);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [headlineStation]);

  // National average for the no-vehicle fallback in the headline.
  const nationalAvgPence = useMemo(() => {
    const fuelKey = FUEL_PRICE_KEY[selectedFuel] || 'petrol_price';
    const prices = (stations || [])
      .map((s) => Number(s[fuelKey] ?? s?.prices?.[selectedFuel]))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (prices.length === 0) return null;
    const sum = prices.reduce((a, b) => a + b, 0);
    return sum / prices.length;
  }, [stations, selectedFuel]);

  // Sparkline series — derived from national_trajectory if it carries one,
  // else a synthetic 2-point series from current avg + 7d delta. If
  // neither exists we pass null and the component renders nothing.
  const sparklineValues = useMemo(() => {
    const series = nationalTrajectory?.series_7d || nationalTrajectory?.values_7d;
    if (Array.isArray(series)) {
      const clean = series.filter((n) => Number.isFinite(Number(n))).map(Number);
      if (clean.length >= 2) return clean;
    }
    const delta = Number(nationalTrajectory?.delta_pence_per_l_7d);
    if (Number.isFinite(delta) && Number.isFinite(nationalAvgPence)) {
      const start = nationalAvgPence - delta;
      return [start, nationalAvgPence];
    }
    return null;
  }, [nationalTrajectory, nationalAvgPence]);

  const screenWidth = Dimensions.get('window').width;
  const stackSavingsCards = screenWidth < 360; // iPhone SE is 375; sub-360 = stack

  const headerSub = loading
    ? 'Scanning for the best prices near you'
    : stations.length
    ? `Showing ${stations.length} station${stations.length !== 1 ? 's' : ''} nearby`
    : 'Finding the best nearby fuel prices';

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <BrandHeader
          subtitle="Scanning for the best prices near you"
          onSearchPress={() => navigation.navigate('Search')}
          pulse
        />
        <SkeletonList count={4} />
      </SafeAreaView>
    );
  }

  const updatedInfo = lastUpdated ? formatUpdated(lastUpdated) : null;

  return (
    <SafeAreaView style={styles.container}>
      <BrandHeader
        subtitle={headerSub}
        stations={stations}
        fuelType={selectedFuel}
        onSearchPress={() => navigation.navigate('Search')}
      />

      {(usingFallback || location?.isFallback) && (
        <View
          style={styles.fallbackBanner}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          <Ionicons name="navigate-outline" size={14} color={COLORS.warning} />
          <Text style={styles.fallbackText}>
            Showing stations near Birmingham (default). Enable location for local results.
          </Text>
          <TouchableOpacity onPress={openSettings}>
            <Text style={styles.settingsLink}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      )}

      {offline && !error && (
        <View
          style={styles.offlineBanner}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          <Ionicons name="cloud-offline-outline" size={14} color={COLORS.danger} />
          <Text style={styles.offlineText}>You\u2019re offline \u2014 showing cached prices.</Text>
        </View>
      )}

      {/* Fuel type filter */}
      <View style={styles.filterRow}>
        {FUEL_TYPES.map(ft => {
          const isActive = selectedFuel === ft.key;
          return (
            <TouchableOpacity
              key={ft.key}
              style={[
                styles.filterBtn,
                isActive && { backgroundColor: ft.color, borderColor: ft.color },
              ]}
              onPress={() => setSelectedFuel(ft.key)}
              accessibilityLabel={`Filter by ${ft.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[
                styles.filterBtnText,
                isActive && { color: COLORS.background },
              ]}>
                {ft.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sort toggle — Nearest / Cheapest, with regional 7-day sparkline */}
      <View style={styles.sortRow}>
        {SORT_MODES.map(sm => {
          const active = sortMode === sm.key;
          return (
            <TouchableOpacity
              key={sm.key}
              style={[
                styles.sortBtn,
                active && styles.sortBtnActive,
              ]}
              onPress={() => { setSortMode(sm.key); lightHaptic(); }}
              accessibilityLabel={`Sort by ${sm.label.toLowerCase()}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Ionicons
                name={sm.icon}
                size={13}
                color={active ? COLORS.background : COLORS.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.sortBtnText, active && styles.sortBtnTextActive]}>
                {sm.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <View style={styles.sortSparkline}>
          <PriceTrajectorySparkline values={sparklineValues} />
        </View>
      </View>

      {/* Brand filter */}
      <BrandFilter selectedBrand={selectedBrand} onSelectBrand={setSelectedBrand} />

      {error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={COLORS.danger} />
          <Text style={styles.errorText}>{toRenderableString(error)}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sortedStations}
          extraData={`${sortMode}-${selectedFuel}-${selectedBrand || ''}`}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item }) => (
            <StationCard
              station={item}
              fuelType={selectedFuel}
              onPress={() => handleStationPress(item)}
              onFlagPrice={FEATURE_FLAGS.priceFlags ? (s) => setFlagTarget(s) : undefined}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
          }
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              {FEATURE_FLAGS.vehicleSettings && userVehicle ? (
                <PersonalisationChip
                  vehicle={userVehicle}
                  onPress={() => navigation.navigate('VehicleSettings')}
                />
              ) : null}
              {FEATURE_FLAGS.vehicleSettings && !userVehicle && !promptDismissed ? (
                <View style={styles.vehiclePromptChip}>
                  <Ionicons name="car-sport-outline" size={14} color={COLORS.accent} />
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => navigation.navigate('VehicleSettings')}
                    accessibilityLabel="Tell us your car for accurate savings"
                    accessibilityRole="button"
                  >
                    <Text style={styles.vehiclePromptText} numberOfLines={2}>
                      Tell us your car for accurate savings
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      await dismissVehiclePrompt();
                      setPromptDismissed(true);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Dismiss"
                  >
                    <Ionicons name="close" size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : null}
              {FEATURE_FLAGS.trajectory && nationalTrajectory ? (
                <View style={styles.trajectoryWrap}>
                  <TrajectoryBadge trajectory={nationalTrajectory} scope="national" size="md" />
                </View>
              ) : null}
              <InstantAnswerHeadline
                loading={loading && !refreshing}
                station={headlineStation}
                fuelType={selectedFuel}
                perTankSavingPence={perTankSavingPence}
                hasVehicle={!!userVehicle}
                nationalAvgPence={nationalAvgPence}
                onPress={handleStationPress}
              />
              <View
                style={[
                  styles.savingsRow,
                  stackSavingsCards && styles.savingsRowStacked,
                ]}
              >
                <MonthlySavingsCard
                  mpg={userVehicle?.mpg}
                  weeklyMiles={userVehicle?.weekly_miles}
                  tankSizeLitres={tankLitres}
                  perTankSavingPence={perTankSavingPence}
                  compact={stackSavingsCards}
                />
                <LifetimeSavingsCard
                  refreshKey={lifetimeRefreshKey}
                  compact={stackSavingsCards}
                />
              </View>
              <BestOptionCard
                bestOption={bestOption}
                bestValue={bestValue}
                bestValueReason={bestValueReason}
                stations={stations}
                fuelType={selectedFuel}
                onPress={handleStationPress}
                selectedReason={selectedReason}
              />
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={COLORS.accent} />
              <Text style={styles.emptyTitle}>No stations found</Text>
              <Text style={styles.emptyText}>No {FUEL_TYPES.find(f => f.key === selectedFuel)?.label} stations found nearby.</Text>
              <Text style={styles.emptySubtext}>Try switching fuel type or searching a different area.</Text>
            </View>
          }
          ListFooterComponent={
            <>
              {updatedInfo ? (
                <Text style={[styles.footerText, updatedInfo.stale && styles.footerStale]}>
                  Prices last checked: {updatedInfo.label}{updatedInfo.stale ? ' (data may be out of date \u2014 pull down to refresh)' : ''}
                </Text>
              ) : null}
              <LiveDataTile
                stationCount={stations?.length || 0}
                lastUpdated={lastUpdated}
              />
            </>
          }
        />
      )}
      <FlagPriceSheet
        visible={!!flagTarget}
        station={flagTarget}
        initialFuelType={selectedFuel}
        onClose={() => setFlagTarget(null)}
      />
      <FirstVehicleCelebration vehicle={userVehicle} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 24 },
  fallbackBanner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.bannerWarning,
  },
  fallbackText: { fontSize: 12, color: COLORS.warning, marginLeft: 6, flex: 1 },
  settingsLink: { fontSize: 12, color: COLORS.accent, fontWeight: '600', textDecorationLine: 'underline' },
  offlineBanner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.bannerDanger,
  },
  offlineText: { fontSize: 12, color: COLORS.danger, marginLeft: 6 },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: COLORS.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  filterBtn: {
    flex: 1, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
    borderColor: COLORS.border, alignItems: 'center', marginHorizontal: 3,
  },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  sortBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  sortBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  sortBtnTextActive: { color: COLORS.background },
  list: { paddingBottom: 12 },
  errorText: { fontSize: 14, color: COLORS.danger, textAlign: 'center', marginTop: 12, marginBottom: 16 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: COLORS.accent, borderRadius: 8 },
  retryBtnText: { color: COLORS.background, fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: COLORS.accent, marginTop: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6 },
  emptySubtext: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 6 },
  footerText: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 16 },
  footerStale: { color: COLORS.warning },
  vehiclePromptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  vehiclePromptText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
  trajectoryWrap: {
    marginHorizontal: 12,
    marginTop: 8,
    flexDirection: 'row',
  },
  sortSparkline: {
    marginLeft: 'auto',
    paddingRight: 4,
    justifyContent: 'center',
  },
  savingsRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    gap: 10,
  },
  savingsRowStacked: {
    flexDirection: 'column',
  },
});

export default HomeScreen;
