/**
 * VehicleCheckScreen
 *
 * One-stop vehicle dashboard: UK reg plate → tax status, MOT status + history,
 * and a tap-through to check insurance via MIB Navigate in an in-app browser.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '../lib/theme';
import { lookupVehicle, getInsuranceCheckInfo } from '../api/fuelApi';
import { lightHaptic, successHaptic } from '../lib/haptics';

import RegInput from '../components/vehicle/RegInput';
import TaxStatusCard from '../components/vehicle/TaxStatusCard';
import MotStatusCard from '../components/vehicle/MotStatusCard';
import InsuranceCard from '../components/vehicle/InsuranceCard';
import VehicleDetailsSection from '../components/vehicle/VehicleDetailsSection';
import VehicleCardSkeleton from '../components/vehicle/VehicleCardSkeleton';

// Loose UK reg validator: 2–8 alphanumeric chars, at least one letter and one digit.
const REG_REGEX = /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{2,8}$/;

function normaliseReg(input) {
  return String(input || '').replace(/\s+/g, '').toUpperCase();
}

function formatRegDisplay(reg) {
  const clean = normaliseReg(reg);
  if (clean.length >= 5) return `${clean.slice(0, clean.length - 3)} ${clean.slice(-3)}`;
  return clean;
}

function classifyError(err) {
  const status = err?.response?.status;
  const msg = String(err?.response?.data?.error || err?.message || '').toLowerCase();
  if (status === 429 || msg.includes('rate') || msg.includes('too many')) {
    return 'Too many checks. Please wait a moment and try again.';
  }
  if (status === 404 || msg.includes('not found')) {
    return 'No vehicle found for that registration.';
  }
  if (status === 400 || msg.includes('invalid')) {
    return 'Please enter a valid UK registration.';
  }
  if (msg.includes('network') || msg.includes('timeout') || msg.includes('timed out')) {
    return 'Unable to check vehicle. Please check your connection and try again.';
  }
  return 'Unable to check vehicle. Please try again.';
}

export default function VehicleCheckScreen() {
  const [reg, setReg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);
  const [insuranceInfo, setInsuranceInfo] = useState(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Prefetch insurance-check metadata once on mount (cheap, static, cached server-side).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await getInsuranceCheckInfo();
        if (!cancelled && mounted.current) setInsuranceInfo(info);
      } catch (_e) {
        // Fallback URL is hardcoded in the card — safe to ignore.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleCheck = useCallback(async () => {
    Keyboard.dismiss();
    const cleaned = normaliseReg(reg);
    if (!REG_REGEX.test(cleaned)) {
      setError('Please enter a valid UK registration.');
      return;
    }
    setError(null);
    setLoading(true);
    setData(null);
    lightHaptic();
    try {
      const result = await lookupVehicle(cleaned);
      if (!mounted.current) return;
      setData(result);
      setCheckedAt(new Date());
      successHaptic();
    } catch (err) {
      if (!mounted.current) return;
      setError(classifyError(err));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [reg]);

  const isMockData = data?.source === 'mock' || data?.is_mock === true;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heading}>Vehicle Check</Text>
          <Text style={styles.subheading}>
            Check your vehicle's tax, MOT, and insurance status.
          </Text>

          <View style={styles.inputBlock}>
            <RegInput
              value={reg}
              onChangeText={setReg}
              onSubmit={handleCheck}
              loading={loading}
              error={error}
            />
          </View>

          {isMockData && (
            <View style={styles.mockBanner}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.warning} />
              <Text style={styles.mockText}>
                Demo data — connect to live services for real results.
              </Text>
            </View>
          )}

          {loading && (
            <View style={styles.results}>
              <VehicleCardSkeleton />
              <VehicleCardSkeleton />
              <VehicleCardSkeleton />
            </View>
          )}

          {!loading && data && (
            <View style={styles.results}>
              <TaxStatusCard tax={data.tax} unavailable={data.tax?.unavailable} />
              <MotStatusCard
                mot={data.mot}
                history={data.mot?.history || data.motHistory}
                unavailable={data.mot?.unavailable}
              />
              <InsuranceCard info={insuranceInfo} />
              <VehicleDetailsSection vehicle={data} />

              <View style={styles.attribution}>
                <Text style={styles.attributionText}>
                  Data from DVLA and DVSA
                </Text>
                {checkedAt && (
                  <Text style={styles.attributionSub}>
                    Last checked: {checkedAt.toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })} · {formatRegDisplay(reg)}
                  </Text>
                )}
              </View>
            </View>
          )}

          {!loading && !data && !error && (
            <View style={styles.empty}>
              <Ionicons name="car-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>
                Enter a UK registration above to see tax, MOT and insurance status.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  heading: {
    fontSize: FONT_SIZES.xxl + 2,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  subheading: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  inputBlock: {
    marginBottom: SPACING.lg,
  },
  mockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bannerWarning,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(243,156,18,0.35)',
  },
  mockText: {
    color: COLORS.warning,
    fontSize: FONT_SIZES.sm + 1,
    marginLeft: 6,
    flex: 1,
  },
  results: {
    marginTop: SPACING.sm,
  },
  attribution: {
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  attributionText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
  },
  attributionSub: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs + 1,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    marginTop: SPACING.lg,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm + 1,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 20,
  },
});
