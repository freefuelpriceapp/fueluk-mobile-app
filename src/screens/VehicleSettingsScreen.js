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
import { formatVehicleHeader } from '../lib/formatVehicleHeader';
import EmptyState from '../components/EmptyState';
import { FUEL_KEY_MIGRATION } from '../lib/fuelTaxonomy';
import { mapDvlaFuelToCanonical, fuelCategoryToTaxonomyKey } from '../lib/dvlaFuelMapping';

// B-05: Use canonical fuel-type keys from fuelTaxonomy. Old keys ('e5',
// 'e10', 'petrol') that may be persisted in AsyncStorage are migrated
// transparently via FUEL_KEY_MIGRATION on load.
const FUEL_OPTIONS = [
  { key: 'unleaded',       label: 'E10 (regular petrol)',   default_mpg: UK_AVG_MPG.e10 },
  { key: 'super_unleaded', label: 'E5 / Super unleaded',    default_mpg: UK_AVG_MPG.super_unleaded },
  { key: 'diesel',         label: 'B7 / Diesel',            default_mpg: UK_AVG_MPG.diesel },
  { key: 'premium_diesel', label: 'Premium Diesel',         default_mpg: UK_AVG_MPG.premium_diesel },
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
export default function VehicleSettingsScreen({ navigation, route }) {
  const deepLinkReg = route?.params?.reg ? String(route.params.reg).toUpperCase() : null;
  const fromDeepLink = !!route?.params?.fromDeepLink;

  const [loaded, setLoaded] = useState(false);
  const [current, setCurrent] = useState(null);
  const [reg, setReg] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupErr, setLookupErr] = useState(null);
  const [fuelType, setFuelType] = useState('unleaded'); // B-05: use canonical key
  const [mpgInput, setMpgInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deepLinkMismatch, setDeepLinkMismatch] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadUserVehicle().then((v) => {
      if (!mounted) return;
      if (v) {
        setCurrent(v);
        if (v.reg) setReg(v.reg);
        if (v.fuel_type) {
          // B-05: migrate legacy persisted keys ('e5', 'e10', 'petrol') to
          // canonical taxonomy keys on load. FUEL_KEY_MIGRATION is a no-op for
          // keys that are already canonical.
          const canonicalFuelType = FUEL_KEY_MIGRATION[v.fuel_type] ?? v.fuel_type;
          setFuelType(canonicalFuelType);
        }
        if (typeof v.mpg === 'number') setMpgInput(String(v.mpg));
      }
      // If we arrived via fueluk://car/:reg and the saved vehicle (if any)
      // doesn't match, surface a "Not found" notice and pre-fill the input.
      if (deepLinkReg) {
        const savedReg = v?.reg ? String(v.reg).toUpperCase() : '';
        if (savedReg !== deepLinkReg) {
          setDeepLinkMismatch(true);
          setReg(deepLinkReg);
        }
      }
      setLoaded(true);
    });
    return () => { mounted = false; };
  }, [deepLinkReg]);

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

      // Wave A.8 — deterministic priority read:
      //   1. resp.fuel_category (new authoritative server-derived key)
      //   2. mapDvlaFuelToCanonical(resp.fuel_type || resp.fuelType)
      //   3. null → fall back to user-selected fuelType + show soft notice
      const VALID_CATEGORIES = ['diesel', 'unleaded', 'electric'];
      let dvlaCategory = null;
      let dvlaSource = null;

      if (resp?.fuel_category && VALID_CATEGORIES.includes(resp.fuel_category)) {
        dvlaCategory = resp.fuel_category;
        dvlaSource = 'fuel_category';
      } else {
        const rawFuel = resp?.fuel_type || resp?.fuelType;
        const mapped = mapDvlaFuelToCanonical(rawFuel);
        if (mapped !== null) {
          dvlaCategory = mapped;
          dvlaSource = 'fuel_type_mapped';
        }
      }

      // Convert canonical category to app taxonomy key.
      // EVs map to null (no pump fuel); we use user's existing selection.
      let taxonomyKey;
      if (dvlaCategory === null) {
        // DVLA couldn't tell us — fall back to user-selected fuel type
        taxonomyKey = fuelType;
        setLookupErr(
          "We couldn't read DVLA's fuel type for this plate — confirm below"
        );
      } else if (dvlaCategory === 'electric') {
        // EV — there's no pump fuel; keep user choice but surface notice
        taxonomyKey = fuelType;
        setLookupErr(
          'This vehicle is electric — no fuel type applies. Your saved fuel type is unchanged.'
        );
      } else {
        // B-05: diesel and unleaded are valid taxonomy keys directly
        taxonomyKey = dvlaCategory; // 'diesel' | 'unleaded'
      }

      const mpg =
        typeof resp?.estimated_mpg === 'number' && Number.isFinite(resp.estimated_mpg)
          ? resp.estimated_mpg
          : defaultMpgFor(taxonomyKey);

      const saved = await saveUserVehicle({
        reg: cleaned,
        fuel_type: taxonomyKey,
        mpg,
        make: resp?.make,
        model: resp?.model,
        source: 'dvla',
        // Store the raw DVLA category for the backfill validator
        dvla_fuel_category: dvlaCategory,
      });
      setCurrent(saved);
      setFuelType(taxonomyKey);
      if (mpg != null) setMpgInput(String(mpg));

      if (dvlaCategory !== null && dvlaCategory !== 'electric') {
        const headerLine = formatVehicleHeader(resp) || resp?.make || 'Vehicle';
        Alert.alert(
          'Vehicle saved',
          `${headerLine} (${taxonomyKey}, ${mpg} mpg)`
        );
      }
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
    setFuelType('unleaded'); // B-05: canonical default
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

      {fromDeepLink && deepLinkMismatch ? (
        <EmptyState
          type="empty"
          icon="car-outline"
          headline={`Vehicle ${deepLinkReg} not found`}
          helper="No saved vehicle matches that registration. You can look it up below."
          compact
        />
      ) : null}

      {current ? (
        <View style={styles.currentCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.currentLabel}>Saved vehicle</Text>
            <Text style={styles.currentValue}>
              {(() => {
                const header = formatVehicleHeader(current);
                if (current.reg && header) return `${current.reg} \u00B7 ${header}`;
                if (current.reg) return current.reg;
                return 'Manual settings';
              })()}
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
