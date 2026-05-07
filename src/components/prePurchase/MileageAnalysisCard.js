import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { COLORS, SPACING, FONT_SIZES } from '../../lib/theme';
import { UK_AVG_MILES_PER_YEAR } from '../../lib/prePurchaseCheck';

const SPARK_W = 280;
const SPARK_H = 60;

function buildPath(points) {
  if (!points || points.length === 0) return '';
  const xs = points.map((p) => new Date(p.date).getTime());
  const ys = points.map((p) => p.mileage);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const xSpan = Math.max(maxX - minX, 1);
  const ySpan = Math.max(maxY - minY, 1);
  return points
    .map((p) => {
      const x = ((new Date(p.date).getTime() - minX) / xSpan) * (SPARK_W - 8) + 4;
      const y = SPARK_H - 4 - ((p.mileage - minY) / ySpan) * (SPARK_H - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export default function MileageAnalysisCard({ mileage }) {
  if (!mileage || mileage.points.length === 0) {
    return null;
  }
  const { points, avgMilesPerYear, yoyDrop, biggestDropMiles, variancePct } = mileage;
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Mileage analysis</Text>

      {yoyDrop && (
        <View style={styles.alertBanner}>
          <Ionicons name="warning" size={18} color={COLORS.error} />
          <Text style={styles.alertText}>
            Possible mileage discrepancy: {biggestDropMiles.toLocaleString('en-GB')} mile drop between MOTs.
          </Text>
        </View>
      )}

      <View style={styles.chartWrap}>
        <Svg width={SPARK_W} height={SPARK_H}>
          <Polyline
            points={buildPath(points)}
            stroke={yoyDrop ? COLORS.error : COLORS.accent}
            strokeWidth={2}
            fill="none"
          />
          {points.map((p, i) => {
            const xs = points.map((q) => new Date(q.date).getTime());
            const ys = points.map((q) => q.mileage);
            const xSpan = Math.max(Math.max(...xs) - Math.min(...xs), 1);
            const ySpan = Math.max(Math.max(...ys) - Math.min(...ys), 1);
            const x = ((new Date(p.date).getTime() - Math.min(...xs)) / xSpan) * (SPARK_W - 8) + 4;
            const y = SPARK_H - 4 - ((p.mileage - Math.min(...ys)) / ySpan) * (SPARK_H - 8);
            return <Circle key={i} cx={x} cy={y} r={2.5} fill={yoyDrop ? COLORS.error : COLORS.accent} />;
          })}
        </Svg>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Avg miles/year</Text>
          <Text style={styles.statValue}>
            {avgMilesPerYear != null ? avgMilesPerYear.toLocaleString('en-GB') : '—'}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>UK average</Text>
          <Text style={styles.statValue}>{UK_AVG_MILES_PER_YEAR.toLocaleString('en-GB')}</Text>
        </View>
        {variancePct != null && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>vs UK avg</Text>
            <Text
              style={[
                styles.statValue,
                Math.abs(variancePct) > 50 ? styles.warning : null,
              ]}
            >
              {variancePct > 0 ? '+' : ''}{variancePct}%
            </Text>
          </View>
        )}
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
  heading: { color: COLORS.text, fontSize: FONT_SIZES.lg, fontWeight: '700', marginBottom: SPACING.sm },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231,76,60,0.15)',
    borderRadius: 10,
    padding: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.4)',
    marginBottom: SPACING.md,
  },
  alertText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.sm + 1,
    fontWeight: '700',
    marginLeft: 6,
    flex: 1,
  },
  chartWrap: { alignItems: 'center', marginVertical: SPACING.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.sm },
  stat: { flex: 1 },
  statLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZES.xs + 1, marginBottom: 2 },
  statValue: { color: COLORS.text, fontSize: FONT_SIZES.md, fontWeight: '700' },
  warning: { color: COLORS.warning },
});
