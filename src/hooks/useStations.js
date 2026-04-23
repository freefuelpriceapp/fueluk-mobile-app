import { useState, useEffect, useCallback } from 'react';
import { getNearbyStations, getCheapestStations } from '../api/fuelApi';

/**
 * useStations — Sprint 6 + differentiators v1.
 * Custom hook for fetching nearby and cheapest fuel stations.
 *
 * Returns: { stations, loading, error, refetch, meta }
 * where meta exposes the new top-level backend fields so the map and list
 * screens can surface them without re-fetching.
 *
 * @param {object} location - { lat, lng } from useLocation hook
 * @param {object} options  - { radiusKm, fuelType, mode, mpg, tankFillLitres }
 */
export function useStations(location, options = {}) {
  const {
    radiusKm = 5,
    fuelType = 'petrol',
    mode = 'nearby',       // 'nearby' | 'cheapest'
    mpg = null,
    tankFillLitres = null,
  } = options;

  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({
    nationalTrajectory: null,
    bestValue: null,
    bestValueReason: null,
  });

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
          mpg,
          tankFillLitres,
        });
      } else {
        data = await getNearbyStations({
          lat: location.lat,
          lng: location.lng,
          radiusKm,
          fuel: fuelType,
          mpg,
          tankFillLitres,
        });
      }
      setStations(data.stations || []);
      setMeta({
        nationalTrajectory:
          data?.national_trajectory && typeof data.national_trajectory === 'object'
            ? data.national_trajectory
            : null,
        bestValue: data?.best_value || null,
        bestValueReason:
          typeof data?.best_value_reason === 'string' ? data.best_value_reason : null,
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch stations');
    } finally {
      setLoading(false);
    }
  }, [location?.lat, location?.lng, radiusKm, fuelType, mode, mpg, tankFillLitres]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  return { stations, loading, error, refetch: fetchStations, meta };
}

export default useStations;
