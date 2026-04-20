/**
 * PriceHistoryChart.js — Sprint 2
 *
 * Lightweight SVG line chart for 30-day fuel price history.
 * - Dark theme (bg=#1C2128, text=#E6EDF3, gridlines=#21262D)
 * - Animated pulse on the latest price dot
 * - Tap a point to see its exact price + date in a tooltip
 * - 7-day trend arrow (↑ ↓ →) comparing recent average to current
 *
 * Props:
 *   entries    — Array of { recorded_at, price_ppl } (oldest to newest OR newest to oldest; sorted internally)
 *   color      — Line colour (defaults to accent green)
 *   height     — Chart height in px (default 180)
 */
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableWithoutFeedback, Dimensions } from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText, Rect, G } from 'react-native-svg';

const CHART_BG = '#1C2128';
const TEXT = '#E6EDF3';
const MUTED = '#8B949E';
const GRID = '#21262D';
const DEFAULT_COLOR = '#2ECC71';

const PAD = { top: 16, right: 14, bottom: 28, left: 40 };

function sortAsc(entries) {
  return [...entries].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );
}

function fmtDate(d) {
  const dt = new Date(d);
  return `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}`;
}

function sevenDayTrend(sortedEntries) {
  if (!sortedEntries || sortedEntries.length < 2) return { dir: 'flat', delta: 0 };
  const current = Number(sortedEntries[sortedEntries.length - 1].price_ppl);
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = sortedEntries.filter(
    (e) => new Date(e.recorded_at).getTime() >= cutoff
  );
  if (recent.length === 0) return { dir: 'flat', delta: 0 };
  const avg = recent.reduce((s, e) => s + Number(e.price_ppl), 0) / recent.length;
  const delta = +(current - avg).toFixed(1);
  if (delta > 0.3) return { dir: 'up', delta };
  if (delta < -0.3) return { dir: 'down', delta };
  return { dir: 'flat', delta };
}

const TREND_MAP = {
  up:   { symbol: '↑', color: '#E74C3C', label: 'Rising' },
  down: { symbol: '↓', color: '#2ECC71', label: 'Falling' },
  flat: { symbol: '→', color: MUTED,      label: 'Stable'  },
};

