/**
 * WelcomeFlowScreen.js — Wave A.9
 *
 * Loss-aversion onboarding flow. Shows every new user a personalised
 * "you could save £X" number within 60 seconds of first launch.
 *
 * 3 steps:
 *   Step 1 — Location: "Let's find your fuel"
 *   Step 2 — Plate: "See your real numbers"
 *   Step 3 — Results: personalised savings estimate
 *
 * Privacy:
 *   - Plate is ONLY sent to /vehicles/lookup (Wave A.8 privacy-reviewed).
 *   - Plate is NOT sent to /welcome/savings-estimate — only resolved
 *     make/model/fuel_type/mpg are sent.
 *   - lat/lon truncated to 3 d.p. before any API call (~111m precision).
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, FONT_SIZES } from '../lib/theme';
import { lookupVehicle, getSavingsEstimate } from '../api/fuelApi';

export const WELCOME_COMPLETED_KEY = 'welcome_completed';

/**
 * Truncate a coordinate to 3 decimal places (~111m precision).
 * Never rounds up — always truncates toward zero.
 */
function truncateCoord(val, dp = 3) {
  const factor = Math.pow(10, dp);
  return Math.trunc(Number(val) * factor) / factor;
}

/**
 * Validate a UK registration plate.
 * Accepts 7-8 alphanumeric chars after stripping spaces.
 */
function isValidUKPlate(s) {
  const cleaned = String(s || '').replace(/\s+/g, '').toUpperCase();
  return cleaned.length >= 5 && cleaned.length <= 8 && /^[A-Z0-9]+$/.test(cleaned);
}

/**
 * ProgressDots — shows step indicator (e.g. 1/2 or 2/2)
 */
function ProgressDots({ step, total }) {
  return (
    <View style={styles.progressDots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.dot, i < step ? styles.dotActive : styles.dotInactive]}
        />
      ))}
    </View>
  );
}

/**
 * WelcomeFlowScreen
 *
 * Props:
 *   onComplete(destination) — called when user completes or skips the flow.
 *     destination: 'home' | 'alerts'
 */
