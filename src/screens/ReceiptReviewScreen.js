/**
 * ReceiptReviewScreen — editable receipt form with validation.
 *
 * Pre-filled from OCR data (if available) or blank (manual entry).
 * Validates: total ≈ litres × p/L within ±2p tolerance.
 * On save: persists to AsyncStorage, optionally syncs anonymously, navigates back.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../lib/theme';
import {
  createReceipt,
  saveReceipt,
  FUEL_TYPES,
} from '../lib/receiptRepository';
import { validateReceiptMath } from '../lib/receiptSavings';
import {
  getSyncConsent,
  setSyncConsent,
  syncReceiptAnonymously,
} from '../lib/receiptSync';

const FUEL_TYPE_LABELS = {
  unleaded: 'Unleaded',
  super_unleaded: 'Super',
  diesel: 'Diesel',
  premium_diesel: 'Prem Diesel',
};

function Field({ label, children, hint, error }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint && !error ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function FuelChip({ type, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={() => onPress(type)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {FUEL_TYPE_LABELS[type]}
      </Text>
    </TouchableOpacity>
  );
}

export default function ReceiptReviewScreen({ route, navigation }) {
  const { ocrData, imageUri } = route.params || {};

  // Form state — initialised from OCR or empty
  const [stationName, setStationName] = useState(ocrData?.stationName || '');
  const [fuelType, setFuelType] = useState(ocrData?.fuelType || 'unleaded');
  const [litresStr, setLitresStr] = useState(
    ocrData?.litres != null ? String(ocrData.litres) : ''
  );
  const [pplStr, setPplStr] = useState(
    ocrData?.pricePerLitre != null ? String(ocrData.pricePerLitre) : ''
  );
  const [totalStr, setTotalStr] = useState(
    ocrData?.totalPaid != null ? String(ocrData.totalPaid) : ''
  );
  const [receiptDate, setReceiptDate] = useState(
    ocrData?.receiptDate ? ocrData.receiptDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [stationPostcode, setStationPostcode] = useState('');
  const [stationBrand, setStationBrand] = useState('');
  const [syncConsent, setSyncConsentState] = useState(false);
  const [mathWarning, setMathWarning] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const isOcrPrefilled = ocrData != null;

  // Load consent state on mount
  useEffect(() => {
    getSyncConsent().then(setSyncConsentState);
  }, []);

  // Validate math when numeric fields change
  useEffect(() => {
    const litres = parseFloat(litresStr);
    const ppl = parseFloat(pplStr);
    const total = parseFloat(totalStr);
    if (!isNaN(litres) && !isNaN(ppl) && !isNaN(total) && litres > 0 && ppl > 0 && total > 0) {
      const valid = validateReceiptMath(litres, ppl, total * 100, 200);
      setMathWarning(
        valid ? null : 'Total doesn\'t match litres × p/L — please double-check.'
      );
    } else {
      setMathWarning(null);
    }
  }, [litresStr, pplStr, totalStr]);

  const validate = useCallback(() => {
    const errs = {};
    const litres = parseFloat(litresStr);
    const ppl = parseFloat(pplStr);
    const total = parseFloat(totalStr);

    if (!fuelType) errs.fuelType = 'Select a fuel type';
    if (isNaN(litres) || litres <= 0) errs.litres = 'Enter litres filled';
    if (isNaN(ppl) || ppl <= 0) errs.ppl = 'Enter price per litre (pence)';
    if (isNaN(total) || total <= 0) errs.total = 'Enter total paid (£)';
    if (!receiptDate) errs.receiptDate = 'Enter the receipt date';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [fuelType, litresStr, pplStr, totalStr, receiptDate]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const litres = parseFloat(litresStr);
      const ppl = parseFloat(pplStr);
      const total = parseFloat(totalStr);

      const receipt = createReceipt({
        receiptDate: receiptDate + 'T12:00:00.000Z',
        stationName: stationName.trim(),
        stationBrand: stationBrand.trim(),
        stationPostcode: stationPostcode.trim() || null,
        fuelType,
        litres,
        pricePerLitre: ppl,
        totalPaid: Math.round(total * 100), // convert £ to pence
        imageUri: imageUri || null,
        ocrConfidence: ocrData?.ocrConfidence || 0,
        manuallyEdited: isOcrPrefilled
          ? (
              stationName !== (ocrData?.stationName || '') ||
              fuelType !== (ocrData?.fuelType || 'unleaded') ||
              litres !== ocrData?.litres ||
              ppl !== ocrData?.pricePerLitre
            )
          : true,
      });

      await saveReceipt(receipt);

      // Handle consent toggle: persist it
      await setSyncConsent(syncConsent);

      // Anonymous sync (non-blocking, failure tolerated)
      if (syncConsent) {
        syncReceiptAnonymously(receipt).catch(() => {});
      }

      navigation.navigate('FuelLog');
    } catch (err) {
      Alert.alert('Save failed', 'Could not save receipt. Please try again.', [{ text: 'OK' }]);
    } finally {
      setSaving(false);
    }
  }, [
    validate,
    litresStr,
    pplStr,
    totalStr,
    receiptDate,
    stationName,
    stationBrand,
    stationPostcode,
    fuelType,
    imageUri,
    ocrData,
    isOcrPrefilled,
    syncConsent,
    navigation,
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* OCR banner */}
        {isOcrPrefilled ? (
          <View style={styles.ocrBanner}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.accent} />
            <Text style={styles.ocrBannerText}>
              Receipt read automatically · Confidence{' '}
              {Math.round((ocrData.ocrConfidence || 0) * 100)}% · Check details below
            </Text>
          </View>
        ) : (
          <View style={styles.manualBanner}>
            <Ionicons name="create-outline" size={16} color={COLORS.warning} />
            <Text style={styles.manualBannerText}>Manual entry — fill in your receipt details</Text>
          </View>
        )}

        {/* Fuel type chips */}
        <Field label="Fuel Type" error={errors.fuelType}>
          <View style={styles.chipsRow}>
            {FUEL_TYPES.map((t) => (
              <FuelChip key={t} type={t} selected={fuelType === t} onPress={setFuelType} />
            ))}
          </View>
        </Field>

        {/* Date */}
        <Field label="Receipt Date" error={errors.receiptDate}>
          <TextInput
            style={[styles.input, errors.receiptDate && styles.inputError]}
            value={receiptDate}
            onChangeText={setReceiptDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numbers-and-punctuation"
            accessibilityLabel="Receipt date"
          />
        </Field>

        {/* Litres */}
        <Field label="Litres Filled" error={errors.litres} hint="e.g. 42.50">
          <TextInput
            style={[styles.input, errors.litres && styles.inputError]}
            value={litresStr}
            onChangeText={setLitresStr}
            placeholder="e.g. 42.50"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
            accessibilityLabel="Litres filled"
          />
        </Field>

        {/* Price per litre */}
        <Field label="Price per Litre (p)" error={errors.ppl} hint="e.g. 135.9">
          <TextInput
            style={[styles.input, errors.ppl && styles.inputError]}
            value={pplStr}
            onChangeText={setPplStr}
            placeholder="e.g. 135.9"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
            accessibilityLabel="Price per litre in pence"
          />
        </Field>

        {/* Total paid */}
        <Field label="Total Paid (£)" error={errors.total} hint="e.g. 57.83">
          <TextInput
            style={[styles.input, errors.total && styles.inputError]}
            value={totalStr}
            onChangeText={setTotalStr}
            placeholder="e.g. 57.83"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
            accessibilityLabel="Total paid in pounds"
          />
        </Field>

        {/* Math warning */}
        {mathWarning && (
          <View style={styles.mathWarning}>
            <Ionicons name="warning-outline" size={16} color={COLORS.warning} />
            <Text style={styles.mathWarningText}>{mathWarning}</Text>
          </View>
        )}

        {/* Station info */}
        <Field label="Station Name (optional)">
          <TextInput
            style={styles.input}
            value={stationName}
            onChangeText={setStationName}
            placeholder="e.g. Asda Express Birmingham"
            placeholderTextColor={COLORS.textMuted}
            accessibilityLabel="Station name"
          />
        </Field>

        <Field label="Brand (optional)">
          <TextInput
            style={styles.input}
            value={stationBrand}
            onChangeText={setStationBrand}
            placeholder="e.g. Asda, BP, Shell"
            placeholderTextColor={COLORS.textMuted}
            accessibilityLabel="Station brand"
          />
        </Field>

        <Field label="Postcode (optional)" hint="Used anonymously for price data (outcode only)">
          <TextInput
            style={styles.input}
            value={stationPostcode}
            onChangeText={(v) => setStationPostcode(v.toUpperCase())}
            placeholder="e.g. B10 0HH"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="characters"
            accessibilityLabel="Station postcode"
          />
        </Field>

        {/* Anonymous sync toggle */}
        <View style={styles.syncToggle}>
          <View style={styles.syncToggleLeft}>
            <Text style={styles.syncToggleTitle}>Contribute anonymous price data</Text>
            <Text style={styles.syncToggleSub}>
              Share p/L + outcode (no ID, no image) to help build UK's first fuel price dataset
            </Text>
          </View>
          <Switch
            value={syncConsent}
            onValueChange={(v) => setSyncConsentState(v)}
            trackColor={{ false: COLORS.border, true: COLORS.accent }}
            thumbColor={COLORS.white}
            accessibilityLabel="Toggle anonymous price contribution"
          />
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          accessibilityLabel="Save receipt"
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.background} />
              <Text style={styles.saveBtnText}>Save Receipt</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  ocrBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0d2d1a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  ocrBannerText: {
    fontSize: 13,
    color: COLORS.accent,
    flex: 1,
  },
  manualBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  manualBannerText: {
    fontSize: 13,
    color: COLORS.warning,
    flex: 1,
  },
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  fieldError: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextSelected: {
    color: COLORS.background,
  },
  mathWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  mathWarningText: {
    fontSize: 13,
    color: COLORS.warning,
    flex: 1,
  },
  syncToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  syncToggleLeft: {
    flex: 1,
  },
  syncToggleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  syncToggleSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 16,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.background,
  },
});
