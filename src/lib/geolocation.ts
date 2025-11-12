import { Geolocation, Position, PositionOptions } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

/**
 * Geolocation utility functions for both web and native GPS integration
 */

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface LocationError {
  message: string;
  code?: number;
}

/**
 * Get current position using browser geolocation API (web fallback)
 */
async function getBrowserPosition(timeout: number = 30000): Promise<LocationCoordinates | null> {
  console.log('[Geolocation] Using browser geolocation API');
  
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.error('[Geolocation] Browser geolocation not supported');
      resolve(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      console.error('[Geolocation] Browser geolocation timeout after', timeout, 'ms');
      resolve(null);
    }, timeout);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        console.log('[Geolocation] Browser position obtained:', {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
        });
      },
      (error) => {
        clearTimeout(timeoutId);
        console.error('[Geolocation] Browser geolocation error:', error.message, 'Code:', error.code);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: timeout,
        maximumAge: 0
      }
    );
  });
}

/**
 * Get current position with high accuracy
 * Supports both web browser and native Capacitor
 */
export async function getCurrentPosition(
  options?: PositionOptions
): Promise<LocationCoordinates | null> {
  const timeout = options?.timeout || 30000; // Default 30 seconds
  
  console.log('[Geolocation] Getting current position, platform:', Capacitor.getPlatform());
  
  // Check if we're on a native platform and Capacitor Geolocation is available
  if (Capacitor.isNativePlatform()) {
    console.log('[Geolocation] Using Capacitor native geolocation');
    try {
      const position: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: timeout,
        maximumAge: 0,
        ...options,
      });

      console.log('[Geolocation] Native position obtained:', {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
      };
    } catch (error: any) {
      console.error('[Geolocation] Capacitor geolocation error:', error);
      // Fall back to browser API if Capacitor fails
      console.log('[Geolocation] Falling back to browser API');
      return getBrowserPosition(timeout);
    }
  } else {
    // Web platform - use browser geolocation
    return getBrowserPosition(timeout);
  }
}

/**
 * Watch position changes (for live tracking)
 * Optimized for smooth real-time GPS tracking with reduced timeout
 */
export async function watchPosition(
  callback: (position: LocationCoordinates) => void,
  errorCallback?: (error: LocationError) => void,
  options?: PositionOptions
): Promise<string> {
  try {
    const watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 1000,
        ...options,
      },
      (position, error) => {
        if (error) {
          errorCallback?.({
            message: error.message || 'Unknown geolocation error',
            code: error.code,
          });
          return;
        }

        if (position) {
          callback({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
          });
        }
      }
    );

    return watchId;
  } catch (error: any) {
    console.error('Error watching position:', error);
    throw error;
  }
}

/**
 * Clear position watch
 */
export async function clearWatch(watchId: string): Promise<void> {
  try {
    await Geolocation.clearWatch({ id: watchId });
  } catch (error) {
    console.error('Error clearing watch:', error);
  }
}

/**
 * Check if geolocation permissions are granted
 */
export async function checkPermissions(): Promise<'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'> {
  try {
    const permissions = await Geolocation.checkPermissions();
    return permissions.location;
  } catch (error) {
    console.error('Error checking permissions:', error);
    return 'denied';
  }
}

/**
 * Request geolocation permissions
 */
export async function requestPermissions(): Promise<boolean> {
  try {
    const permissions = await Geolocation.requestPermissions();
    return permissions.location === 'granted';
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return false;
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Convert meters to yards
 */
export function metersToYards(meters: number): number {
  return meters * 1.09361;
}

/**
 * Convert meters to feet
 */
export function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

/**
 * Format distance for display
 */
export function formatDistance(
  meters: number,
  unit: 'metric' | 'imperial' = 'imperial'
): string {
  if (unit === 'imperial') {
    const yards = Math.round(metersToYards(meters));
    if (yards < 1000) {
      return `${yards} yds`;
    } else {
      return `${(yards / 1760).toFixed(1)} mi`;
    }
  } else {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      return `${(meters / 1000).toFixed(1)} km`;
    }
  }
}

/**
 * Get accuracy level description
 */
export function getAccuracyLevel(accuracy: number): {
  level: 'excellent' | 'good' | 'fair' | 'poor';
  description: string;
  color: string;
} {
  if (accuracy <= 5) {
    return {
      level: 'excellent',
      description: 'Excellent GPS signal',
      color: 'text-green-500',
    };
  } else if (accuracy <= 10) {
    return {
      level: 'good',
      description: 'Good GPS signal',
      color: 'text-blue-500',
    };
  } else if (accuracy <= 20) {
    return {
      level: 'fair',
      description: 'Fair GPS signal',
      color: 'text-yellow-500',
    };
  } else {
    return {
      level: 'poor',
      description: 'Poor GPS signal',
      color: 'text-red-500',
    };
  }
}

/**
 * Calculate bearing between two coordinates (in degrees)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return ((θ * 180) / Math.PI + 360) % 360; // in degrees
}
