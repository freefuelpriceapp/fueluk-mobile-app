/**
 * TripCalculatorScreen.js — Sprint 2
 *
 * Calculate the fuel cost of a trip between two UK postcodes.
 * - UK reg-plate lookup (DVLA/MOT via backend)
 * - Manual MPG override
 * - Origin = postcode OR current location (via expo-location)
 * - Destination = postcode
 * - Haversine-based distance via backend trip endpoint
 * - Shows total cost, distance, fuel needed, CO2, per-passenger split
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { lookupVehicle, calculateTrip } from '../api/fuelApi';
import { COLORS as THEME_COLORS } from '../lib/theme';

// Local alias preserves the short field names used throughout this file.
const COLORS = {
  background:  THEME_COLORS.background,
  surface:     THEME_COLORS.surface,
  card:        THEME_COLORS.card,
  text:        THEME_COLORS.text,
  accent:      THEME_COLORS.accent,
  border:      THEME_COLORS.borderSubtle,
  muted:       THEME_COLORS.textSecondary,
  danger:      THEME_COLORS.error,
  plateYellow: THEME_COLORS.plateYellow,
  plateText:   THEME_COLORS.plateText,
};

// Postcodes.io — free UK postcode → lat/lon geocoding (no auth required)
const POSTCODES_IO = 'https://api.postcodes.io/postcodes';

/**
 * Resolve a UK postcode to coordinates via postcodes.io.
 * Returns { lat, lon } or throws.
 */
async function geocodePostcode(pc) {
  const cleaned = String(pc || '').trim();
  if (!cleaned) throw new Error('Please enter a postcode.');
  const resp = await fetch(`${POSTCODES_IO}/${encodeURIComponent(cleaned)}`);
  if (!resp.ok) throw new Error(`Unknown postcode: ${cleaned.toUpperCase()}`);
  const json = await resp.json();
  if (!json?.result) throw new Error(`Unknown postcode: ${cleaned.toUpperCase()}`);
  return { lat: json.result.latitude, lon: json.result.longitude };
}