export default function WelcomeFlowScreen({ onComplete }) {
  const [step, setStep] = useState(1);          // 1 | 2 | 3
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Step 1 state
  const [locationData, setLocationData] = useState(null); // { lat, lon }
  const [postcodeModalVisible, setPostcodeModalVisible] = useState(false);
  const [postcodeInput, setPostcodeInput] = useState('');
  const [postcodeLoading, setPostcodeLoading] = useState(false);
  const [postcodeError, setPostcodeError] = useState(null);

  // Step 2 state
  const [plateInput, setPlateInput] = useState('');
  const [plateError, setPlateError] = useState(null);
  const [vehicleData, setVehicleData] = useState(null); // resolved from lookupVehicle

  // Step 3 state
  const [savingsEstimate, setSavingsEstimate] = useState(null);
  const [methodologyExpanded, setMethodologyExpanded] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const markCompleted = useCallback(async () => {
    try {
      await AsyncStorage.setItem(WELCOME_COMPLETED_KEY, 'true');
    } catch (_e) {
      // Non-critical — never crash on storage failure
    }
  }, []);

  const handleComplete = useCallback(async (destination = 'home') => {
    await markCompleted();
    if (typeof onComplete === 'function') onComplete(destination);
  }, [markCompleted, onComplete]);

  // ── Step 1: Location ──────────────────────────────────────────────────────

  const handleUseLocation = async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Enter your postcode instead.');
        setLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = truncateCoord(pos.coords.latitude);
      const lon = truncateCoord(pos.coords.longitude);
      setLocationData({ lat, lon });
      setStep(2);
    } catch (_e) {
      setError('Could not get your location. Enter your postcode instead.');
    } finally {
      setLoading(false);
    }
  };

  const handlePostcodeSubmit = async () => {
    const pc = postcodeInput.trim().replace(/\s+/g, '').toUpperCase();
    if (!pc) {
      setPostcodeError('Please enter a postcode.');
      return;
    }
    setPostcodeLoading(true);
    setPostcodeError(null);
    try {
      const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`);
      if (!res.ok) {
        setPostcodeError('Postcode not found. Please try again.');
        setPostcodeLoading(false);
        return;
      }
      const json = await res.json();
      const result = json && json.result;
      if (!result || result.latitude == null) {
        setPostcodeError('Postcode not found. Please try again.');
        setPostcodeLoading(false);
        return;
      }
      const lat = truncateCoord(result.latitude);
      const lon = truncateCoord(result.longitude);
      setLocationData({ lat, lon });
      setPostcodeModalVisible(false);
      setStep(2);
    } catch (_e) {
      setPostcodeError('Error looking up postcode. Please try again.');
    } finally {
      setPostcodeLoading(false);
    }
  };

  // ── Step 2: Plate ─────────────────────────────────────────────────────────

  const handlePlateSubmit = async () => {
    const cleaned = plateInput.replace(/\s+/g, '').toUpperCase();
    if (!isValidUKPlate(cleaned)) {
      setPlateError('Please enter a valid UK registration (e.g. AB12 CDE).');
      return;
    }
    setPlateError(null);
    setLoading(true);
    setError(null);
    try {
      // Lookup vehicle — plate goes only to /vehicles/lookup (privacy-reviewed A.8)
      const vehicle = await lookupVehicle(cleaned);
      // Extract make/model/fuel/mpg — these (NOT the plate) are sent to savings-estimate
      setVehicleData({
        make: vehicle.make || null,
        model: vehicle.model || null,
        fuel_type: vehicle.fuelType || vehicle.fuel_type || null,
        mpg: vehicle.estimated_mpg || null,
      });
    } catch (_e) {
      // Vehicle lookup failed — proceed with UK defaults (same as skip)
      setVehicleData(null);
    } finally {
      setLoading(false);
      await fetchSavingsEstimate(vehicleData);
    }
  };

  const handleSkipPlate = async () => {
    setVehicleData(null);
    await fetchSavingsEstimate(null);
  };

  // ── Step 3: Savings estimate ──────────────────────────────────────────────

  const fetchSavingsEstimate = async (vehicle) => {
    setLoading(true);
    setError(null);
    try {
      // Privacy: vehicle details (NO plate), truncated coords
      const payload = {
        lat: locationData.lat,
        lon: locationData.lon,
      };
      if (vehicle && vehicle.make) payload.make = vehicle.make;
      if (vehicle && vehicle.model) payload.model = vehicle.model;
      if (vehicle && vehicle.fuel_type) payload.fuel_type = vehicle.fuel_type;
      if (vehicle && vehicle.mpg) payload.mpg = vehicle.mpg;

      const estimate = await getSavingsEstimate(payload);
      setSavingsEstimate(estimate);
      setStep(3);
    } catch (_e) {
      // If the estimate fails, show a graceful error and allow user to proceed
      setError('Could not load your estimate. You can still explore the app.');
      setSavingsEstimate({
        frame: 'regional',
        headline: 'We\'re watching local stations for you — we\'ll alert you when prices change.',
        amount_pence: null,
        methodology: {
          basis: 'UK average',
          comparison: 'vs UK national average',
          assumptions: ['Default assumptions applied'],
        },
        area_label: 'your area',
        percentile: null,
      });
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (step === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.iconWrap}>
              <Ionicons name="location" size={80} color={COLORS.accent} />
            </View>

            <Text style={styles.title}>Let's find your fuel</Text>
            <Text style={styles.subtitle}>
              We'll show you what local drivers are actually paying — and how you compare.
            </Text>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleUseLocation}
              disabled={loading}
              activeOpacity={0.82}
              testID="use-location-btn"
            >
              {loading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.primaryBtnText}>Use my location</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.textLink}
              onPress={() => {
                setError(null);
                setPostcodeModalVisible(true);
              }}
              testID="enter-postcode-link"
            >
              <Text style={styles.textLinkText}>Enter postcode instead</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Postcode modal */}
          <Modal
            visible={postcodeModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setPostcodeModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Enter your postcode</Text>
                <TextInput
                  style={styles.postcodeInput}
                  placeholder="e.g. B7 5SA"
                  placeholderTextColor={COLORS.placeholderMuted}
                  value={postcodeInput}
                  onChangeText={(t) => {
                    setPostcodeInput(t.toUpperCase());
                    setPostcodeError(null);
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={handlePostcodeSubmit}
                  testID="postcode-input"
                />
                {postcodeError ? (
                  <Text style={styles.errorText}>{postcodeError}</Text>
                ) : null}
                <TouchableOpacity
                  style={[styles.primaryBtn, styles.modalBtn]}
                  onPress={handlePostcodeSubmit}
                  disabled={postcodeLoading}
                  testID="postcode-submit-btn"
                >
                  {postcodeLoading ? (
                    <ActivityIndicator color={COLORS.background} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Find stations</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.textLink}
                  onPress={() => {
                    setPostcodeModalVisible(false);
                    setPostcodeError(null);
                  }}
                >
                  <Text style={styles.textLinkText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (step === 2) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ProgressDots step={1} total={2} />

            <View style={styles.iconWrap}>
              <Ionicons name="car" size={80} color={COLORS.accent} />
            </View>

            <Text style={styles.title}>See your real numbers</Text>
            <Text style={styles.subtitle}>
              Tap your reg in once — we'll show you exactly what you're paying vs. what you could pay.{' '}
              <Text style={styles.privacyNote}>We never share your plate.</Text>
            </Text>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <TextInput
              style={[styles.plateInput, plateError ? styles.inputError : null]}
              placeholder="e.g. AB12 CDE"
              placeholderTextColor={COLORS.placeholderMuted}
              value={plateInput}
              onChangeText={(t) => {
                setPlateInput(t.toUpperCase());
                setPlateError(null);
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handlePlateSubmit}
              maxLength={9}
              testID="plate-input"
            />
            {plateError ? (
              <Text style={styles.errorText}>{plateError}</Text>
            ) : null}

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handlePlateSubmit}
              disabled={loading}
              activeOpacity={0.82}
              testID="plate-submit-btn"
            >
              {loading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.primaryBtnText}>Show my savings</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.textLink}
              onPress={handleSkipPlate}
              disabled={loading}
              testID="skip-plate-link"
            >
              <Text style={[styles.textLinkText, styles.skipText]}>
                Skip — use UK average
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Step 3 — Results
  if (step === 3) {
    const est = savingsEstimate;
    const isLoss = est && est.frame === 'loss';
    const headlineColor = isLoss ? COLORS.warning : COLORS.accent;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ProgressDots step={2} total={2} />

          <View style={styles.resultsIconWrap}>
            <Ionicons
              name={isLoss ? 'alert-circle' : 'checkmark-circle'}
              size={72}
              color={headlineColor}
            />
          </View>

          {/* Main headline — 24-28pt, brand colour */}
          <Text style={[styles.headlineText, { color: headlineColor }]}>
            {est ? est.headline : 'Calculating your savings...'}
          </Text>

          {loading ? (
            <ActivityIndicator color={COLORS.accent} style={styles.loadingSpinner} />
          ) : null}

          {/* Methodology expandable */}
          {est && est.methodology ? (
            <View style={styles.methodologyBox}>
              <TouchableOpacity
                style={styles.methodologyHeader}
                onPress={() => setMethodologyExpanded((v) => !v)}
                testID="methodology-toggle"
              >
                <Text style={styles.methodologyHeaderText}>
                  How we calculated this
                </Text>
                <Ionicons
                  name={methodologyExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
              {methodologyExpanded ? (
                <View style={styles.methodologyBody} testID="methodology-body">
                  {est.methodology.basis ? (
                    <Text style={styles.methodologyText}>
                      <Text style={styles.methodologyLabel}>Basis: </Text>
                      {est.methodology.basis}
                    </Text>
                  ) : null}
                  {est.methodology.comparison ? (
                    <Text style={styles.methodologyText}>
                      <Text style={styles.methodologyLabel}>Comparison: </Text>
                      {est.methodology.comparison}
                    </Text>
                  ) : null}
                  {est.methodology.assumptions && est.methodology.assumptions.length > 0 ? (
                    <View>
                      <Text style={[styles.methodologyText, styles.methodologyLabel]}>
                        Assumptions:
                      </Text>
                      {est.methodology.assumptions.map((a, i) => (
                        <Text key={i} style={styles.methodologyBullet}>
                          • {a}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* CTAs */}
          <View style={styles.ctaSection}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => handleComplete('home')}
              activeOpacity={0.82}
              testID="show-cheapest-btn"
            >
              <Text style={styles.primaryBtnText}>Show me the cheapest near me</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => handleComplete('alerts')}
              activeOpacity={0.75}
              testID="setup-alerts-btn"
            >
              <Text style={styles.secondaryBtnText}>Set up price alerts</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING ? SPACING.lg : 24,
    paddingVertical: 32,
  },
  iconWrap: {
    marginBottom: 24,
  },
  resultsIconWrap: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  headlineText: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 34,
    paddingHorizontal: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  privacyNote: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: COLORS.background,
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  textLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  textLinkText: {
    color: COLORS.accent,
    fontSize: 15,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  skipText: {
    color: COLORS.textMuted,
  },
  plateInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 4,
    textAlign: 'center',
    width: '100%',
    marginBottom: 8,
  },
  postcodeInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    color: COLORS.text,
    textAlign: 'center',
    width: '100%',
    marginBottom: 8,
    letterSpacing: 2,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  progressDots: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: COLORS.accent,
  },
  dotInactive: {
    backgroundColor: COLORS.border,
  },
  methodologyBox: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
    overflow: 'hidden',
  },
  methodologyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  methodologyHeaderText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  methodologyBody: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  methodologyText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },
  methodologyLabel: {
    fontWeight: '600',
    color: COLORS.text,
  },
  methodologyBullet: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 8,
  },
  ctaSection: {
    width: '100%',
    marginTop: 8,
  },
  loadingSpinner: {
    marginBottom: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalBtn: {
    marginTop: 8,
  },
});
