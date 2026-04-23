import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONT_SIZES, SPACING } from '../lib/theme';
import { flagStationPrice } from '../api/fuelApi';
import { getDeviceId } from '../lib/deviceId';
import {
  buildFlagPayload,
  canFlag,
  recordFlag,
  RECENT_FLAGS_KEY,
} from '../lib/flagPrice';
import { brandToString, safeText } from '../lib/brand';
import { isFeatureEnabled } from '../config/featureFlags';

const FUEL_OPTIONS = [
  { key: 'e10', label: 'E10' },
  { key: 'petrol', label: 'Petrol' },
  { key: 'e5', label: 'E5' },
  { key: 'super_unleaded', label: 'Super' },
  { key: 'diesel', label: 'B7' },
  { key: 'premium_diesel', label: 'Prem. Diesel' },
];

const REASONS = [
  { key: 'wrong_price', label: 'Wrong price' },
  { key: 'missing_price', label: 'Missing price' },
  { key: 'station_closed', label: 'Station closed' },
];

async function loadRecent() {
  try {
    const raw = await AsyncStorage.getItem(RECENT_FLAGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

async function saveRecent(next) {
  try {
    await AsyncStorage.setItem(RECENT_FLAGS_KEY, JSON.stringify(next));
  } catch (_) {}
}

/**
 * FlagPriceSheet — modal sheet for the silent community flag signal.
 * Gated by the `priceFlags` feature flag — consumers can still render it,
 * but it short-circuits to null when the flag is off.
 */
export default function FlagPriceSheet({
  visible,
  station,
  initialFuelType = 'petrol',
  onClose,
}) {
  const [fuelType, setFuelType] = useState(initialFuelType);
  const [reason, setReason] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // "ok" | "dup" | "err" | "quarantined"
  const [errMsg, setErrMsg] = useState(null);

  useEffect(() => {
    if (visible) {
      setFuelType(initialFuelType || 'petrol');
      setReason(null);
      setSubmitting(false);
      setResult(null);
      setErrMsg(null);
    }
  }, [visible, initialFuelType]);

  const handleSubmit = useCallback(async () => {
    if (!station || !reason) return;
    setSubmitting(true);
    setErrMsg(null);
    try {
      const recent = await loadRecent();
      if (!canFlag(recent, station.id, fuelType)) {
        setResult('dup');
        setSubmitting(false);
        return;
      }
      const deviceId = await getDeviceId();
      const body = buildFlagPayload({
        stationId: station.id,
        fuelType,
        deviceId,
        reason,
      });
      let resp = {};
      try {
        resp = await flagStationPrice(station.id, body);
      } catch (e) {
        // Backend may not be live yet; fail softly and still record dedup
        // so the user doesn't spam the same flag in the next hour.
        setResult('err');
        setErrMsg(e?.message || 'Could not submit flag');
        const next = recordFlag(recent, station.id, fuelType);
        await saveRecent(next);
        setSubmitting(false);
        return;
      }
      const next = recordFlag(recent, station.id, fuelType);
      await saveRecent(next);
      if (resp && resp.quarantined) setResult('quarantined');
      else setResult('ok');
    } finally {
      setSubmitting(false);
    }
  }, [station, fuelType, reason]);

  if (!isFeatureEnabled('priceFlags')) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          {result == null ? (
            <>
              <Text style={styles.title}>Is this price wrong?</Text>
              {station ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {safeText(station.name) || brandToString(station.brand) || 'Station'}
                </Text>
              ) : null}

              <Text style={styles.sectionLabel}>Fuel type</Text>
              <View style={styles.chipsRow}>
                {FUEL_OPTIONS.map((ft) => {
                  const active = fuelType === ft.key;
                  return (
                    <TouchableOpacity
                      key={ft.key}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setFuelType(ft.key)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {ft.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel}>What's wrong?</Text>
              <View style={styles.reasonsCol}>
                {REASONS.map((r) => {
                  const active = reason === r.key;
                  return (
                    <TouchableOpacity
                      key={r.key}
                      style={[styles.reasonBtn, active && styles.reasonBtnActive]}
                      onPress={() => setReason(r.key)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                    >
                      <Ionicons
                        name={active ? 'radio-button-on' : 'radio-button-off'}
                        size={16}
                        color={active ? COLORS.accent : COLORS.textMuted}
                      />
                      <Text style={[styles.reasonText, active && styles.reasonTextActive]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (!reason || submitting) && styles.submitBtnDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!reason || submitting}
                  accessibilityLabel="Submit price flag"
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#0B0F14" />
                  ) : (
                    <Text style={styles.submitBtnText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <ResultPane
              result={result}
              errMsg={errMsg}
              onClose={onClose}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ResultPane({ result, errMsg, onClose }) {
  let icon = 'checkmark-circle';
  let colour = COLORS.accent;
  let message = 'Thanks — we\u2019ll cross-check this price';
  if (result === 'quarantined') {
    icon = 'shield-checkmark';
    message = 'This price is now under review — thanks for flagging';
  } else if (result === 'dup') {
    icon = 'time-outline';
    colour = COLORS.warning;
    message = 'You already flagged this recently. Give it an hour before flagging again.';
  } else if (result === 'err') {
    icon = 'cloud-offline-outline';
    colour = COLORS.warning;
    message = errMsg
      ? `We\u2019ll try again shortly: ${errMsg}`
      : 'We\u2019ll retry this flag shortly.';
  }
  return (
    <View style={styles.resultPane}>
      <Ionicons name={icon} size={36} color={colour} />
      <Text style={styles.resultText}>{message}</Text>
      <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
        <Text style={styles.doneBtnText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  chipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.background,
  },
  reasonsCol: {
    gap: 6,
    marginBottom: SPACING.md,
  },
  reasonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reasonBtnActive: {
    borderColor: COLORS.accent,
  },
  reasonText: {
    fontSize: FONT_SIZES.md - 1,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  reasonTextActive: {
    color: COLORS.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitBtnText: {
    color: COLORS.background,
    fontWeight: '800',
    fontSize: FONT_SIZES.md,
  },
  resultPane: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: SPACING.md,
  },
  resultText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  doneBtn: {
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
  },
  doneBtnText: {
    color: COLORS.background,
    fontWeight: '800',
  },
});
