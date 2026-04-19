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
import { getPriceHistory, createAlert, getPricesByStation } from '../api/fuelApi';
import FacilitiesPills from '../components/FacilitiesPills';
import ReportPriceButton from '../components/ReportPriceButton';
import { NetworkErrorState } from '../components/TrustStates';
import { FEATURES } from '../lib/featureFlags';
import { getFreshness, FRESHNESS_COLOR, formatSource } from '../lib/trust';
import { worthTheDrive } from '../lib/smartDecision';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = {
  background: '#0D1117',
  surface: '#161B22',
  card: '#1C2128',
  text: '#E6EDF3',
  accent: '#2ECC71',
  border: '#21262D',
  muted: '#8B949E',
  danger: '#E74C3C',
};

const FUEL_TYPES = ['petrol', 'diesel', 'e10'];

const FUEL_LABELS = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  e10: 'E10',
};

const FUEL_COLORS = {
  petrol: '#2ECC71',
  diesel: '#3498DB',
  e10: '#F39C12',
  superUnleaded: '#9B59B6',
  premiumDiesel: '#E74C3C',
};

const FAVOURITES_KEY = 'user_favourites';

// Verdict colours for "Worth the Drive?" card
const VERDICT_COLORS = {
  save: '#2ECC71',
  lose: '#E74C3C',
  break_even: '#F39C12',
  unknown: '#8B949E',
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

  // ─── Load favourite state on mount ──────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(FAVOURITES_KEY);
        const saved = raw ? JSON.parse(raw) : [];
        setIsFavourite(Array.isArray(saved) && saved.includes(station.id));
      } catch {
        // Non-critical — default to not favourited
      }
    })();
  }, [station.id]);

  // ─── Toggle favourite with bounce animation ──────────────────────────────────

  const toggleFavourite = async () => {
    const next = !isFavourite;
    setIsFavourite(next);

    // Scale bounce
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.4, duration: 120, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    try {
      const raw = await AsyncStorage.getItem(FAVOURITES_KEY);
      const saved = raw ? JSON.parse(raw) : [];
      const updated = next
        ? [...new Set([...saved, station.id])]
        : saved.filter((id) => id !== station.id);
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
    loadData();
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
    setAlertSaving(true);
    try {
      await createAlert({
        station_id: station.id,
        fuel_type: alertFuelType,
        threshold_pence: threshold,
      });
      setAlertModalVisible(false);
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

  const renderPriceRow = (fuelType) => {
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
      live?.source || entries[0]?.source || station?.source || null;

    const freshness = getFreshness(trustTimestamp);
    const freshnessColor = FRESHNESS_COLOR[freshness.tier] || COLORS.muted;
    const sourceLabel = formatSource(trustSource);
    const trustLine = `${freshness.label} · ${sourceLabel}`;

    return (
      <View key={fuelType} style={styles.fuelCard}>
        <View style={styles.fuelHeader}>
          <View style={[styles.fuelDot, { backgroundColor: FUEL_COLORS[fuelType] }]} />
          <Text style={styles.fuelLabel}>{FUEL_LABELS[fuelType]}</Text>

          {live ? (
            <View style={styles.priceContainer}>
              <Text style={[styles.fuelPrice, { color: FUEL_COLORS[fuelType] }]}>
                {live.price_pence}p
              </Text>
              <Text style={styles.liveTag}>LIVE</Text>
            </View>
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

        {entries.length > 0 && (
          <View style={styles.historyList}>
            <Text style={styles.historyHeader}>Price History</Text>
            {entries.slice(0, 5).map((entry, i) => (
              <View key={i} style={styles.historyRow}>
                <Text style={styles.historyDate}>
                  {new Date(entry.recorded_at).toLocaleDateString()}
                </Text>
                <Text style={styles.historyPrice}>{entry.price_ppl}p</Text>
              </View>
            ))}
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* Station header */}
        <View style={styles.stationHeader}>
          <View style={styles.stationTitleRow}>
            <View style={styles.stationTitleText}>
              <Text style={styles.stationName}>{station.name}</Text>
              <Text style={styles.stationAddress}>{station.address}</Text>
              {station.brand && (
                <Text style={styles.stationBrand}>{station.brand}</Text>
              )}
            </View>

            {/* Favourite heart button */}
            <TouchableOpacity
              onPress={toggleFavourite}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.heartBtn}
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
          >
            <Ionicons name="navigate-outline" size={18} color="#ffffff" style={styles.directionsIcon} />
            <Text style={styles.directionsBtnText}>Get Directions</Text>
          </TouchableOpacity>
        </View>

        {/* Prices & Trends */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prices & Trends</Text>
          {FUEL_TYPES.map(renderPriceRow)}
        </View>

        {/* Facilities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Facilities</Text>
          <FacilitiesPills facilities={station.facilities || station.amenities || []} />
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
              {FUEL_TYPES.map((ft) => (
                <TouchableOpacity
                  key={ft}
                  style={[
                    styles.fuelTypeBtn,
                    alertFuelType === ft && { backgroundColor: FUEL_COLORS[ft] },
                  ]}
                  onPress={() => setAlertFuelType(ft)}
                >
                  <Text
                    style={[
                      styles.fuelTypeBtnText,
                      alertFuelType === ft && { color: COLORS.background },
                    ]}
                  >
                    {FUEL_LABELS[ft]}
                  </Text>
                </TouchableOpacity>
              ))}
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
    color: '#ffffff',
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
  historyPrice: { fontSize: 12, color: '#aaa' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
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
    borderColor: '#333',
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
    borderColor: '#333',
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
