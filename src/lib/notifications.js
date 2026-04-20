/**
 * notifications.js
 *
 * Sets up notification handling for the app:
 * - Android: creates a dedicated "Price Alerts" channel so users see a
 *   meaningful entry in system notification settings instead of "default".
 * - Foreground handler: ensures push notifications are shown to the user
 *   even when the app is open (iOS otherwise suppresses them).
 * - Tap handler: when the user taps a price alert, we navigate to the
 *   relevant station if the payload carries a stationId.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { logger } from './logger';

export const PRICE_ALERTS_CHANNEL_ID = 'price-alerts';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let channelConfigured = false;
let responseSubscription = null;

export async function configureAndroidChannels() {
  if (Platform.OS !== 'android' || channelConfigured) return;
  try {
    await Notifications.setNotificationChannelAsync(PRICE_ALERTS_CHANNEL_ID, {
      name: 'Price Alerts',
      description: 'Notifications when fuel prices drop below your target',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2ECC71',
    });
    channelConfigured = true;
  } catch (err) {
    try { logger.warn('notif_channel_failed', {}, err); } catch (_) {}
  }
}

/**
 * Register a listener that navigates to the station screen when the user
 * taps a price-alert notification. Safe to call multiple times — only the
 * most recent navigationRef is used.
 *
 * @param {{ current: any }} navigationRef — React Navigation ref
 * @returns {() => void} unsubscribe
 */
export function registerNotificationResponseHandler(navigationRef) {
  if (responseSubscription) {
    responseSubscription.remove();
    responseSubscription = null;
  }
  responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    try {
      const data = response?.notification?.request?.content?.data || {};
      const stationId = data.stationId || data.station_id;
      if (stationId && navigationRef?.current?.isReady?.()) {
        // TODO: confirm payload shape with backend once push sender is wired up.
        navigationRef.current.navigate('Home', {
          screen: 'StationDetail',
          params: { stationId },
        });
      }
    } catch (err) {
      try { logger.warn('notif_tap_handler_failed', {}, err); } catch (_) {}
    }
  });
  return () => {
    if (responseSubscription) {
      responseSubscription.remove();
      responseSubscription = null;
    }
  };
}

export async function initNotifications() {
  await configureAndroidChannels();
}
