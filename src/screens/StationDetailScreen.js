import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Linking,
  Platform,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { getPriceHistory, createAlert, getPricesByStation } from '../api/fuelApi';
import FacilitiesPills from '../components/FacilitiesPills';
import PriceHistoryChart from '../components/PriceHistoryChart';
import ReportPriceButton from '../components/ReportPriceButton';
import { NetworkErrorState } from '../components/TrustStates';
import { FEATURES } from '../lib/featureFlags';
import { getFreshness, FRESHNESS_COLOR, formatSource } from '../lib/trust';
import { worthTheDrive } from '../lib/smartDecision';
import { lightHaptic, mediumHaptic, successHaptic } from '../lib/haptics';
import { COLORS as THEME_COLORS, FUEL_COLORS as THEME_FUEL_COLORS } from '../lib/theme';
import { ensurePushPermission } from '../lib/pushPermission';
import { brandToString, safeText } from '../lib/brand';

// ─── Constants ────────────────────────────────────────────────────────────────

// Alias that preserves the original field names used throughout this file.
const COLORS = {
  background: THEME_COLORS.background,
  surface: THEME_COLORS.surface,
  card: THEME_COLORS.card,
  text: THEME_COLORS.text,
  accent: THEME_COLORS.accent,
  border: THEME_COLORS.borderSubtle,
  muted: THEME_COLORS.textSecondary,
  danger: THEME_COLORS.error,
};

// Fuel display config — drives which rows render in the fuel section and the
// alert modal. Only rows with a non-null price for the station are shown.
// Field mapping per spec:
//   E10        → e10_price             (Unleaded E10)
//   E5         → petrol_price          (Super Unleaded E5)
//   B7         → diesel_price          (Diesel)
//   B7_PREMIUM → premium_diesel_price  (Premium Diesel)
const FUEL_DISPLAY = [
  { key: 'e10', field: 'e10_price', sourceField: 'e10_source', label: 'Unleaded (E10)', color: THEME_FUEL_COLORS.e10 },
  { key: 'petrol', field: 'petrol_price', sourceField: 'petrol_source', label: 'Super Unleaded (E5)', color: THEME_FUEL_COLORS.super_unleaded },
  { key: 'diesel', field: 'diesel_price', sourceField: 'diesel_source', label: 'Diesel', color: THEME_FUEL_COLORS.diesel },
  { key: 'premiumDiesel', field: 'premium_diesel_price', sourceField: 'premium_diesel_source', label: 'Premium Diesel', color: THEME_FUEL_COLORS.premium_diesel },
];

const FUEL_LABELS = FUEL_DISPLAY.reduce((acc, f) => { acc[f.key] = f.label; return acc; }, {});
const FUEL_COLORS = FUEL_DISPLAY.reduce((acc, f) => { acc[f.key] = f.color; return acc; }, {});

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_SHORT = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

const FAVOURITES_KEY = 'user_favourites';

// Verdict colours for "Worth the Drive?" card
const VERDICT_COLORS = {
  save: THEME_COLORS.accent,
  lose: THEME_COLORS.error,
  break_even: THEME_COLORS.warning,
  unknown: THEME_COLORS.textSecondary,
};

const VERDICT_ICONS = {
  save: 'cash-outline',
  lose: 'close-circle-outline',
  break_even: 'remove-circle-outline',
  unknown: 'help-circle-outline',
};

/**
 * WorthTheDriveCard — renders the smart-decision card.
 * Only mounted when FEATURES.smartDecisions is true.
 */
