/**
 * PrePurchaseCheckScreen — DVSA G1 pre-purchase MOT check.
 *
 * UK reg → DVSA MOT history → transparent verdict + breakdown:
 *   header, verdict card, MOT timeline, mileage analysis (with rollback flag),
 *   recurring-advisory analysis, share CTA, disclaimer.
 *
 * Gated by FEATURES.FEATURE_PRE_PURCHASE_CHECK. Memoises results in-session.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableOpacity,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '../lib/theme';
import { getMotHistory } from '../api/fuelApi';
import { lightHaptic, successHaptic } from '../lib/haptics';
import {
  parseMotResponse,
  scoreMotHistory,
  mileageAnalysis,
  groupRecurringAdvisories,
  buildShareSummary,
  VERDICTS,
} from '../lib/prePurchaseCheck';
import RegInput from '../components/vehicle/RegInput';
import VehicleCardSkeleton from '../components/vehicle/VehicleCardSkeleton';
import VerdictCard from '../components/prePurchase/VerdictCard';
import MotTimeline from '../components/prePurchase/MotTimeline';
import MileageAnalysisCard from '../components/prePurchase/MileageAnalysisCard';
import AdvisoryFrequencyCard from '../components/prePurchase/AdvisoryFrequencyCard';
import VehicleHeader from '../components/prePurchase/VehicleHeader';

const REG_REGEX = /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{2,8}$/;
const SESSION_CACHE = new Map();

function normaliseReg(input) {
  return String(input || '').replace(/\s+/g, '').toUpperCase();
}

function formatFirstMotDue(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function classifyError(err) {
  const status = err?.response?.status;
  const msg = String(err?.response?.data?.error || err?.message || '').toLowerCase();
  if (status === 404) {
    return "We can't find that registration. Check the letters and try again.";
  }
  if (msg.includes('network') || msg.includes('timeout') || msg.includes('timed out')) {
    return 'Network error. Check your connection and try again.';
  }
  if (status === 429) return 'Too many checks. Please wait a moment.';
  if (status === 400 || msg.includes('invalid')) return 'Please enter a valid UK registration.';
  return 'We had trouble checking that vehicle. Try again.';
}

export default function PrePurchaseCheckScreen({ route }) {
  const initialReg = route?.params?.reg ? normaliseReg(route.params.reg) : '';
  const [reg, setReg] = useState(initialReg);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [parsed, setParsed] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const runCheck = useCallback(async (regToUse) => {
    Keyboard.dismiss();
    const cleaned = normaliseReg(regToUse);
    if (!REG_REGEX.test(cleaned)) {
      setError('Please enter a valid UK registration.');
      return;
    }
    setError(null);
    setLoading(true);
    setParsed(null);
    lightHaptic();
    try {
      let raw = SESSION_CACHE.get(cleaned);
      if (!raw) {
        raw = await getMotHistory(cleaned);
        SESSION_CACHE.set(cleaned, raw);
      }
      if (!mounted.current) return;
      const p = parseMotResponse(raw);
      setParsed(p);
      successHaptic();
    } catch (err) {
      if (!mounted.current) return;
      setError(classifyError(err));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  // Auto-run if a reg was passed in via navigation params.
  useEffect(() => {
    if (initialReg) runCheck(initialReg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scored = useMemo(
    () => (parsed && parsed.motTests.length > 0 ? scoreMotHistory(parsed) : null),
    [parsed]
  );
  const mileage = useMemo(() => (parsed ? mileageAnalysis(parsed) : null), [parsed]);
  const advisories = useMemo(() => (parsed ? groupRecurringAdvisories(parsed) : null), [parsed]);

  const onShare = useCallback(async () => {
    if (!parsed || !scored) return;
    try {
      await Share.share({ message: buildShareSummary(parsed, scored) });
    } catch (_) {
      // user cancelled
    }
  }, [parsed, scored]);

  const tooNew = parsed?.hasNoMot;

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
          <Text style={styles.heading}>Pre-purchase check</Text>
          <Text style={styles.subheading}>
            Enter a UK registration to see the DVSA MOT history and a transparent buying verdict.
          </Text>

          <View style={styles.inputBlock}>
            <RegInput
              value={reg}
              onChangeText={setReg}
              onSubmit={() => runCheck(reg)}
              loading={loading}
              error={error}
            />
          </View>

          {loading && (
            <View style={styles.results}>
              <VehicleCardSkeleton />
              <VehicleCardSkeleton />
              <VehicleCardSkeleton />
            </View>
          )}

          {!loading && parsed && tooNew && (
            <View style={styles.tooNew}>
              <Ionicons name="time-outline" size={28} color={COLORS.warning} />
              <Text style={styles.tooNewTitle}>
                {[parsed.make, parsed.model].filter(Boolean).join(' ') || 'This vehicle'} is too new for an MOT
              </Text>
              <Text style={styles.tooNewBody}>
                The first MOT is due {formatFirstMotDue(parsed.firstMotDue)} (3 years after first registration).
              </Text>
            </View>
          )}

          {!loading && parsed && !tooNew && (
            <View style={styles.results}>
              <VehicleHeader parsed={parsed} />
              {scored && <VerdictCard scored={scored} />}
              <MotTimeline tests={parsed.motTests} />
              {mileage && <MileageAnalysisCard mileage={mileage} />}
              {advisories && parsed.motTests.length > 0 && (
                <AdvisoryFrequencyCard advisories={advisories} testCount={parsed.motTests.length} />
              )}

              <TouchableOpacity style={styles.shareBtn} onPress={onShare} activeOpacity={0.85}>
                <Ionicons name="share-outline" size={18} color={COLORS.background} />
                <Text style={styles.shareBtnText}>Looks good for further inspection</Text>
              </TouchableOpacity>

              <Text style={styles.disclaimer}>
                Information is sourced from DVSA records and is for guidance only. Always inspect the vehicle in person and consider a professional inspection.
              </Text>
            </View>
          )}

          {!loading && !parsed && !error && (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>
                Thinking of buying? Run a pre-purchase MOT check before you commit.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, paddingBottom: 40 },
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
  inputBlock: { marginBottom: SPACING.lg },
  results: { marginTop: SPACING.sm },
  tooNew: {
    alignItems: 'center',
    backgroundColor: COLORS.bannerWarning,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(243,156,18,0.35)',
    padding: SPACING.lg,
    marginTop: SPACING.md,
  },
  tooNewTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  tooNewBody: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 20,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: SPACING.md,
  },
  shareBtnText: {
    color: COLORS.background,
    fontSize: FONT_SIZES.md + 1,
    fontWeight: '700',
    marginLeft: 8,
  },
  disclaimer: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs + 1,
    marginTop: SPACING.lg,
    lineHeight: 16,
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
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
