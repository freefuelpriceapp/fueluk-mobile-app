import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, SPACING } from '../lib/theme';
import {
  loadUserVehicle,
  saveUserVehicle,
  clearUserVehicle,
  defaultMpgFor,
  UK_AVG_MPG,
} from '../lib/userVehicle';
import { lookupVehicle } from '../api/fuelApi';

const FUEL_OPTIONS = [
  { key: 'e10', label: 'E10 (regular petrol)', default_mpg: UK_AVG_MPG.e10 },
  { key: 'e5', label: 'E5 / Super unleaded', default_mpg: UK_AVG_MPG.e5 },
  { key: 'diesel', label: 'B7 / Diesel', default_mpg: UK_AVG_MPG.diesel },
  { key: 'premium_diesel', label: 'Premium Diesel', default_mpg: UK_AVG_MPG.premium_diesel },
];

/**
 * VehicleSettingsScreen — lets the user tell us what they drive so the
 * break-even calculation can personalise savings.
 *
 * Three input paths, in order of preference:
 *   1. Reg plate → DVLA lookup (autoFills make/model/fuel/mpg)
 *   2. Manual fuel-type pick (uses UK average mpg)
 *   3. Manual mpg override (power-user)
 */
export default function VehicleSettingsScreen({ navigation }) {
  const [loaded, setLoaded] = useState(false);
  const [current, setCurrent] = useState(null);
  const [reg, setReg] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupErr, setLookupErr] = useState(null);
  const [fuelType, setFuelType] = useState('e10');
  const [mpgInput, setMpgInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadUserVehicle().then((v) => {
      if (!mounted) return;
      if (v) {
        setCurrent(v);
        if (v.reg) setReg(v.reg);
        if (v.fuel_type) setFuelType(v.fuel_type);
        if (typeof v.mpg === 'number') setMpgInput(String(v.mpg));
      }
      setLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  const handleLookup = useCallback(async () => {
    const cleaned = String(reg || '').replace(/\s+/g, '').toUpperCase();
    if (!cleaned) {
      setLookupErr('Enter a reg plate first');
      return;
    }
    setLookupBusy(true);
    setLookupErr(null);
    try {
      const resp = await lookupVehicle(cleaned);
      const apiFuel = (resp?.fuel_type || '').toLowerCase();
      const mapped =
        apiFuel.includes('diesel') ? 'diesel'
          : apiFuel.includes('petrol') || apiFuel.includes('e10') ? 'e10'
          : fuelType;
      const mpg =
        typeof resp?.estimated_mpg === 'number' && Number.isFinite(resp.estimated_mpg)
          ? resp.estimated_mpg
          : defaultMpgFor(mapped);
      const saved = await saveUserVehicle({
        reg: cleaned,
        fuel_type: mapped,
        mpg,
        make: resp?.make,
        model: resp?.model,
        source: 'dvla',
      });
      setCurrent(saved);
      setFuelType(mapped);
      if (mpg != null) setMpgInput(String(mpg));
      Alert.alert(
        'Vehicle saved',
        `${resp?.make || ''} ${resp?.model || ''} (${mapped}, ${mpg} mpg)`.trim()
      );
    } catch (e) {
      setLookupErr(e?.response?.data?.message || e?.message || 'Lookup failed');
    } finally {
      setLookupBusy(false);
    }
  }, [reg, fuelType]);

  const handleManualSave = useCallback(async () => {
    setSaving(true);
    try {
      const parsedMpg = parseFloat(mpgInput);
      const hasManualMpg = Number.isFinite(parsedMpg) && parsedMpg > 0;
      const saved = await saveUserVehicle({
        fuel_type: fuelType,
        mpg: hasManualMpg ? parsedMpg : defaultMpgFor(fuelType),
        source: hasManualMpg ? 'manual' : 'estimated',
      });
      setCurrent(saved);
      Alert.alert('Saved', 'We\u2019ll use this for break-even savings.');
    } finally {
      setSaving(false);
    }
  }, [fuelType, mpgInput]);

  const handleClear = useCallback(async () => {
    await clearUserVehicle();
    setCurrent(null);
    setReg('');
    setMpgInput('');
    setFuelType('e10');
  }, []);

  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: SPACING.lg }}>
      <Text style={styles.title}>What do you drive?</Text>
      <Text style={styles.subtitle}>
        We'll use this to show personalised break-even savings at each station.
      </Text>

      {current ? (
        <View style={styles.currentCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.currentLabel}>Saved vehicle</Text>
            <Text style={styles.currentValue}>
              {current.reg
                ? `${current.reg} \u00B7 ${current.make || ''} ${current.model || ''}`.trim()
                : 'Manual settings'}
            </Text>
            <Text style={styles.currentMeta}>
              {`${(current.fuel_type || '—').toUpperCase()} \u00B7 ${
                current.mpg ? `${current.mpg} mpg` : 'mpg not set'
              } \u00B7 ${current.source}`}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClear} accessibilityLabel="Clear saved vehicle">
            <Ionicons name="close-circle" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Option 1 · Reg plate lookup</Text>
      <View style={styles.regRow}>
        <TextInput
          style={styles.regInput}
          placeholder="AB12 CDE"
          placeholderTextColor={COLORS.textMuted}
          value={reg}
          onChangeText={(t) => setReg(t.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
          accessibilityLabel="Registration plate"
        />
        <TouchableOpacity
          style={[styles.lookupBtn, lookupBusy && { opacity: 0.5 }]}
          onPress={handleLookup}
          disabled={lookupBusy}
          accessibilityLabel="Look up vehicle"
        >
          {lookupBusy ? (
            <ActivityIndicator size="small" color={COLORS.background} />
          ) : (
            <Text style={styles.lookupBtnText}>Look up</Text>
          )}
        </TouchableOpacity>
      </View>
      {lookupErr ? <Text style={styles.errorLine}>{lookupErr}</Text> : null}

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Option 2 · Pick your fuel type</Text>
      <View style={{ gap: 6 }}>
        {FUEL_OPTIONS.map((ft) => {
          const active = fuelType === ft.key;
          return (
            <TouchableOpacity
              key={ft.key}
              style={[styles.fuelRow, active && styles.fuelRowActive]}
              onPress={() => setFuelType(ft.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <Ionicons
                name={active ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={active ? COLORS.accent : COLORS.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.fuelLabel}>{ft.label}</Text>
                <Text style={styles.fuelMpg}>UK average ≈ {ft.default_mpg} mpg</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Option 3 · Override mpg (optional)</Text>
      <TextInput
        style={styles.mpgInput}
        placeholder={`e.g. ${defaultMpgFor(fuelType) || 45}`}
        placeholderTextColor={COLORS.textMuted}
        value={mpgInput}
        onChangeText={setMpgInput}
        keyboardType="numeric"
        accessibilityLabel="Manual MPG override"
      />

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.5 }]}
        onPress={handleManualSave}
        disabled={saving}
        accessibilityLabel="Save vehicle settings"
      >
        {saving ? (
          <ActivityIndicator color={COLORS.background} />
        ) : (
          <Text style={styles.saveBtnText}>Save settings</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.footnote}>
        We don't share your vehicle info with anyone — it's stored only on this device
        and passed to the price API to calculate your break-even savings.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
    marginBottom: SPACING.lg,
  },
  currentLabel: {
    fontSize: 10,
    color: COLORS.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  currentValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '700',
    marginTop: 2,
  },
  currentMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  regRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  regInput: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  lookupBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lookupBtnText: {
    color: COLORS.background,
    fontWeight: '800',
    fontSize: FONT_SIZES.md,
  },
  errorLine: {
    color: COLORS.danger || COLORS.warning,
    fontSize: FONT_SIZES.xs,
    marginTop: 6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginTop: SPACING.lg,
  },
  fuelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: SPACING.md,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fuelRowActive: {
    borderColor: COLORS.accent,
  },
  fuelLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  fuelMpg: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  mpgInput: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
  },
  saveBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  saveBtnText: {
    color: COLORS.background,
    fontWeight: '800',
    fontSize: FONT_SIZES.md,
  },
  footnote: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
    lineHeight: 16,
  },
});
