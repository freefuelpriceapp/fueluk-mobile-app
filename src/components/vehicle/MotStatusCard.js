import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VehicleCardShell from './VehicleCardShell';
import StatusBadge from './StatusBadge';
import { COLORS, SPACING, FONT_SIZES } from '../../lib/theme';
import { lightHaptic } from '../../lib/haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function formatDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function resolveStatus(mot) {
  const s = String(mot?.status || '').toLowerCase();
  if (s.includes('valid') || s.includes('pass')) return { label: 'Valid', tone: 'success' };
  if (s.includes('expired') || s.includes('fail')) return { label: 'Expired', tone: 'error' };
  if (mot?.valid === true) return { label: 'Valid', tone: 'success' };
  if (mot?.valid === false) return { label: 'Expired', tone: 'error' };
  if (!mot) return null;
  return { label: 'No data', tone: 'muted' };
}

const DEFECT_TONE = {
  advisory: 'warning',
  minor:    'warning',
  major:    'error',
  dangerous: 'error',
  fail:     'error',
};

function DefectBadge({ type }) {
  const key = String(type || '').toLowerCase();
  const tone = DEFECT_TONE[key] || 'muted';
  const label = key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Note';
  return <StatusBadge label={label} tone={tone} />;
}

function MotHistoryItem({ test }) {
  const date = formatDate(test.date || test.completedDate || test.test_date);
  const passed = String(test.result || '').toLowerCase().includes('pass') || test.passed === true;
  const mileage = test.mileage || test.odometerValue;
  const mileageUnit = test.odometerUnit || 'mi';
  const defects = test.defects || test.rfrAndComments || [];

  return (
    <View style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyDate}>{date || 'Unknown date'}</Text>
        <StatusBadge label={passed ? 'PASSED' : 'FAILED'} tone={passed ? 'success' : 'error'} />
      </View>
      {mileage != null && (
        <Text style={styles.historyMileage}>
          {Number(mileage).toLocaleString('en-GB')} {mileageUnit}
        </Text>
      )}
      {Array.isArray(defects) && defects.length > 0 && (
        <View style={styles.defectList}>
          {defects.map((d, i) => (
            <View key={i} style={styles.defectRow}>
              <View style={styles.defectBadgeWrap}>
                <DefectBadge type={d.type || d.severity} />
              </View>
              <Text style={styles.defectText}>
                {d.text || d.comment || d.description || ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function MotStatusCard({ mot, history, unavailable }) {
  const [expanded, setExpanded] = useState(false);
  const status = !unavailable ? resolveStatus(mot) : null;
  const expiry = mot?.expiryDate || mot?.mot_expiry_date || mot?.expiry;
  const hasHistory = Array.isArray(history) && history.length > 0;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    lightHaptic();
    setExpanded((v) => !v);
  };

  return (
    <VehicleCardShell
      icon="construct-outline"
      title="MOT"
      right={status ? <StatusBadge label={status.label} tone={status.tone} /> : null}
    >
      {unavailable ? (
        <Text style={styles.muted}>MOT history unavailable.</Text>
      ) : (
        <>
          {expiry ? (
            <Text style={styles.detail}>
              Expires: <Text style={styles.detailStrong}>{formatDate(expiry)}</Text>
            </Text>
          ) : (
            <Text style={styles.muted}>No expiry date on file.</Text>
          )}

          {hasHistory && (
            <>
              <TouchableOpacity style={styles.expandRow} onPress={toggle} activeOpacity={0.75}>
                <Text style={styles.expandLabel}>
                  {expanded ? 'Hide MOT history' : `View MOT history (${history.length})`}
                </Text>
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={COLORS.accent}
                />
              </TouchableOpacity>
              {expanded && (
                <View style={styles.historyList}>
                  {history.map((test, i) => (
                    <MotHistoryItem key={test.id || test.date || i} test={test} />
                  ))}
                </View>
              )}
            </>
          )}
        </>
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
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  expandLabel: {
    flex: 1,
    color: COLORS.accent,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  historyList: {
    marginTop: SPACING.md,
  },
  historyItem: {
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyDate: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  historyMileage: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm + 1,
    marginTop: 4,
  },
  defectList: {
    marginTop: SPACING.sm,
  },
  defectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  defectBadgeWrap: {
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  defectText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm + 1,
    lineHeight: 18,
  },
});