function WorthTheDriveCard({ basePpl, altPpl, extraMiles }) {
  const result = worthTheDrive({ basePpl, altPpl, extraMiles });
  if (!result) return null;
  const { verdict, summary, netPence } = result;
  const color = VERDICT_COLORS[verdict] || VERDICT_COLORS.unknown;
  const icon = VERDICT_ICONS[verdict] || VERDICT_ICONS.unknown;
  const savingsLabel =
    netPence !== null
      ? `${netPence >= 0 ? '+' : ''}${(netPence / 100).toFixed(2)} on a 40L fill`
      : null;

  return (
    <View style={[styles.worthCard, { borderColor: color }]}>
      <View style={styles.worthHeader}>
        <Ionicons name={icon} size={20} color={color} style={{ marginRight: 8 }} />
        <Text style={[styles.worthTitle, { color }]}>Worth the Drive?</Text>
      </View>
      <Text style={styles.worthSummary}>{summary}</Text>
      {savingsLabel ? (
        <Text style={[styles.worthSavings, { color }]}>{savingsLabel}</Text>
      ) : null}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDirectionsUrl(station) {
  const destination = encodeURIComponent(station.address || station.name || '');
  if (Platform.OS === 'ios') {
    return `maps://?daddr=${destination}`;
  }
  if (Platform.OS === 'android') {
    return `google.navigation:q=${destination}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

async function openDirections(station) {
  const nativeUrl = getDirectionsUrl(station);
  const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(station.address || station.name || '')}`;

  const canOpen = await Linking.canOpenURL(nativeUrl).catch(() => false);
  if (canOpen) {
    await Linking.openURL(nativeUrl);
  } else {
    await Linking.openURL(fallbackUrl);
  }
}

function dayLabel(day) {
  if (!day) return '';
  if (day.is_24_hours) return '24 Hours';
  if (day.closed) return 'Closed';
  if (day.open && day.close) return `${day.open} - ${day.close}`;
  return '';
}

function sameDay(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    !!a.is_24_hours === !!b.is_24_hours &&
    !!a.closed === !!b.closed &&
    (a.open || '') === (b.open || '') &&
    (a.close || '') === (b.close || '')
  );
}

function groupOpeningHours(usualDays) {
  if (!usualDays || typeof usualDays !== 'object') return [];
  const groups = [];
  for (const key of DAY_ORDER) {
    const day = usualDays[key];
    const label = dayLabel(day);
    if (!label) continue;
    const last = groups[groups.length - 1];
    if (last && sameDay(last.day, day)) {
      last.end = key;
    } else {
      groups.push({ start: key, end: key, day, label });
    }
  }
  return groups.map((g) => ({
    range: g.start === g.end ? DAY_SHORT[g.start] : `${DAY_SHORT[g.start]}-${DAY_SHORT[g.end]}`,
    label: g.label,
  }));
}

function todayKey() {
  // JS Date: Sunday=0 ... Saturday=6. DAY_ORDER starts on Monday.
  const js = new Date().getDay();
  return DAY_ORDER[(js + 6) % 7];
}

function parseHHMM(s) {
  if (!s || typeof s !== 'string') return null;
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (isNaN(h) || isNaN(mm)) return null;
  return h * 60 + mm;
}

function todayStatus(usualDays) {
  if (!usualDays) return null;
  const key = todayKey();
  const today = usualDays[key];
  if (!today) return null;
  if (today.is_24_hours) {
    return { open: true, text: 'Open now · 24 Hours' };
  }
  const now = new Date();
  const minsNow = now.getHours() * 60 + now.getMinutes();
  const open = parseHHMM(today.open);
  const close = parseHHMM(today.close);
  if (open == null || close == null) return null;
  const isOpen = minsNow >= open && minsNow < close;
  if (isOpen) return { open: true, text: `Open now · Closes ${today.close}` };
  return { open: false, text: `Closed · Opens ${today.open}` };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StationDetailScreen({ route }) {
  const { station } = route.params;

  const [history, setHistory] = useState({});
  const [livePrices, setLivePrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [isFavourite, setIsFavourite] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;

  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertFuelType, setAlertFuelType] = useState('petrol');
  const [alertThreshold, setAlertThreshold] = useState('');
  const [alertSaving, setAlertSaving] = useState(false);
  const [deviceToken, setDeviceToken] = useState(null);

  // ─── Request push permission and obtain Expo push token ─────────────────────
  // ensurePushPermission shows an explanatory pre-prompt when the OS
  // permission state is "undetermined"; it's a no-op dialog-wise if the
  // user has already granted or denied.
  useEffect(() => {
    if (!FEATURES.priceAlerts) return;
    (async () => {
      try {
        const finalStatus = await ensurePushPermission();
        if (finalStatus !== 'granted') return;
        const tokenData = await Notifications.getExpoPushTokenAsync();
        setDeviceToken(tokenData.data);
      } catch (err) {
        // Non-fatal — alerts just can't be created without a token
      }
    })();
  }, []);

  // ─── Load favourite state on mount ──────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(FAVOURITES_KEY);
        const saved = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(saved)) { setIsFavourite(false); return; }
        setIsFavourite(
          saved.some((s) => (typeof s === 'object' ? s?.id === station.id : s === station.id))
        );
      } catch {
        // Non-critical — default to not favourited
      }
    })();
  }, [station.id]);

  // ─── Toggle favourite with bounce animation ──────────────────────────────────

  const toggleFavourite = async () => {
    const next = !isFavourite;
    setIsFavourite(next);
    mediumHaptic();

    // Scale bounce
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.4, duration: 120, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    try {
      const raw = await AsyncStorage.getItem(FAVOURITES_KEY);
      const saved = raw ? JSON.parse(raw) : [];
      // Normalise: strip legacy ID-only entries; keep only objects.
      const normalised = Array.isArray(saved)
        ? saved.filter((s) => s && typeof s === 'object' && s.id != null)
        : [];
      const stationSnapshot = {
        id: station.id,
        name: safeText(station.name),
        brand: brandToString(station.brand),
        address: safeText(station.address),
        postcode: safeText(station.postcode),
        petrol_price: station.petrol_price,
        diesel_price: station.diesel_price,
        e10_price: station.e10_price,
        super_unleaded_price: station.super_unleaded_price,
        premium_diesel_price: station.premium_diesel_price,
        distance_km: station.distance_km,
        last_updated: station.last_updated,
        prices: station.prices || {
          petrol: station.petrol_price ?? null,
          diesel: station.diesel_price ?? null,
          e10: station.e10_price ?? null,
          super_unleaded: station.super_unleaded_price ?? null,
          premium_diesel: station.premium_diesel_price ?? null,
        },
      };
      const withoutCurrent = normalised.filter((s) => s.id !== station.id);
      const updated = next ? [...withoutCurrent, stationSnapshot] : withoutCurrent;
      await AsyncStorage.setItem(FAVOURITES_KEY, JSON.stringify(updated));
    } catch {
      // Revert optimistic update on storage failure
      setIsFavourite(!next);
    }
  };

  // ─── Data loading ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [historyData, currentPrices] = await Promise.all([
        getPriceHistory(station.id),
        getPricesByStation(station.id),
      ]);

      setHistory(historyData);

      const safePrices = Array.isArray(currentPrices)
        ? currentPrices
        : Array.isArray(currentPrices?.prices)
          ? currentPrices.prices
          : [];
      setLivePrices(safePrices);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [station.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData().then(lightHaptic);
  };

  // ─── Alert modal ─────────────────────────────────────────────────────────────

  const openAlertModal = (fuelType) => {
    if (!FEATURES.priceAlerts) return;
    setAlertFuelType(fuelType);
    setAlertThreshold('');
    setAlertModalVisible(true);
  };

  const handleSaveAlert = async () => {
    const threshold = parseFloat(alertThreshold);
    if (isNaN(threshold) || threshold <= 0) {
      Alert.alert('Invalid price', 'Please enter a valid price threshold (e.g. 149.9)');
      return;
    }
    if (!deviceToken) {
      Alert.alert(
        'Notifications required',
        'Please enable push notifications to set price alerts.'
      );
      return;
    }
    setAlertSaving(true);
    try {
      await createAlert({
        station_id: station.id,
        fuel_type: alertFuelType,
        threshold_pence: threshold,
        device_token: deviceToken,
        platform: Platform.OS,
      });
      setAlertModalVisible(false);
      successHaptic();
      Alert.alert(
        'Alert set!',
        `You'll be notified when ${FUEL_LABELS[alertFuelType]} drops below ${threshold}p at this station.`
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to save alert. Please try again.');
    } finally {
      setAlertSaving(false);
    }
  };

  // ─── Render fuel price card ───────────────────────────────────────────────────

  const renderPriceRow = (fuelMeta) => {
    const { key: fuelType, field, sourceField, label, color } = fuelMeta;
    const stationPrice = station?.[field];
    const entries = history[fuelType] || [];
    const live = (Array.isArray(livePrices) ? livePrices : []).find(
      (p) => p.fuel_type === fuelType
    );

    // Trust line: prefer live price timestamp, fall back to history entry or station
    const trustTimestamp =
      live?.updated_at ||
      live?.recorded_at ||
      entries[0]?.recorded_at ||
      station?.last_updated ||
      null;
    const trustSource =
      live?.source ||
      entries[0]?.source ||
      station?.[sourceField] ||
      station?.source ||
      null;

    const freshness = getFreshness(trustTimestamp);
    const freshnessColor = FRESHNESS_COLOR[freshness.tier] || COLORS.muted;
    const sourceLabel = formatSource(trustSource);
    const trustLine = `${freshness.label} · ${sourceLabel}`;

    return (
      <View key={fuelType} style={styles.fuelCard}>
        <View style={styles.fuelHeader}>
          <View style={[styles.fuelDot, { backgroundColor: color }]} />
          <Text style={styles.fuelLabel}>{label}</Text>

          {live ? (
            <View style={styles.priceContainer}>
              <Text style={[styles.fuelPrice, { color }]}>
                {live.price_pence}p
              </Text>
              <Text style={styles.liveTag}>LIVE</Text>
            </View>
          ) : stationPrice != null ? (
            <Text style={[styles.fuelPrice, { color }]}>
              {stationPrice}p
            </Text>
          ) : entries[0] ? (
            <Text style={[styles.fuelPrice, { color: COLORS.muted }]}>
              {entries[0].price_ppl}p
            </Text>
          ) : (
            <Text style={styles.noData}>No data</Text>
          )}

          {FEATURES.priceAlerts && (
            <TouchableOpacity
              style={styles.alertBtn}
              onPress={() => openAlertModal(fuelType)}
            >
              <Ionicons name="notifications-outline" size={18} color={COLORS.accent} />
            </TouchableOpacity>
          )}
        </View>

        {/* Trust line */}
        <Text style={[styles.trustLine, { color: freshnessColor }]}>{trustLine}</Text>

        {FEATURES.priceHistoryCharts && (
          <View style={styles.chartWrap}>
            <Text style={styles.historyHeader}>30-Day Price History</Text>
            <PriceHistoryChart entries={entries} color={color} height={180} />
          </View>
        )}
      </View>
    );
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <NetworkErrorState onRetry={() => { setLoading(true); loadData(); }} />
      </SafeAreaView>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────────

  const availableFuels = FUEL_DISPLAY.filter((f) => station?.[f.field] != null);
  const fuelsToRender = availableFuels.length > 0 ? availableFuels : FUEL_DISPLAY;

  const usualDays = station?.opening_hours?.usual_days || null;
  const hoursGroups = groupOpeningHours(usualDays);
  const hoursStatus = todayStatus(usualDays);

  const baseFacilities = Array.isArray(station?.facilities)
    ? station.facilities
    : Array.isArray(station?.amenities)
      ? station.amenities
      : [];
  const combinedFacilities = [...baseFacilities];
  if (station?.is_motorway) combinedFacilities.push('Motorway');
  if (station?.is_supermarket) combinedFacilities.push('Supermarket');
  if (
    usualDays &&
    DAY_ORDER.every((d) => usualDays[d]?.is_24_hours)
  ) {
    combinedFacilities.push('24h');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* Closure banners */}
        {station?.permanent_closure ? (
          <View style={styles.closureBanner}>
            <Ionicons name="close-circle" size={18} color={THEME_COLORS.white} style={{ marginRight: 8 }} />
            <Text style={styles.closureText}>Permanently Closed</Text>
          </View>
        ) : station?.temporary_closure ? (
          <View style={styles.closureBanner}>
            <Ionicons name="warning" size={18} color={THEME_COLORS.white} style={{ marginRight: 8 }} />
            <Text style={styles.closureText}>Temporarily Closed</Text>
          </View>
        ) : null}

        {/* Station header */}
        <View style={styles.stationHeader}>
          <View style={styles.stationTitleRow}>
            <View style={styles.stationTitleText}>
              <Text style={styles.stationName}>{safeText(station.name) || 'Station'}</Text>
              <Text style={styles.stationAddress}>{safeText(station.address)}</Text>
              {brandToString(station.brand) ? (
                <Text style={styles.stationBrand}>{brandToString(station.brand)}</Text>
              ) : null}
            </View>

            {/* Favourite heart button */}
            <TouchableOpacity
              onPress={toggleFavourite}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.heartBtn}
              accessibilityLabel={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
              accessibilityRole="button"
              accessibilityState={{ checked: isFavourite }}
            >
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons
                  name={isFavourite ? 'heart' : 'heart-outline'}
                  size={26}
                  color={isFavourite ? COLORS.danger : COLORS.muted}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Get Directions button */}
        <View style={styles.directionsRow}>
          <TouchableOpacity
            style={styles.directionsBtn}
            onPress={() => openDirections(station)}
            activeOpacity={0.82}
            accessibilityLabel={`Get directions to ${station.name || brandToString(station.brand) || 'this station'}`}
            accessibilityRole="link"
          >
            <Ionicons name="navigate-outline" size={18} color={THEME_COLORS.white} style={styles.directionsIcon} />
            <Text style={styles.directionsBtnText}>Get Directions</Text>
          </TouchableOpacity>
        </View>

        {/* Prices & Trends */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prices & Trends</Text>
          {fuelsToRender.map(renderPriceRow)}
        </View>

        {/* Opening Hours */}
        {hoursGroups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Opening Hours</Text>
            <View style={styles.hoursCard}>
              {hoursStatus && (
                <Text
                  style={[
                    styles.hoursStatus,
                    { color: hoursStatus.open ? COLORS.accent : COLORS.danger },
                  ]}
                >
                  {hoursStatus.text}
                </Text>
              )}
              {hoursGroups.map((g, i) => (
                <View key={i} style={styles.hoursRow}>
                  <Text style={styles.hoursDay}>{g.range}</Text>
                  <Text style={styles.hoursValue}>{g.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Facilities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Facilities</Text>
          <FacilitiesPills facilities={combinedFacilities} />
        </View>

        {/* Worth the Drive? — gated behind feature flag */}
        {FEATURES.smartDecisions && (
          <View style={styles.section}>
            <WorthTheDriveCard
              basePpl={station.nearestPrice || station.petrol_price}
              altPpl={station.prices?.petrol || station.petrol_price}
              extraMiles={station.distance_km ? station.distance_km * 0.621371 : null}
            />
          </View>
        )}

        {/* Report price */}
        <View style={styles.section}>
          <ReportPriceButton
            onPress={() =>
              FEATURES.priceReports &&
              Alert.alert('Report a price', 'Price reporting coming soon!')
            }
            disabled={!FEATURES.priceReports}
            label="Report a price"
          />
        </View>
      </ScrollView>

      {/* Price alert modal — only rendered when feature is enabled */}
      <Modal
        visible={alertModalVisible && FEATURES.priceAlerts}
        transparent
        animationType="slide"
        onRequestClose={() => setAlertModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Price Alert</Text>
            <Text style={styles.modalSubtitle}>
              Notify me when {FUEL_LABELS[alertFuelType]} drops below:
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.priceInput}
                placeholder="e.g. 149.9"
                placeholderTextColor={COLORS.muted}
                keyboardType="decimal-pad"
                value={alertThreshold}
                onChangeText={setAlertThreshold}
              />
              <Text style={styles.pplLabel}>p/litre</Text>
            </View>
            <View style={styles.fuelTypeRow}>
              {fuelsToRender.map((f) => {
                const isActive = alertFuelType === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[
                      styles.fuelTypeBtn,
                      isActive && { backgroundColor: f.color },
                    ]}
                    onPress={() => setAlertFuelType(f.key)}
                    accessibilityLabel={`Filter by ${f.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                  >
                    <Text
                      style={[
                        styles.fuelTypeBtnText,
                        isActive && { color: COLORS.background },
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAlertModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveAlert}
                disabled={alertSaving}
              >
                {alertSaving ? (
                  <ActivityIndicator color={COLORS.background} size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Alert</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },

  // Station header
  stationHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stationTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stationTitleText: { flex: 1 },
  stationName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  stationAddress: { fontSize: 14, color: COLORS.muted, marginBottom: 2 },
  stationBrand: { fontSize: 13, color: COLORS.accent, marginTop: 4 },
  heartBtn: { paddingLeft: 12, paddingTop: 2 },

  // Directions button
  directionsRow: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  directionsIcon: { marginRight: 8 },
  directionsBtnText: {
    color: THEME_COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },

  // Section
  section: { padding: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },

  // Fuel card
  fuelCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  fuelHeader: { flexDirection: 'row', alignItems: 'center' },
  fuelDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  fuelLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  priceContainer: { alignItems: 'flex-end', marginRight: 10 },
  fuelPrice: { fontSize: 18, fontWeight: '700' },
  liveTag: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.accent,
    marginTop: -2,
  },
  noData: { fontSize: 13, color: COLORS.muted, marginRight: 10 },
  alertBtn: {
    padding: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  // Trust line
  trustLine: {
    fontSize: 11,
    marginTop: 6,
    marginLeft: 18,
  },

  // History
  chartWrap: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    paddingTop: 10,
  },
  historyList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    paddingTop: 10,
  },
  historyHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.muted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyDate: { fontSize: 12, color: COLORS.muted },
  historyPrice: { fontSize: 12, color: THEME_COLORS.textSecondary },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: THEME_COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  modalSubtitle: { fontSize: 14, color: COLORS.muted, marginBottom: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  priceInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    marginRight: 8,
  },
  pplLabel: { fontSize: 14, color: COLORS.muted },
  fuelTypeRow: { flexDirection: 'row', marginBottom: 20 },
  fuelTypeBtn: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    alignItems: 'center',
    marginRight: 6,
  },
  fuelTypeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  modalActions: { flexDirection: 'row' },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME_COLORS.border,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelBtnText: { color: COLORS.muted, fontWeight: '600' },
  saveBtn: {
    flex: 2,
    padding: 14,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  saveBtnText: {
    color: COLORS.background,
    fontWeight: '700',
    fontSize: 15,
  },

  // Closure banner
  closureBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  closureText: {
    color: THEME_COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },

  // Opening hours
  hoursCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
  },
  hoursStatus: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hoursDay: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  hoursValue: { fontSize: 13, color: COLORS.text },

  // Worth the Drive card
  worthCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    backgroundColor: COLORS.surface,
  },
  worthHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  worthTitle: { fontSize: 15, fontWeight: '700' },
  worthSummary: { fontSize: 13, color: COLORS.muted, lineHeight: 18 },
  worthSavings: { fontSize: 12, fontWeight: '600', marginTop: 6 },
});
