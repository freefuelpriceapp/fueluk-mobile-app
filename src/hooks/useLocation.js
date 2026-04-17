import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

/**
 * useLocation
 * Returns the user's current location as { postcode, radiusKm, coords }.
 * Postcode is derived from reverse-geocoding the device GPS coordinates.
 * Falls back to a default UK location if permission is denied, times out,
 * or if the platform is web (Snack preview) where expo-location is unreliable.
 */
const DEFAULT_POSTCODE = 'SW1A 1AA';
const DEFAULT_RADIUS_KM = 5;
// Central London (Westminster) used as fallback coords so the /nearby API is exercised.
const DEFAULT_COORDS = { latitude: 51.5074, longitude: -0.1278 };
const PERMISSION_TIMEOUT_MS = 6000;

const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const applyFallback = () => {
      if (!isMounted) return;
      setLocation({
        postcode: DEFAULT_POSTCODE,
        radiusKm: DEFAULT_RADIUS_KM,
        coords: DEFAULT_COORDS,
      });
    };

    // Web / Snack preview: expo-location permission prompts do not resolve reliably.
    // Short-circuit with a usable default so the /nearby endpoint is hit and prices render.
    if (Platform.OS === 'web') {
      setPermissionStatus('web-fallback');
      applyFallback();
      return () => { isMounted = false; };
    }

    const requestLocation = async () => {
      try {
        // Safety timeout so UI never hangs on an unresponsive permission prompt.
        const timeoutId = setTimeout(() => {
          if (isMounted) applyFallback();
        }, PERMISSION_TIMEOUT_MS);

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!isMounted) { clearTimeout(timeoutId); return; }
        setPermissionStatus(status);

        if (status !== 'granted') {
          clearTimeout(timeoutId);
          applyFallback();
          return;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        clearTimeout(timeoutId);
        if (!isMounted) return;

        const { latitude, longitude } = pos.coords;

        // Reverse-geocode to get postcode (best-effort; failure is non-fatal).
        let postcode = DEFAULT_POSTCODE;
        try {
          const results = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (results && results[0] && results[0].postalCode) {
            postcode = results[0].postalCode;
          }
        } catch (_e) {
          // Ignore reverse-geocode errors, keep default postcode.
        }

        if (!isMounted) return;
        setLocation({
          postcode,
          radiusKm: DEFAULT_RADIUS_KM,
          coords: { latitude, longitude },
        });
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || 'Failed to get location');
        applyFallback();
      }
    };

    requestLocation();
    return () => { isMounted = false; };
  }, []);

  return { location, permissionStatus, error };
};

export default useLocation;
