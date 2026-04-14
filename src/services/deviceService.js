/**
 * deviceService.js
 * Handles device token registration for push notifications.
 * Sprint 9 — MVP device onboarding service
 */

import apiClient from './apiClient';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Request push notification permissions and get Expo push token.
 * @returns {string|null} Expo push token or null if permission denied
 */
export const getExpoPushToken = async () => {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission denied');
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
};

/**
 * Register device token with the backend API.
 * @param {string} expoPushToken - Expo push token
 * @param {string} platform - 'ios' or 'android'
 * @returns {object} Registration response
 */
export const registerDevice = async (expoPushToken, platform) => {
  try {
    const response = await apiClient.post('/device/register', {
      token: expoPushToken,
      platform: platform || Platform.OS,
    });
    return response.data;
  } catch (error) {
    console.error('Device registration error:', error.message);
    throw error;
  }
};

/**
 * Full device onboarding flow:
 * 1. Request permission
 * 2. Get push token
 * 3. Register with backend
 * @returns {object|null} Registration result or null
 */
export const onboardDevice = async () => {
  try {
    const token = await getExpoPushToken();
    if (!token) return null;

    const result = await registerDevice(token, Platform.OS);
    console.log('Device registered:', result);
    return result;
  } catch (error) {
    console.error('Device onboarding failed:', error.message);
    return null;
  }
};

export default {
  getExpoPushToken,
  registerDevice,
  onboardDevice,
};
