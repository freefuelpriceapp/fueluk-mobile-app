import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '../../lib/theme';
import StatusBadge from '../vehicle/StatusBadge';

function formatDate(raw) {
  if (!raw) return 'Unknown';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function MotRow({ test }) {
  const passed = test.testResult === 'PASSED';
  const mileage = test.odometerValue;
  return (
    <View style={styles.row}>
      <View style={styles.dotCol}>
        <View style={[styles.dot, { backgroundColor: passed ? COLORS.accent : COLORS.error }]} />
        <View style={styles.line} />
      </View>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.date}>{formatDate(test.completedDate)}</Text>
          <StatusBadge label={passed ? 'PASSED' : 'FAILED'} tone={passed ? 'success' : 'error'} />
        </View>
        <View style={styles.metaRow}>
          {mileage != null && (
            <Text style={styles.meta}>
              {Number(mileage).toLocaleString('en-GB')} {test.odometerUnit || 'mi'}
            </Text>
          )}
          {test.advisoryCount > 0 && (
            <Text style={styles.metaPill}>{test.advisoryCount} advisory{test.advisoryCount === 1 ? '' : ' items'}</Text>
          )}
          {test.dangerousCount > 0 && (
            <Text style={[styles.metaPill, styles.danger]}>{test.dangerousCount} dangerous</Text>
          )}
        </View>
      </View>
    </View>
  );
}

export default function MotTimeline({ tests }) {
  if (!Array.isArray(tests) || tests.length === 0) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>MOT history</Text>
      <Text style={styles.sub}>Newest first · {tests.length} test{tests.length === 1 ? '' : 's'}</Text>
      <View style={styles.list}>
        {tests.map((t, i) => (
          <MotRow key={t.motTestNumber || `${t.completedDate}-${i}`} test={t} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heading: {
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  sub: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  list: { marginTop: SPACING.sm },
  row: { flexDirection: 'row' },
  dotCol: { width: 18, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
  line: { flex: 1, width: 2, backgroundColor: COLORS.border, marginTop: 4 },
  body: { flex: 1, paddingBottom: SPACING.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  date: { color: COLORS.text, fontSize: FONT_SIZES.md, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  meta: { color: COLORS.textSecondary, fontSize: FONT_SIZES.sm + 1, marginRight: SPACING.md },
  metaPill: {
    color: COLORS.warning,
    fontSize: FONT_SIZES.sm,
    backgroundColor: 'rgba(243,156,18,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
    marginTop: 2,
  },
  danger: { color: COLORS.error, backgroundColor: 'rgba(231,76,60,0.15)' },
});
