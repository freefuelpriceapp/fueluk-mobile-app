import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPriceHistory, createAlert } from '../api/fuelApi';

const FUEL_TYPES = ['petrol', 'diesel', 'e10'];

const FUEL_LABELS = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  e10: 'E10',
};

const FUEL_COLORS = {
  petrol: '#2ECC71',
  diesel: '#3498DB',
  e10: '#F39C12',
};

export default function StationDetailScreen({ route }) {
  const { station } = route.params;
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFuel, setSelectedFuel] = useState('petrol');
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertFuelType, setAlertFuelType] = useState('petrol');
  const [alertThreshold, setAlertThreshold] = useState('');
  const [alertSaving, setAlertSaving] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const data = await getPriceHistory(station.id);
      setHistory(data);
    } catch (e) {
      console.error('Failed to load price history', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [station.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const openAlertModal = (fuelType) => {
    setAlertFuelType(fuelType);
    setAlertThreshold('');
    setAlertModalVisible(true);
  };

  const handleSaveAlert = async () => {
    const threshold = parseFloat(alertThreshold);
    if (isNaN(threshold) || threshold <= 0) {
      Alert.alert('Invalid price', 'Please enter a valid price threshold (e.g. 149.9)');
      return;
    }
    setAlertSaving(true);
    try {
      await createAlert({
        station_id: station.id,
        fuel_type: alertFuelType,
        threshold_ppl: threshold,
      });
      setAlertModalVisible(false);
      Alert.alert(
        'Alert set!',
        `You\'ll be notified when ${FUEL_LABELS[alertFuelType]} drops below ${threshold}p at this station.`
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to save alert. Please try again.');
    } finally {
      setAlertSaving(false);
    }
  };

  const renderPriceRow = (fuelType) => {
    const entries = history[fuelType] || [];
    const latest = entries[0];
    return (
      <View key={fuelType} style={styles.fuelCard}>
        <View style={styles.fuelHeader}>
          <View style={[styles.fuelDot, { backgroundColor: FUEL_COLORS[fuelType] }]} />
          <Text style={styles.fuelLabel}>{FUEL_LABELS[fuelType]}</Text>
          {latest ? (
            <Text style={[styles.fuelPrice, { color: FUEL_COLORS[fuelType] }]}>
              {latest.price_ppl}p
            </Text>
          ) : (
            <Text style={styles.noData}>No data</Text>
          )}
          <TouchableOpacity
            style={styles.alertBtn}
            onPress={() => openAlertModal(fuelType)}
          >
            <Ionicons name="notifications-outline" size={18} color="#2ECC71" />
          </TouchableOpacity>
        </View>
        {entries.length > 1 && (
          <View style={styles.historyList}>
            {entries.slice(1, 6).map((entry, i) => (
              <View key={i} style={styles.historyRow}>
                <Text style={styles.historyDate}>
                  {new Date(entry.recorded_at).toLocaleDateString()}
                </Text>
                <Text style={styles.historyPrice}>{entry.price_ppl}p</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2ECC71" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2ECC71" />
        }
      >
        <View style={styles.stationHeader}>
          <Text style={styles.stationName}>{station.name}</Text>
          <Text style={styles.stationAddress}>{station.address}</Text>
          {station.brand && (
            <Text style={styles.stationBrand}>{station.brand}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fuel Prices</Text>
          {FUEL_TYPES.map(renderPriceRow)}
        </View>
      </ScrollView>

      {/* Set Alert Modal */}
      <Modal
        visible={alertModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAlertModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Price Alert</Text>
            <Text style={styles.modalSubtitle}>
              Notify me when {FUEL_LABELS[alertFuelType]} drops below:
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.priceInput}
                placeholder="e.g. 149.9"
                placeholderTextColor="#888"
                keyboardType="decimal-pad"
                value={alertThreshold}
                onChangeText={setAlertThreshold}
              />
              <Text style={styles.pplLabel}>p/litre</Text>
            </View>
            <View style={styles.fuelTypeRow}>
              {FUEL_TYPES.map((ft) => (
                <TouchableOpacity
                  key={ft}
                  style={[
                    styles.fuelTypeBtn,
                    alertFuelType === ft && { backgroundColor: FUEL_COLORS[ft] },
                  ]}
                  onPress={() => setAlertFuelType(ft)}
                >
                  <Text
                    style={[
                      styles.fuelTypeBtnText,
                      alertFuelType === ft && { color: '#0D1117' },
                    ]}
                  >
                    {FUEL_LABELS[ft]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAlertModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveAlert}
                disabled={alertSaving}
              >
                {alertSaving ? (
                  <ActivityIndicator color="#0D1117" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Alert</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1117' },
  stationHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  stationName: { fontSize: 20, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  stationAddress: { fontSize: 14, color: '#888', marginBottom: 2 },
  stationBrand: { fontSize: 13, color: '#2ECC71', marginTop: 4 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 12 },
  fuelCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  fuelHeader: { flexDirection: 'row', alignItems: 'center' },
  fuelDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  fuelLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#ffffff' },
  fuelPrice: { fontSize: 18, fontWeight: '700', marginRight: 10 },
  noData: { fontSize: 13, color: '#555', marginRight: 10 },
  alertBtn: {
    padding: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2ECC71',
  },
  historyList: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#0D1117', paddingTop: 8 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  historyDate: { fontSize: 12, color: '#888' },
  historyPrice: { fontSize: 12, color: '#aaa' },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 6 },
  modalSubtitle: { fontSize: 14, color: '#888', marginBottom: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  priceInput: {
    flex: 1,
    backgroundColor: '#0D1117',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
    marginRight: 8,
  },
  pplLabel: { fontSize: 14, color: '#888' },
  fuelTypeRow: { flexDirection: 'row', marginBottom: 20 },
  fuelTypeBtn: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    marginRight: 6,
  },
  fuelTypeBtnText: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
  modalActions: { flexDirection: 'row' },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelBtnText: { color: '#888', fontWeight: '600' },
  saveBtn: {
    flex: 2,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#2ECC71',
    alignItems: 'center',
  },
  saveBtnText: { color: '#0D1117', fontWeight: '700', fontSize: 15 },
});