export default function PriceHistoryChart({ entries, color = DEFAULT_COLOR, height = 180 }) {
  const [chartWidth, setChartWidth] = useState(Dimensions.get('window').width - 60);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const pulse = useRef(new Animated.Value(1)).current;

  // Sort + derive once per change
  const { points, minPrice, maxPrice, trend, sorted } = useMemo(() => {
    const safe = Array.isArray(entries) ? entries.filter(
      (e) => e && e.recorded_at && e.price_ppl != null && !isNaN(Number(e.price_ppl))
    ) : [];
    const s = sortAsc(safe);
    if (s.length === 0) {
      return { points: [], minPrice: 0, maxPrice: 0, trend: { dir: 'flat', delta: 0 }, sorted: [] };
    }
    const prices = s.map((e) => Number(e.price_ppl));
    let mn = Math.min(...prices);
    let mx = Math.max(...prices);
    // Add small padding so the line isn't pinned to the edge
    const span = mx - mn;
    if (span < 1) { mn -= 1; mx += 1; }
    else { mn -= span * 0.08; mx += span * 0.08; }
    return { points: s, minPrice: mn, maxPrice: mx, trend: sevenDayTrend(s), sorted: s };
  }, [entries]);

  // Latest-dot pulse animation
  useEffect(() => {
    if (points.length === 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.5, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [points.length, pulse]);

  // Empty state
  if (!points || points.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>No history available</Text>
      </View>
    );
  }

  const plotW = Math.max(1, chartWidth - PAD.left - PAD.right);
  const plotH = Math.max(1, height - PAD.top - PAD.bottom);
  const n = points.length;

  const xFor = (i) => PAD.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yFor = (price) =>
    PAD.top + plotH - ((Number(price) - minPrice) / (maxPrice - minPrice || 1)) * plotH;

  const polylinePoints = points.map((p, i) => `${xFor(i)},${yFor(p.price_ppl)}`).join(' ');

  // Gridlines — 4 horizontal
  const gridCount = 4;
  const gridLines = [];
  for (let g = 0; g <= gridCount; g++) {
    const yVal = minPrice + (g / gridCount) * (maxPrice - minPrice);
    const y = yFor(yVal);
    gridLines.push({ y, label: `${yVal.toFixed(0)}p` });
  }

  // X-axis labels — every 5th day
  const xLabels = [];
  for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 6))) {
    xLabels.push({ x: xFor(i), label: fmtDate(points[i].recorded_at) });
  }

  const latestIdx = n - 1;
  const selected = selectedIdx != null ? points[selectedIdx] : null;
  const selX = selectedIdx != null ? xFor(selectedIdx) : null;
  const selY = selected != null ? yFor(selected.price_ppl) : null;

  const trendCfg = TREND_MAP[trend.dir];
  const currentPrice = Number(points[latestIdx].price_ppl).toFixed(1);

  // Tap handler: find nearest point to tap X
  const handleTap = (e) => {
    const tx = e.nativeEvent.locationX;
    let bestI = 0;
    let bestDist = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(xFor(i) - tx);
      if (d < bestDist) { bestDist = d; bestI = i; }
    }
    setSelectedIdx(bestI);
  };

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
    >
      {/* Header: trend + current price */}
      <View style={styles.header}>
        <View style={styles.trendRow}>
          <Text style={[styles.trendSymbol, { color: trendCfg.color }]}>
            {trendCfg.symbol}
          </Text>
          <Text style={[styles.trendLabel, { color: trendCfg.color }]}>
            {trendCfg.label}
          </Text>
          {trend.delta !== 0 && (
            <Text style={styles.trendDelta}>
              {trend.delta > 0 ? '+' : ''}{trend.delta.toFixed(1)}p vs 7-day avg
            </Text>
          )}
        </View>
        <Text style={[styles.currentPrice, { color }]}>{currentPrice}p</Text>
      </View>

      <TouchableWithoutFeedback onPress={handleTap}>
        <View>
          <Svg width={chartWidth} height={height}>
            {/* Gridlines */}
            {gridLines.map((g, i) => (
              <G key={`g-${i}`}>
                <Line
                  x1={PAD.left}
                  y1={g.y}
                  x2={chartWidth - PAD.right}
                  y2={g.y}
                  stroke={GRID}
                  strokeWidth={1}
                />
                <SvgText
                  x={PAD.left - 6}
                  y={g.y + 4}
                  fontSize={10}
                  fill={MUTED}
                  textAnchor="end"
                >
                  {g.label}
                </SvgText>
              </G>
            ))}

            {/* X-axis labels */}
            {xLabels.map((xl, i) => (
              <SvgText
                key={`xl-${i}`}
                x={xl.x}
                y={height - 8}
                fontSize={10}
                fill={MUTED}
                textAnchor="middle"
              >
                {xl.label}
              </SvgText>
            ))}

            {/* Price line */}
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* All points as small circles */}
            {points.map((p, i) => (
              <Circle
                key={`pt-${i}`}
                cx={xFor(i)}
                cy={yFor(p.price_ppl)}
                r={2.5}
                fill={color}
              />
            ))}

            {/* Latest-dot pulse ring (static SVG ring under animated overlay below) */}
            <Circle
              cx={xFor(latestIdx)}
              cy={yFor(points[latestIdx].price_ppl)}
              r={5}
              fill={color}
              stroke={CHART_BG}
              strokeWidth={2}
            />

            {/* Selected marker */}
            {selectedIdx != null && (
              <G>
                <Line
                  x1={selX}
                  y1={PAD.top}
                  x2={selX}
                  y2={height - PAD.bottom}
                  stroke={color}
                  strokeWidth={1}
                  strokeDasharray="3,3"
                  opacity={0.5}
                />
                <Circle cx={selX} cy={selY} r={5} fill={TEXT} stroke={color} strokeWidth={2} />
              </G>
            )}
          </Svg>

          {/* Animated pulse overlay for latest point */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: xFor(latestIdx) - 8,
              top: yFor(points[latestIdx].price_ppl) - 8,
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: color,
              opacity: 0.25,
              transform: [{ scale: pulse }],
            }}
          />

          {/* Tooltip */}
          {selected && (
            <View
              style={[
                styles.tooltip,
                {
                  left: Math.min(Math.max(selX - 55, 4), chartWidth - 114),
                  top: Math.max(selY - 46, 4),
                  borderColor: color,
                },
              ]}
            >
              <Text style={styles.tooltipPrice}>
                {Number(selected.price_ppl).toFixed(1)}p
              </Text>
              <Text style={styles.tooltipDate}>
                {new Date(selected.recorded_at).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: CHART_BG,
    borderRadius: 10,
    padding: 8,
  },
  empty: {
    backgroundColor: CHART_BG,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { color: MUTED, fontSize: 13 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  trendRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  trendSymbol: { fontSize: 16, fontWeight: '800', marginRight: 4 },
  trendLabel: { fontSize: 12, fontWeight: '700', marginRight: 8 },
  trendDelta: { fontSize: 10, color: MUTED },
  currentPrice: { fontSize: 15, fontWeight: '800' },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#0D1117',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    width: 110,
    alignItems: 'center',
  },
  tooltipPrice: { color: TEXT, fontSize: 13, fontWeight: '800' },
  tooltipDate: { color: MUTED, fontSize: 11 },
});