export default function TripCalculatorScreen() {
  // Reg plate + vehicle
  const [regInput, setRegInput] = useState('');
  const [vehicle, setVehicle] = useState(null);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [mpgOverride, setMpgOverride] = useState('');

  // Journey
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [originPostcode, setOriginPostcode] = useState('');
  const [destPostcode, setDestPostcode] = useState('');

  // Result
  const [result, setResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const effectiveMpg = () => {
    const override = parseFloat(mpgOverride);
    if (!isNaN(override) && override > 0) return override;
    if (vehicle?.estimated_mpg) return Number(vehicle.estimated_mpg);
    return 40; // sensible default fallback for UK petrol cars
  };

  const effectiveFuelType = () => vehicle?.fuel_type || 'petrol';

  const handleLookup = async () => {
    const cleaned = regInput.replace(/\s+/g, '').toUpperCase();
    if (cleaned.length < 2) {
      Alert.alert('Invalid plate', 'Please enter a valid UK reg plate.');
      return;
    }
    setVehicleLoading(true);
    try {
      const data = await lookupVehicle(cleaned);
      setVehicle(data);
    } catch (err) {
      Alert.alert(
        'Vehicle not found',
        err?.response?.data?.error || err?.message || 'Could not look up this plate.'
      );
    } finally {
      setVehicleLoading(false);
    }
  };

  const getOriginCoords = async () => {
    if (useCurrentLocation) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission denied.');
      const pos = await Location.getCurrentPositionAsync({});
      return { lat: pos.coords.latitude, lon: pos.coords.longitude };
    }
    return geocodePostcode(originPostcode);
  };

  const handleCalculate = async () => {
    if (!useCurrentLocation && !originPostcode.trim()) {
      Alert.alert('Origin needed', 'Enter a start postcode or use current location.');
      return;
    }
    if (!destPostcode.trim()) {
      Alert.alert('Destination needed', 'Enter a destination postcode.');
      return;
    }
    setCalcLoading(true);
    setResult(null);
    try {
      const [origin, dest] = await Promise.all([
        getOriginCoords(),
        geocodePostcode(destPostcode),
      ]);
      const data = await calculateTrip({
        origin_lat: origin.lat,
        origin_lon: origin.lon,
        destination_lat: dest.lat,
        destination_lon: dest.lon,
        vehicle_mpg: effectiveMpg(),
        fuel_type: effectiveFuelType(),
      });
      setResult(data);
    } catch (err) {
      Alert.alert(
        'Calculation failed',
        err?.response?.data?.error || err?.message || 'Could not calculate trip cost.'
      );
    } finally {
      setCalcLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>Trip Cost Calculator</Text>
          <Text style={styles.subheading}>
            Enter your reg plate and journey postcodes to estimate fuel cost.
          </Text>

          {/* ─── Reg plate section ──────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>Your Vehicle</Text>
          <View style={styles.plateRow}>
            <View style={styles.plateWrap}>
              <TextInput
                value={regInput}
                onChangeText={(t) => setRegInput(t.toUpperCase())}
                placeholder="AB12 CDE"
                placeholderTextColor={THEME_COLORS.placeholderMuted}
                maxLength={8}
                autoCapitalize="characters"
                autoCorrect={false}
                style={styles.plateInput}
              />
            </View>
            <TouchableOpacity
              style={styles.lookupBtn}
              onPress={handleLookup}
              disabled={vehicleLoading}
              activeOpacity={0.8}
            >
              {vehicleLoading ? (
                <ActivityIndicator color={COLORS.background} size="small" />
              ) : (
                <Text style={styles.lookupBtnText}>Look up</Text>
              )}
            </TouchableOpacity>
          </View>

          {vehicle && (
            <View style={styles.vehicleCard}>
              <View style={styles.vehicleRow}>
                <Ionicons name="car-sport-outline" size={22} color={COLORS.accent} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.vehicleTitle}>
                    {vehicle.make || 'Unknown'} {vehicle.model || ''}
                  </Text>
                  <Text style={styles.vehicleSub}>
                    {vehicle.fuel_type || '—'} · {vehicle.year || '—'}
                    {vehicle.estimated_mpg ? `  ·  ${vehicle.estimated_mpg} mpg` : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.mpgOverrideRow}>
                <Text style={styles.mpgLabel}>Override MPG</Text>
                <TextInput
                  style={styles.mpgInput}
                  value={mpgOverride}
                  onChangeText={setMpgOverride}
                  keyboardType="decimal-pad"
                  placeholder={String(vehicle.estimated_mpg || '40')}
                  placeholderTextColor={COLORS.muted}
                />
              </View>
            </View>
          )}

          {/* ─── Journey section ────────────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>Journey</Text>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>From</Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Use current location</Text>
                <Switch
                  value={useCurrentLocation}
                  onValueChange={setUseCurrentLocation}
                  trackColor={{ false: THEME_COLORS.inputBorderDark, true: COLORS.accent }}
                  thumbColor={THEME_COLORS.white}
                />
              </View>
            </View>
            {!useCurrentLocation && (
              <TextInput
                style={styles.input}
                value={originPostcode}
                onChangeText={setOriginPostcode}
                placeholder="Start postcode (e.g. SW1A 1AA)"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="characters"
              />
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>To</Text>
            <TextInput
              style={styles.input}
              value={destPostcode}
              onChangeText={setDestPostcode}
              placeholder="Destination postcode"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity
            style={styles.calcBtn}
            onPress={handleCalculate}
            disabled={calcLoading}
            activeOpacity={0.85}
          >
            {calcLoading ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <>
                <Ionicons name="calculator-outline" size={18} color={COLORS.background} />
                <Text style={styles.calcBtnText}>Calculate Trip Cost</Text>
              </>
            )}
          </TouchableOpacity>

          {/* ─── Results ─────────────────────────────────────────────────────── */}
          {result && <ResultCard result={result} />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// ResultCard — pulled out for readability
// ───────────────────────────────────────────────────────────────────────────────
function ResultCard({ result }) {
  const cost = result.estimated_cost || `£${Number(result.total_cost || 0).toFixed(2)}`;
  const split = result.cost_per_passenger || {};
  const cheapest = result.cheapest_station || null;

  return (
    <View style={styles.resultSection}>
      <View style={styles.costCard}>
        <Text style={styles.costLabel}>Estimated Cost</Text>
        <Text style={styles.costBig}>{cost}</Text>
        <View style={styles.statsRow}>
          <Stat
            icon="speedometer-outline"
            label="Distance"
            value={`${Number(result.distance_miles || 0).toFixed(1)} mi`}
          />
          <Stat
            icon="water-outline"
            label="Fuel needed"
            value={`${Number(result.fuel_needed_litres || 0).toFixed(1)} L`}
          />
        </View>
        {result.co2_kg != null && (
          <View style={styles.co2Badge}>
            <Ionicons name="leaf-outline" size={14} color={COLORS.accent} />
            <Text style={styles.co2Text}>
              {Number(result.co2_kg).toFixed(1)} kg CO₂
            </Text>
          </View>
        )}
      </View>

      {cheapest && (
        <View style={styles.cheapestCard}>
          <Ionicons name="trending-down-outline" size={18} color={COLORS.accent} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.cheapestLabel}>Cheapest on route</Text>
            <Text style={styles.cheapestName}>{cheapest.name || '—'}</Text>
          </View>
          <Text style={styles.cheapestPrice}>
            {Number(cheapest.price || 0).toFixed(1)}p
          </Text>
        </View>
      )}

      {(split['2'] || split['3'] || split['4']) && (
        <>
          <Text style={styles.sectionTitle}>Split between passengers</Text>
          <View style={styles.splitRow}>
            {[2, 3, 4].map((n) => (
              <View key={n} style={styles.splitCard}>
                <Ionicons name="people-outline" size={16} color={COLORS.accent} />
                <Text style={styles.splitCount}>{n} people</Text>
                <Text style={styles.splitPrice}>
                  {split[String(n)] || `£${(parseFloat(String(cost).replace('£','') || 0) / n).toFixed(2)}`}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function Stat({ icon, label, value }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={COLORS.muted} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  subheading: { fontSize: 13, color: COLORS.muted, marginBottom: 20 },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.muted,
    marginTop: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Reg plate
  plateRow: { flexDirection: 'row', alignItems: 'center' },
  plateWrap: {
    flex: 1,
    backgroundColor: COLORS.plateYellow,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 10,
    borderWidth: 2,
    borderColor: THEME_COLORS.plateBorder,
  },
  plateInput: {
    color: COLORS.plateText,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    padding: 0,
  },
  lookupBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 92,
  },
  lookupBtnText: { color: COLORS.background, fontWeight: '800', fontSize: 14 },

  // Vehicle card
  vehicleCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vehicleRow: { flexDirection: 'row', alignItems: 'center' },
  vehicleTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  vehicleSub: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  mpgOverrideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  mpgLabel: { color: COLORS.muted, fontSize: 13, flex: 1 },
  mpgInput: {
    backgroundColor: COLORS.background,
    color: COLORS.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    width: 90,
    textAlign: 'right',
  },

  // Journey
  field: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { color: COLORS.muted, fontSize: 12, marginRight: 8 },
  input: {
    backgroundColor: COLORS.card,
    color: COLORS.text,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Calculate button
  calcBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  calcBtnText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
  },

  // Results
  resultSection: { marginTop: 24 },
  costCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  costLabel: {
    color: COLORS.muted,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  costBig: {
    color: COLORS.accent,
    fontSize: 48,
    fontWeight: '900',
    marginVertical: 6,
  },
  statsRow: { flexDirection: 'row', marginTop: 10, width: '100%', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statLabel: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  statValue: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
  co2Badge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  co2Text: { color: COLORS.accent, fontSize: 12, fontWeight: '700', marginLeft: 4 },

  cheapestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cheapestLabel: { color: COLORS.muted, fontSize: 11, textTransform: 'uppercase' },
  cheapestName: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  cheapestPrice: { color: COLORS.accent, fontSize: 18, fontWeight: '800' },

  splitRow: { flexDirection: 'row', justifyContent: 'space-between' },
  splitCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  splitCount: { color: COLORS.muted, fontSize: 11, marginTop: 6 },
  splitPrice: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginTop: 4 },
});
