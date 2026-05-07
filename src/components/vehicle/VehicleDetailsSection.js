import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '../../lib/theme';
import { lightHaptic } from '../../lib/haptics';
import {
  formatVehicleHeader,
  formatMake,
  formatModel,
  formatFuel,
  formatColour,
  formatEngine,
} from '../../lib/formatVehicleHeader';

function Row({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{String(value)}</Text>
    </View>
  );
}

export default function VehicleDetailsSection({ vehicle }) {
  const [expanded, setExpanded] = useState(true);
  if (!vehicle) return null;

  const headerLine = formatVehicleHeader(vehicle);
  const make = formatMake(vehicle.make);
  const model = formatModel(vehicle.model);
  const makeModel = [make, model].filter(Boolean).join(' ') || null;
  const colour = formatColour(vehicle.colour ?? vehicle.color);
  const year = vehicle.year || vehicle.yearOfManufacture;
  const fuel = formatFuel(vehicle.fuel_type ?? vehicle.fuelType);
  const engine = formatEngine(vehicle.engineCapacity ?? vehicle.engine_capacity);
  const co2 = vehicle.co2_g_per_km != null ? vehicle.co2_g_per_km : vehicle.co2Emissions;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    lightHaptic();
    setExpanded((v) => !v);
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.75}>
        <Ionicons name="car-sport-outline" size={18} color={COLORS.accent} />
        <Text style={styles.headerText}>Vehicle details</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.body}>
          {headerLine ? (
            <Text
              style={styles.headerLine}
              accessibilityLabel={headerLine}
              testID="vehicle-header-line"
            >
              {headerLine}
            </Text>
          ) : null}
          <Row label="Make & model" value={makeModel} />
          <Row label="Colour" value={colour} />
          <Row label="Year" value={year} />
          <Row label="Fuel" value={fuel} />
          <Row label="Engine" value={engine} />
          <Row label="CO₂" value={co2 != null ? `${co2} g/km` : null} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerText: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZES.md + 1,
    fontWeight: '700',
    marginLeft: SPACING.md,
  },
  body: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingTop: SPACING.sm,
  },
  headerLine: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    paddingTop: 6,
    paddingBottom: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm + 1,
  },
  rowValue: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: SPACING.md,
  },
});
