import { useState, useEffect, useCallback } from 'react';
import { getNearbyStations, getCheapestStations } from '../api/fuelApi';

/**
 * useStations — Sprint 6
 * Custom hook for fetching nearby and cheapest fuel stations.
 * @param {object} location - { lat, lng } from useLocation hook
 * @param {object} options - { radiusKm, fuelType, mode }
 */
export function useStations(location, options = {}) {
  const {
    radiusKm = 5,
    fuelType = 'petrol',
    mode = 'nearby', // 'nearby' | 'cheapest'
  } = options;

  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStations = useCallback(async () => {
    if (!location?.lat || !location?.lng) return;

    setLoading(true);
    setError(null);

    try {
      let data;
      if (mode === 'cheapest') {
        data = await getCheapestStations({
          lat: location.lat,
          lon: location.lng,
          radiusKm,
          fuelType,
        });
      } else {
        data = await getNearbyStations({
          lat: location.lat,
          lng: location.lng,
          radiusKm,
          fuel: fuelType,
        });
      }
      setStations(data.stations || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch stations');
    } finally {
      setLoading(false);
    }
  }, [location?.lat, location?.lng, radiusKm, fuelType, mode]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  return { stations, loading, error, refetch: fetchStations };
}

export default useStations;
