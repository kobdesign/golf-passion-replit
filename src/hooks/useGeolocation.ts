import { useState, useEffect, useCallback } from 'react';
import { 
  getCurrentPosition, 
  watchPosition, 
  clearWatch,
  checkPermissions,
  requestPermissions,
  LocationCoordinates 
} from '@/lib/geolocation';

interface UseGeolocationOptions {
  watch?: boolean;
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

interface UseGeolocationReturn {
  position: LocationCoordinates | null;
  error: string | null;
  loading: boolean;
  accuracy: number | null;
  refresh: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
  hasPermission: boolean | null;
}

/**
 * Hook for accessing device geolocation with native support
 * 
 * @example
 * ```tsx
 * const { position, error, loading, accuracy } = useGeolocation({ watch: true });
 * 
 * if (loading) return <div>Getting location...</div>;
 * if (error) return <div>Error: {error}</div>;
 * if (!position) return <div>No location available</div>;
 * 
 * return (
 *   <div>
 *     <p>Lat: {position.latitude}</p>
 *     <p>Lng: {position.longitude}</p>
 *     <p>Accuracy: {accuracy}m</p>
 *   </div>
 * );
 * ```
 */
export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const [position, setPosition] = useState<LocationCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const {
    watch = false,
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
  } = options;

  // Check permissions on mount
  useEffect(() => {
    const checkPerms = async () => {
      const permission = await checkPermissions();
      setHasPermission(permission === 'granted');
    };
    checkPerms();
  }, []);

  const requestPermission = useCallback(async () => {
    const granted = await requestPermissions();
    setHasPermission(granted);
    return granted;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const pos = await getCurrentPosition({
        enableHighAccuracy,
        timeout,
        maximumAge,
      });

      if (pos) {
        setPosition(pos);
        setError(null);
      } else {
        setError('Failed to get location');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get location');
    } finally {
      setLoading(false);
    }
  }, [enableHighAccuracy, timeout, maximumAge]);

  useEffect(() => {
    let watchId: string | null = null;

    const setupGeolocation = async () => {
      setLoading(true);
      setError(null);

      try {
        if (watch) {
          // Watch position continuously
          watchId = await watchPosition(
            (pos) => {
              setPosition(pos);
              setError(null);
              setLoading(false);
            },
            (err) => {
              setError(err.message);
              setLoading(false);
            },
            {
              enableHighAccuracy,
              timeout,
              maximumAge,
            }
          );
        } else {
          // Get position once
          const pos = await getCurrentPosition({
            enableHighAccuracy,
            timeout,
            maximumAge,
          });

          if (pos) {
            setPosition(pos);
            setError(null);
          } else {
            setError('Failed to get location');
          }
          setLoading(false);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to get location');
        setLoading(false);
      }
    };

    setupGeolocation();

    return () => {
      if (watchId) {
        clearWatch(watchId);
      }
    };
  }, [watch, enableHighAccuracy, timeout, maximumAge]);

  return {
    position,
    error,
    loading,
    accuracy: position?.accuracy ?? null,
    refresh,
    requestPermission,
    hasPermission,
  };
}
