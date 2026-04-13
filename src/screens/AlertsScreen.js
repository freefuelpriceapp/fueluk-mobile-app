import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { getAlerts, deleteAlert } from '../api/fuelApi';
import * as Notifications from 'expo-notifications';

const FUEL_LABELS = { petrol: 'Petrol', diesel: 'Diesel', e10: 'E10' };
const FUEL_COLOURS = { petrol: '#2ECC71', diesel: '#3498DB', e10: '#F39C12' };

/**
 * AlertsScreen — Sprint 4
 * Lists all active price alerts for this device.
 * Allows the user to delete individual alerts.
 * Requests push notification permission on mount.
 */
const AlertsScreen = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [deviceToken, setDeviceToken] = useState(null);

  // Request push permission and obtain Expo push token
  useEffect(() => {
    (async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.log('[AlertsScreen] Push permission not granted');
          return;
        }
        const tokenData = await Notifications.getExpoPushTokenAsync();
        setDeviceToken(tokenData.data);
      } catch (err) {
        console.log('[AlertsScreen] Could not get push token:', err.message);
      }
    })();
  }, []);

  const fetchAlerts = useCallback(async () => {
    if (!deviceToken) return;
    try {
      setError(null);
      const data = await getAlerts(deviceToken);
      setAlerts(data.alerts || []);
    } catch (err) {
      setError('Unable to load alerts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [deviceToken]);

  useEffect(() => {
    if (deviceToken) fetchAlerts();
    else setLoading(false);
  }, [deviceToken, fetchAlerts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  const handleDelete = (alert) => {
    Alert.alert(
      'Remove Alert',
      `Remove the ${FUEL_LABELS[alert.fuel_type] || alert.fuel_type} alert for ${alert.station_name || alert.station_brand}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAlert(alert.id);
              setAlerts(prev => prev.filter(a => a.id !== alert.id));
            } catch (err) {
              Alert.alert('Error', 'Could not remove alert. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatPrice = (pence) => {
    if (pence == null) return 'N/A';
    return `${(pence / 100).toFixed(1)}p`;
  };

  const renderAlert = ({ item }) => (
    <View style={styles.alertCard}>
      <View style={styles.alertHeader}>
        <View style={[styles.fuelBadge, { backgroundColor: FUEL_COLOURS[item.fuel_type] || '#888' }]}>
          <Text style={styles.fuelBadgeText}>{FUEL_LABELS[item.fuel_type] || item.fuel_type}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>Remove</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.stationName}>{item.station_name || item.station_brand}</Text>
      <Text style={styles.stationAddress}>{item.address}</Text>
      <View style={styles.alertDetails}>
        <Text style={styles.alertLabel}>Alert when below</Text>
        <Text style={styles.alertThreshold}>{formatPrice(item.threshold_pence)}</Text>
      </View>
    </View>
  );

  if (!deviceToken && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Notifications not enabled</Text>
          <Text style={styles.emptySubtitle}>
            Enable push notifications to set up price alerts.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#2ECC71" style={styles.loader} />
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchAlerts}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderAlert}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2ECC71" />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>Your Price Alerts</Text>
              <Text style={styles.listHeaderSubtitle}>
                You'll be notified when prices drop to your target.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No alerts set</Text>
              <Text style={styles.emptySubtitle}>
                Tap "Set Alert" on a station's detail page to get notified
                when its fuel price drops to your target.
              </Text>
            </View>
          }
          contentContainerStyle={alerts.length === 0 && styles.emptyContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  loader: { marginTop: 60 },
  listHeader: { padding: 20, paddingBottom: 8 },
  listHeaderTitle: { fontSize: 20, fontWeight: '700', color: '#E6EDF3', marginBottom: 4 },
  listHeaderSubtitle: { fontSize: 13, color: '#8B949E' },
  alertCard: {
    margin: 12,
    marginBottom: 0,
    backgroundColor: '#161B22',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#21262D',
  },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  fuelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  fuelBadgeText: { fontSize: 12, fontWeight: '700', color: '#0D1117' },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#F85149' },
  deleteBtnText: { fontSize: 12, color: '#F85149', fontWeight: '600' },
  stationName: { fontSize: 16, fontWeight: '600', color: '#E6EDF3', marginBottom: 2 },
  stationAddress: { fontSize: 12, color: '#8B949E', marginBottom: 12 },
  alertDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#21262D', paddingTop: 10 },
  alertLabel: { fontSize: 13, color: '#8B949E' },
  alertThreshold: { fontSize: 20, fontWeight: '700', color: '#2ECC71' },
  emptyContainer: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#E6EDF3', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#8B949E', textAlign: 'center', lineHeight: 20 },
  errorText: { color: '#F85149', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#2ECC71', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#0D1117', fontWeight: '700', fontSize: 14 },
});

export default AlertsScreen;
