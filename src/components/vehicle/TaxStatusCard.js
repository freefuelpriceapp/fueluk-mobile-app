import React from 'react';
import { Text, StyleSheet } from 'react-native';
import VehicleCardShell from './VehicleCardShell';
import StatusBadge from './StatusBadge';
import { COLORS, FONT_SIZES } from '../../lib/theme';

function formatDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function resolveStatus(tax) {
  const s = String(tax?.status || '').toLowerCase();
  if (s.includes('sorn')) return { label: 'SORN', tone: 'warning' };
  if (s.includes('tax') && !s.includes('untax') && !s.includes('not')) {
    return { label: 'Taxed', tone: 'success' };
  }
  if (s.includes('untax') || s.includes('not taxed') || s.includes('expired')) {
    return { label: 'Untaxed', tone: 'error' };
  }
  if (tax?.taxed === true) return { label: 'Taxed', tone: 'success' };
  if (tax?.taxed === false) return { label: 'Untaxed', tone: 'error' };
  return null;
}

export default function TaxStatusCard({ tax, unavailable }) {
  const status = !unavailable ? resolveStatus(tax) : null;
  const due = tax?.dueDate || tax?.tax_due_date || tax?.due;

  return (
    <VehicleCardShell
      icon="shield-checkmark-outline"
      title="Road Tax"
      right={status ? <StatusBadge label={status.label} tone={status.tone} /> : null}
    >
      {unavailable ? (
        <Text style={styles.muted}>Unable to check — try again later.</Text>
      ) : due ? (
        <Text style={styles.detail}>
          Due: <Text style={styles.detailStrong}>{formatDate(due)}</Text>
        </Text>
      ) : (
        <Text style={styles.muted}>No tax due date on file.</Text>
      )}
    </VehicleCardShell>
  );
}

const styles = StyleSheet.create({
  detail: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
  },
  detailStrong: {
    color: COLORS.text,
    fontWeight: '700',
  },
  muted: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm + 1,
    fontStyle: 'italic',
  },
});
