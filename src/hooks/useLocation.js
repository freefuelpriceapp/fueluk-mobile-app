import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

/**
 * useLocation
 * Returns the user's current location as { postcode, radiusKm, coords }.
 * Postcode is derived from reverse-geocoding the device GPS coordinates.
 * Falls back to a default UK postcode if permission is denied.
 */
const DEFAULT_POSTCODE = 'SW1A 1AA';
const DEFAULT_RADIUS_KM = 5;

const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const requestLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!isMounted) return;
        setPermissionStatus(status);

        if (status !== 'granted') {
          // Fall back to default location
          setLocation({
            postcode: DEFAULT_POSTCODE,
            radiusKm: DEFAULT_RADIUS_KM,
            coords: null,
          });
          return;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!isMounted) return;

        const { latitude, longitude } = pos.coords;

        // Reverse-geocode to get postcode
        const [place] = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        const postcode =
          place?.postalCode ?? DEFAULT_POSTCODE;

        setLocation({
          postcode,
          radiusKm: DEFAULT_RADIUS_KM,
          coords: { latitude, longitude },
        });
      } catch (err) {
        if (!isMounted) return;
        setError(err.message ?? 'Location error');
        setLocation({
          postcode: DEFAULT_POSTCODE,
          radiusKm: DEFAULT_RADIUS_KM,
          coords: null,
        });
      }
    };

    requestLocation();
    return () => { isMounted = false; };
  }, []);

  return { location, permissionStatus, error };
};

export default useLocation;
