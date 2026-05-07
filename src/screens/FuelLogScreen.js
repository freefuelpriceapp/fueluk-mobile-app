/**
 * FuelLogScreen — main receipt log screen.
 *
 * - Header: total £ saved this month from receipts
 * - List: receipts grouped by month, newest first
 * - FAB: camera icon → ReceiptCaptureScreen
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../lib/theme';
import {
  loadReceipts,
  groupReceiptsByMonth,
} from '../lib/receiptRepository';
import {
  computeMonthSavings,
} from '../lib/receiptSavings';

function formatPence(pence) {
  if (typeof pence !== 'number' || pence <= 0) return '£0.00';
  const pounds = Math.floor(pence / 100);
  const pennies = Math.round(pence % 100);
  return `£${pounds}.${String(pennies).padStart(2, '0')}`;
}

function formatPpl(ppl) {
  if (typeof ppl !== 'number') return '—';
  return `${ppl.toFixed(1)}p`;
}

function formatLitres(l) {
  if (typeof l !== 'number') return '—';
  return `${l.toFixed(2)}L`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const FUEL_TYPE_LABELS = {
  unleaded: 'Unleaded',
  super_unleaded: 'Super Unleaded',
  diesel: 'Diesel',
  premium_diesel: 'Premium Diesel',
};

function ReceiptRow({ receipt }) {
  const savings = null; // computed separately in header
  return (
    <View style={styles.receiptRow}>
      <View style={styles.receiptIcon}>
        <Ionicons name="receipt-outline" size={18} color={COLORS.accent} />
      </View>
      <View style={styles.receiptContent}>
        <Text style={styles.receiptStation} numberOfLines={1}>
          {receipt.stationName || receipt.stationBrand || 'Unknown station'}
        </Text>
        <Text style={styles.receiptMeta}>
          {FUEL_TYPE_LABELS[receipt.fuelType] || receipt.fuelType} ·{' '}
          {formatLitres(receipt.litres)} · {formatPpl(receipt.pricePerLitre)}
        </Text>
      </View>
      <View style={styles.receiptRight}>
        <Text style={styles.receiptTotal}>{formatPence(receipt.totalPaid)}</Text>
        <Text style={styles.receiptDate}>{formatDate(receipt.receiptDate)}</Text>
      </View>
    </View>
  );
}

function MonthSection({ group }) {
  return (
    <View style={styles.monthSection}>
      <Text style={styles.monthLabel}>{group.label}</Text>
      {group.receipts.map((r) => (
        <ReceiptRow key={r.id} receipt={r} />
      ))}
    </View>
  );
}

export default function FuelLogScreen({ navigation }) {
  const [receipts, setReceipts] = useState(null);
  const [groups, setGroups] = useState([]);
  const [monthSavingsPence, setMonthSavingsPence] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await loadReceipts();
      setReceipts(all);
      const grouped = groupReceiptsByMonth(all);
      setGroups(grouped);
      const thisMonth = new Date().toISOString().slice(0, 7);
      setMonthSavingsPence(computeMonthSavings(all, thisMonth));
    } catch (_e) {
      setReceipts([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const isEmpty = !loading && (!receipts || receipts.length === 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header savings card */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Ionicons name="trending-down-outline" size={16} color={COLORS.accent} />
          <Text style={styles.headerLabel}>Saved this month</Text>
        </View>
        <Text style={styles.headerAmount}>{formatPence(monthSavingsPence)}</Text>
        <Text style={styles.headerSub}>
          {receipts && receipts.length > 0
            ? `vs national average · ${receipts.length} fill-up${receipts.length !== 1 ? 's' : ''} logged`
            : 'Log your first receipt to start tracking'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      ) : isEmpty ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No receipts yet</Text>
          <Text style={styles.emptySub}>
            Tap the camera button to snap your first fuel receipt.
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.monthKey}
          renderItem={({ item }) => <MonthSection group={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ReceiptCapture')}
        accessibilityLabel="Add fuel receipt"
        accessibilityRole="button"
        activeOpacity={0.85}
      >
        <Ionicons name="camera" size={28} color={COLORS.background} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.card,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.accent,
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptySub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 80,
    paddingHorizontal: 12,
  },
  monthSection: {
    marginBottom: 16,
  },
  monthLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 6,
  },
  receiptIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#0d2d1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  receiptContent: {
    flex: 1,
  },
  receiptStation: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  receiptMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  receiptRight: {
    alignItems: 'flex-end',
  },
  receiptTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  receiptDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
