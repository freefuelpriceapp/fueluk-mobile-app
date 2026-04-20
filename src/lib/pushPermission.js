/**
 * pushPermission.js
 *
 * Wraps Expo's push-permission flow with a pre-prompt dialog that explains
 * why the app wants to send notifications before the native system dialog
 * appears. The pre-prompt is only shown when the OS-level permission state
 * is "undetermined" — if the user has already granted or denied, we skip
 * straight to the underlying Expo call so we don't nag.
 */
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

const PRE_PROMPT_TITLE = 'Enable Price Alerts';
const PRE_PROMPT_MESSAGE =
  'FuelUK would like to notify you when fuel prices drop below your target. ' +
  'You can change this anytime in Settings.';

/**
 * Ensure push notification permission is granted, showing a pre-prompt
 * explaining why we want it if the OS state is "undetermined".
 *
 * @returns {Promise<'granted'|'denied'|'undetermined'>}
 */
export async function ensurePushPermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return 'granted';
  if (current.status === 'denied') return 'denied';

  // status is 'undetermined' — show explainer first.
  const proceed = await new Promise((resolve) => {
    Alert.alert(
      PRE_PROMPT_TITLE,
      PRE_PROMPT_MESSAGE,
      [
        { text: 'Not Now', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Enable', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });

  if (!proceed) return 'undetermined';

  const { status } = await Notifications.requestPermissionsAsync();
  return status;
}
