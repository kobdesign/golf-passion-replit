import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getCurrentPosition, getAccuracyLevel } from '@/lib/geolocation';
import { Crosshair, MapPin, Navigation } from 'lucide-react';

interface SimpleHoleMapProps {
  mapboxToken: string;
  teeCoords: [number, number];
  pinCoords: [number, number];
  targetCoords?: [number, number];
  teeColor?: string;
}

// GPS mode types
type TargetMode = 'pin' | 'gps';

// Helper: Calculate distance in yards between two points
const calculateDistance = (from: [number, number], to: [number, number]): number => {
  const R = 6371000; // Earth radius in meters
  const lat1 = from[1] * Math.PI / 180;
  const lat2 = to[1] * Math.PI / 180;
  const deltaLat = (to[1] - from[1]) * Math.PI / 180;
  const deltaLon = (to[0] - from[0]) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = R * c;
  const distanceYards = distanceMeters * 1.09361; // Convert to yards
  return Math.round(distanceYards);
};

// Helper: Calculate bearing from point A to point B
const calculateBearing = (from: [number, number], to: [number, number]): number => {
  const lat1 = from[1] * Math.PI / 180;
  const lat2 = to[1] * Math.PI / 180;
  const deltaLon = (to[0] - from[0]) * Math.PI / 180;

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  
  return (bearing + 360) % 360; // Normalize to 0-360
};

// Helper: Create circular marker element
const createCircleMarker = (color: string, size: number = 16): HTMLDivElement => {
  const el = document.createElement('div');
  el.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    background-color: ${color};
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    cursor: pointer;
  `;
  return el;
};

// Helper: Create crosshair/target icon element
const createCrosshairMarker = (size: number = 40): HTMLDivElement => {
  const el = document.createElement('div');
  el.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    cursor: move;
    position: relative;
    z-index: 1000;
  `;
  
  // Create SVG crosshair
  el.innerHTML = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="none" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="6" fill="none" stroke="white" stroke-width="2"/>
      <line x1="12" y1="2" x2="12" y2="8" stroke="white" stroke-width="2"/>
      <line x1="12" y1="16" x2="12" y2="22" stroke="white" stroke-width="2"/>
      <line x1="2" y1="12" x2="8" y2="12" stroke="white" stroke-width="2"/>
      <line x1="16" y1="12" x2="22" y2="12" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="2" fill="white"/>
    </svg>
  `;
  
  return el;
};

// Helper: Create GPS marker with pulse animation
const createGPSMarker = (active: boolean = false): HTMLDivElement => {
  const el = document.createElement('div');
  const markerSize = 20;
  const pulseSize = 40;
  
  el.style.cssText = `
    width: ${pulseSize}px;
    height: ${pulseSize}px;
    position: relative;
    cursor: pointer;
  `;
  
  // Add pulse animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 0.8;
      }
      50% {
        transform: scale(1.5);
        opacity: 0.3;
      }
      100% {
        transform: scale(1);
        opacity: 0.8;
      }
    }
    .gps-pulse {
      animation: pulse 2s ease-out infinite;
    }
  `;
  document.head.appendChild(style);
  
  // Create the GPS marker structure
  el.innerHTML = `
    <div style="position: absolute; top: ${(pulseSize - markerSize) / 2}px; left: ${(pulseSize - markerSize) / 2}px;">
      ${active ? `<div class="gps-pulse" style="position: absolute; width: ${markerSize}px; height: ${markerSize}px; background-color: #3b82f6; border-radius: 50%; opacity: 0.3;"></div>` : ''}
      <div style="width: ${markerSize}px; height: ${markerSize}px; background-color: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative; z-index: 10;">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 6px; height: 6px; background-color: white; border-radius: 50%;"></div>
      </div>
    </div>
  `;
  
  return el;
};

export const SimpleHoleMap = ({ 
  mapboxToken, 
  teeCoords, 
  pinCoords,
  targetCoords,
  teeColor = '#3b82f6' // Default blue
}: SimpleHoleMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const targetMarker = useRef<mapboxgl.Marker | null>(null);
  const teeToTargetLabelMarker = useRef<mapboxgl.Marker | null>(null);
  const targetToPinLabelMarker = useRef<mapboxgl.Marker | null>(null);
  const gpsMarker = useRef<mapboxgl.Marker | null>(null);
  const pinMarker = useRef<mapboxgl.Marker | null>(null);
  const firstLineSourceMarker = useRef<mapboxgl.Marker | null>(null);
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const [targetMode, setTargetMode] = useState<TargetMode>('pin');
  const targetModeRef = useRef<TargetMode>('pin'); // Add ref to track current targetMode value
  const [gpsPosition, setGpsPosition] = useState<[number, number] | null>(null);
  const gpsPositionRef = useRef<[number, number] | null>(null); // Add ref for gpsPosition
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'loading' | 'success' | 'error'>('loading');
  
  // Extract scalar values
  const teeLng = teeCoords[0];
  const teeLat = teeCoords[1];
  const pinLng = pinCoords[0];
  const pinLat = pinCoords[1];
  
  // Use provided target or calculate default midpoint
  const initialTargetLng = targetCoords?.[0] ?? (teeLng + pinLng) / 2;
  const initialTargetLat = targetCoords?.[1] ?? (teeLat + pinLat) / 2;
  
  // Track current target position (can be dragged by user)
  const [currentTarget, setCurrentTarget] = useState<[number, number]>([initialTargetLng, initialTargetLat]);
  
  // Keep refs synchronized with state values
  useEffect(() => {
    targetModeRef.current = targetMode;
  }, [targetMode]);
  
  useEffect(() => {
    gpsPositionRef.current = gpsPosition;
  }, [gpsPosition]);
  
  // Get the origin position based on current mode
  const getOriginPosition = (): [number, number] => {
    if (targetMode === 'gps' && gpsPosition) {
      return gpsPosition;
    }
    return [pinLng, pinLat];
  };
  
  // Get the origin label based on current mode
  const getOriginLabel = (): string => {
    return targetMode === 'gps' ? 'GPS' : 'Pin';
  };
  
  // Fetch GPS position
  const fetchGPSPosition = async () => {
    setGpsStatus('loading');
    try {
      const position = await getCurrentPosition({ 
        enableHighAccuracy: true,
        timeout: 10000
      });
      
      if (position) {
        const newGpsPos: [number, number] = [position.longitude, position.latitude];
        setGpsPosition(newGpsPos);
        setGpsAccuracy(position.accuracy);
        setGpsStatus('success');
        
        // Update GPS marker if it exists
        if (gpsMarker.current) {
          gpsMarker.current.setLngLat(newGpsPos);
        }
        
        console.log('[SimpleHoleMap] GPS position obtained:', {
          lat: position.latitude,
          lng: position.longitude,
          accuracy: position.accuracy
        });
      } else {
        setGpsStatus('error');
        console.error('[SimpleHoleMap] Failed to get GPS position');
      }
    } catch (error) {
      setGpsStatus('error');
      console.error('[SimpleHoleMap] Error fetching GPS position:', error);
    }
  };
  
  // Initialize GPS on component mount
  useEffect(() => {
    fetchGPSPosition();
    
    // Set up periodic GPS updates (every 10 seconds)
    const interval = setInterval(fetchGPSPosition, 10000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to calculate offset position for line start
  const getLineStartPosition = (origin: [number, number], target: [number, number], isGPS: boolean, mapInstance: mapboxgl.Map | null): [number, number] => {
    if (!isGPS || !mapInstance) return origin; // No offset needed for non-GPS origins
    
    // Calculate the angle from origin to target
    const dx = target[0] - origin[0];
    const dy = target[1] - origin[1];
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return origin; // Target is at the same position
    
    // Get current zoom level and calculate proper offset
    const currentZoom = mapInstance.getZoom();
    const lat = origin[1]; // Use origin latitude for calculation
    
    // Calculate meters per pixel using proper formula
    const metersPerPixel = 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, currentZoom);
    
    // GPS marker visual radius: 15px radius + 3px border = 18px total
    const pixelOffset = 18;
    const metersOffset = pixelOffset * metersPerPixel;
    
    // Convert meters to degrees (approximate)
    const degreesPerMeter = 1 / 111320; // At equator, adjust for latitude
    const offsetInDegrees = metersOffset * degreesPerMeter / Math.cos(lat * Math.PI / 180);
    
    // Normalize and apply offset
    const offsetX = (dx / distance) * offsetInDegrees;
    const offsetY = (dy / distance) * offsetInDegrees * Math.cos(lat * Math.PI / 180);
    
    return [origin[0] + offsetX, origin[1] + offsetY];
  };

  // Function to update lines and labels
  const updateLinesAndLabels = (targetPos: [number, number]) => {
    if (!map.current || !mapLoaded) return;

    const originPos = getOriginPosition();
    const originLabel = getOriginLabel();

    // Update line sources based on mode
    const firstLineSource = map.current.getSource('first-line') as mapboxgl.GeoJSONSource;
    const secondLineSource = map.current.getSource('second-line') as mapboxgl.GeoJSONSource;

    if (targetMode === 'gps' && gpsPosition) {
      // GPS mode: GPS → Target → Pin
      const lineStart = getLineStartPosition(gpsPosition, targetPos, true, map.current);
      if (firstLineSource) {
        firstLineSource.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [lineStart, targetPos]
          }
        });
      }

      if (secondLineSource) {
        secondLineSource.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [targetPos, [pinLng, pinLat]]
          }
        });
      }
    } else {
      // Pin mode: Tee → Target → Pin
      if (firstLineSource) {
        firstLineSource.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [[teeLng, teeLat], targetPos]
          }
        });
      }

      if (secondLineSource) {
        secondLineSource.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [targetPos, [pinLng, pinLat]]
          }
        });
      }
    }

    // Calculate distances based on mode
    let firstDist: number;
    let secondDist: number;
    let firstMid: [number, number];
    let secondMid: [number, number];
    let firstLabel: string;
    let secondLabel: string;

    if (targetMode === 'gps' && gpsPosition) {
      // GPS mode
      firstDist = calculateDistance(gpsPosition, targetPos);
      secondDist = calculateDistance(targetPos, [pinLng, pinLat]);
      firstMid = [(gpsPosition[0] + targetPos[0]) / 2, (gpsPosition[1] + targetPos[1]) / 2];
      secondMid = [(targetPos[0] + pinLng) / 2, (targetPos[1] + pinLat) / 2];
      firstLabel = `GPS→Target: ${firstDist}y`;
      secondLabel = `Target→Pin: ${secondDist}y`;
    } else {
      // Pin mode
      firstDist = calculateDistance([teeLng, teeLat], targetPos);
      secondDist = calculateDistance(targetPos, [pinLng, pinLat]);
      firstMid = [(teeLng + targetPos[0]) / 2, (teeLat + targetPos[1]) / 2];
      secondMid = [(targetPos[0] + pinLng) / 2, (targetPos[1] + pinLat) / 2];
      firstLabel = `${firstDist}y`;
      secondLabel = `${secondDist}y`;
    }

    // Remove old label markers
    if (teeToTargetLabelMarker.current) {
      teeToTargetLabelMarker.current.remove();
    }
    if (targetToPinLabelMarker.current) {
      targetToPinLabelMarker.current.remove();
    }

    // Create first line label
    const firstLabelEl = document.createElement('div');
    firstLabelEl.style.cssText = `
      background-color: rgba(0, 0, 0, 0.75);
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
      white-space: nowrap;
      pointer-events: none;
    `;
    firstLabelEl.textContent = firstLabel;

    teeToTargetLabelMarker.current = new mapboxgl.Marker({
      element: firstLabelEl,
      anchor: 'center'
    })
      .setLngLat(firstMid)
      .addTo(map.current);

    // Create second line label
    const secondLabelEl = document.createElement('div');
    secondLabelEl.style.cssText = `
      background-color: rgba(0, 0, 0, 0.75);
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
      white-space: nowrap;
      pointer-events: none;
    `;
    secondLabelEl.textContent = secondLabel;

    targetToPinLabelMarker.current = new mapboxgl.Marker({
      element: secondLabelEl,
      anchor: 'center'
    })
      .setLngLat(secondMid)
      .addTo(map.current);
  };

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;
    if (map.current) return;

    console.log('[SimpleHoleMap] Initializing map...');
    mapboxgl.accessToken = mapboxToken;

    // Calculate bearing from Tee to Pin for vertical orientation
    const bearing = calculateBearing([teeLng, teeLat], [pinLng, pinLat]);

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [(teeLng + pinLng) / 2, (teeLat + pinLat) / 2],
        zoom: 16,
        pitch: 0,
        bearing: bearing,
      });

      map.current.on('load', () => {
        console.log('[SimpleHoleMap] Map loaded!');
        if (!map.current) return;

        // Add GeoJSON sources for lines (mode-agnostic naming)
        map.current.addSource('first-line', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [[teeLng, teeLat], currentTarget]
            }
          }
        });

        map.current.addSource('second-line', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [currentTarget, [pinLng, pinLat]]
            }
          }
        });

        // Add line layers
        map.current.addLayer({
          id: 'first-line-layer',
          type: 'line',
          source: 'first-line',
          paint: {
            'line-color': '#ffffff',
            'line-width': 3,
            'line-opacity': 0.8
          }
        });

        map.current.addLayer({
          id: 'second-line-layer',
          type: 'line',
          source: 'second-line',
          paint: {
            'line-color': '#ffffff',
            'line-width': 3,
            'line-dasharray': [2, 2],
            'line-opacity': 0.8
          }
        });

        // Add custom tee marker (colored circle)
        const teeEl = createCircleMarker(teeColor, 16);
        new mapboxgl.Marker({ element: teeEl })
          .setLngLat([teeLng, teeLat])
          .addTo(map.current);

        // Add custom pin marker (white circle) with click handler for mode switching
        const pinEl = createCircleMarker('#ffffff', 12);
        pinEl.addEventListener('click', () => {
          // Toggle between Pin and GPS modes
          if (targetMode === 'pin' && gpsPosition) {
            // Currently in Pin mode, switch to GPS mode if GPS is available
            setTargetMode('gps');
            console.log('[SimpleHoleMap] Switched to GPS mode');
          } else if (targetMode === 'gps') {
            // Currently in GPS mode, switch to Pin mode
            setTargetMode('pin');
            console.log('[SimpleHoleMap] Switched to Pin mode');
          }
        });
        pinMarker.current = new mapboxgl.Marker({ element: pinEl })
          .setLngLat([pinLng, pinLat])
          .addTo(map.current);
        
        // Add GPS marker if we have a position
        if (gpsPosition) {
          const gpsEl = createGPSMarker(targetMode === 'gps');
          gpsEl.addEventListener('click', () => {
            if (targetMode !== 'gps') {
              setTargetMode('gps');
              console.log('[SimpleHoleMap] Switched to GPS mode');
            } else {
              setTargetMode('pin');
              console.log('[SimpleHoleMap] Switched to Pin mode');
            }
          });
          gpsMarker.current = new mapboxgl.Marker({ element: gpsEl })
            .setLngLat(gpsPosition)
            .addTo(map.current);
        }

        // Add draggable target marker (white crosshair) - increased size to 40px
        const targetEl = createCrosshairMarker(40);
        targetMarker.current = new mapboxgl.Marker({ 
          element: targetEl,
          draggable: true 
        })
          .setLngLat(currentTarget)
          .addTo(map.current);

        // Real-time update during drag
        targetMarker.current.on('drag', () => {
          if (!targetMarker.current || !map.current) return;
          const lngLat = targetMarker.current.getLngLat();
          const newTarget: [number, number] = [lngLat.lng, lngLat.lat];
          
          // Use refs to get current values instead of closure values
          const currentMode = targetModeRef.current;
          const currentGpsPosition = gpsPositionRef.current;
          
          // Update line sources immediately based on mode
          const firstLineSource = map.current.getSource('first-line') as mapboxgl.GeoJSONSource;
          const secondLineSource = map.current.getSource('second-line') as mapboxgl.GeoJSONSource;

          if (currentMode === 'gps' && currentGpsPosition) {
            // GPS mode - apply offset to line start
            const lineStart = getLineStartPosition(currentGpsPosition, newTarget, true, map.current);
            if (firstLineSource) {
              firstLineSource.setData({
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: [lineStart, newTarget]
                }
              });
            }
          } else {
            // Pin mode
            if (firstLineSource) {
              firstLineSource.setData({
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: [[teeLng, teeLat], newTarget]
                }
              });
            }
          }

          if (secondLineSource) {
            secondLineSource.setData({
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [newTarget, [pinLng, pinLat]]
              }
            });
          }

          // Calculate and update distances based on mode
          let firstDist: number;
          let secondDist: number;
          let firstMid: [number, number];
          let secondMid: [number, number];
          let firstLabel: string;
          let secondLabel: string;

          if (currentMode === 'gps' && currentGpsPosition) {
            // GPS mode
            firstDist = calculateDistance(currentGpsPosition, newTarget);
            secondDist = calculateDistance(newTarget, [pinLng, pinLat]);
            firstMid = [(currentGpsPosition[0] + newTarget[0]) / 2, (currentGpsPosition[1] + newTarget[1]) / 2];
            secondMid = [(newTarget[0] + pinLng) / 2, (newTarget[1] + pinLat) / 2];
            firstLabel = `GPS→Target: ${firstDist}y`;
            secondLabel = `Target→Pin: ${secondDist}y`;
          } else {
            // Pin mode
            firstDist = calculateDistance([teeLng, teeLat], newTarget);
            secondDist = calculateDistance(newTarget, [pinLng, pinLat]);
            firstMid = [(teeLng + newTarget[0]) / 2, (teeLat + newTarget[1]) / 2];
            secondMid = [(newTarget[0] + pinLng) / 2, (newTarget[1] + pinLat) / 2];
            firstLabel = `${firstDist}y`;
            secondLabel = `${secondDist}y`;
          }

          // Remove and recreate labels
          if (teeToTargetLabelMarker.current) teeToTargetLabelMarker.current.remove();
          if (targetToPinLabelMarker.current) targetToPinLabelMarker.current.remove();

          const firstLabelEl = document.createElement('div');
          firstLabelEl.style.cssText = `
            background-color: rgba(0, 0, 0, 0.75);
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 600;
            box-shadow: 0 1px 4px rgba(0,0,0,0.4);
            white-space: nowrap;
            pointer-events: none;
          `;
          firstLabelEl.textContent = firstLabel;
          teeToTargetLabelMarker.current = new mapboxgl.Marker({ element: firstLabelEl, anchor: 'center' })
            .setLngLat(firstMid)
            .addTo(map.current);

          const secondLabelEl = document.createElement('div');
          secondLabelEl.style.cssText = `
            background-color: rgba(0, 0, 0, 0.75);
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 600;
            box-shadow: 0 1px 4px rgba(0,0,0,0.4);
            white-space: nowrap;
            pointer-events: none;
          `;
          secondLabelEl.textContent = secondLabel;
          targetToPinLabelMarker.current = new mapboxgl.Marker({ element: secondLabelEl, anchor: 'center' })
            .setLngLat(secondMid)
            .addTo(map.current);
        });

        // Final update when drag ends
        targetMarker.current.on('dragend', () => {
          if (!targetMarker.current) return;
          const lngLat = targetMarker.current.getLngLat();
          setCurrentTarget([lngLat.lng, lngLat.lat]);
        });

        // Fit bounds to show all markers
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([teeLng, teeLat]);
        bounds.extend([pinLng, pinLat]);
        bounds.extend(currentTarget);

        map.current.fitBounds(bounds, {
          padding: { top: 40, right: 50, bottom: 120, left: 50 },
          maxZoom: 17,
          duration: 0,
          bearing: bearing
        });

        setMapLoaded(true);
        console.log('[SimpleHoleMap] Map setup complete');
      });

      map.current.on('error', (e) => {
        console.error('[SimpleHoleMap] Map error:', e);
      });

    } catch (error) {
      console.error('[SimpleHoleMap] Failed to initialize map:', error);
    }

    return () => {
      // Clean up all markers
      if (targetMarker.current) {
        targetMarker.current.remove(); // remove() automatically cleans up all event listeners
        targetMarker.current = null;
      }
      if (teeToTargetLabelMarker.current) {
        teeToTargetLabelMarker.current.remove();
        teeToTargetLabelMarker.current = null;
      }
      if (targetToPinLabelMarker.current) {
        targetToPinLabelMarker.current.remove();
        targetToPinLabelMarker.current = null;
      }
      if (gpsMarker.current) {
        gpsMarker.current.remove();
        gpsMarker.current = null;
      }
      if (pinMarker.current) {
        pinMarker.current.remove();
        pinMarker.current = null;
      }
      
      // Clean up the map
      if (map.current) {
        console.log('[SimpleHoleMap] Cleaning up map and all event listeners');
        map.current.remove(); // remove() automatically cleans up all event listeners
        map.current = null;
        setMapLoaded(false);
      }
    };
  }, [mapboxToken, teeLng, teeLat, pinLng, pinLat, teeColor]);

  // Reset currentTarget when switching holes (targetCoords changes)
  useEffect(() => {
    const newTargetLng = targetCoords?.[0] ?? (teeLng + pinLng) / 2;
    const newTargetLat = targetCoords?.[1] ?? (teeLat + pinLat) / 2;
    const newTargetPos: [number, number] = [newTargetLng, newTargetLat];
    
    setCurrentTarget(newTargetPos);
    
    // Update the marker position if it exists
    if (targetMarker.current) {
      targetMarker.current.setLngLat(newTargetPos);
    }
    
    // Immediately update lines and labels when switching holes
    if (mapLoaded) {
      updateLinesAndLabels(newTargetPos);
    }
  }, [targetCoords, teeLng, teeLat, pinLng, pinLat, mapLoaded]);

  // Update lines and labels when currentTarget changes (for initial render and final drag position)
  useEffect(() => {
    updateLinesAndLabels(currentTarget);
  }, [mapLoaded, currentTarget, teeLng, teeLat, pinLng, pinLat, targetMode, gpsPosition]);

  // Handle GPS position updates - add or update GPS marker
  useEffect(() => {
    if (!map.current || !mapLoaded || !gpsPosition) return;

    if (gpsMarker.current) {
      // Update existing marker position
      gpsMarker.current.setLngLat(gpsPosition);
    } else {
      // Create new GPS marker
      const gpsEl = createGPSMarker(targetMode === 'gps');
      gpsEl.addEventListener('click', () => {
        // Toggle between GPS and Pin modes
        if (targetMode === 'gps') {
          setTargetMode('pin');
          console.log('[SimpleHoleMap] Switched to Pin mode');
        } else {
          setTargetMode('gps');
          console.log('[SimpleHoleMap] Switched to GPS mode');
        }
      });
      gpsMarker.current = new mapboxgl.Marker({ element: gpsEl })
        .setLngLat(gpsPosition)
        .addTo(map.current);
    }

    // Update lines if in GPS mode
    if (targetMode === 'gps') {
      updateLinesAndLabels(currentTarget);
    }
  }, [gpsPosition, mapLoaded]);

  // Handle mode changes - update marker animations and lines
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Update GPS marker animation
    if (gpsMarker.current && gpsPosition) {
      const gpsEl = createGPSMarker(targetMode === 'gps');
      gpsEl.addEventListener('click', () => {
        // Toggle between GPS and Pin modes
        if (targetMode === 'gps') {
          setTargetMode('pin');
          console.log('[SimpleHoleMap] Switched to Pin mode');
        } else {
          setTargetMode('gps');
          console.log('[SimpleHoleMap] Switched to GPS mode');
        }
      });
      gpsMarker.current.remove();
      gpsMarker.current = new mapboxgl.Marker({ element: gpsEl })
        .setLngLat(gpsPosition)
        .addTo(map.current);
    }

    // Update Pin marker click handler with current targetMode
    if (pinMarker.current) {
      // Remove old marker first to prevent handler accumulation
      pinMarker.current.remove();
      
      // Create fresh element and add new handler with current targetMode
      const pinEl = createCircleMarker('#ffffff', 12);
      pinEl.addEventListener('click', () => {
        // Toggle between Pin and GPS modes
        if (targetMode === 'pin' && gpsPosition) {
          // Currently in Pin mode, switch to GPS mode if GPS is available
          setTargetMode('gps');
          console.log('[SimpleHoleMap] Switched to GPS mode from Pin click');
        } else if (targetMode === 'gps') {
          // Currently in GPS mode, switch to Pin mode
          setTargetMode('pin');
          console.log('[SimpleHoleMap] Switched to Pin mode from Pin click');
        }
      });
      
      // Create new marker instance
      pinMarker.current = new mapboxgl.Marker({ element: pinEl })
        .setLngLat([pinLng, pinLat])
        .addTo(map.current);
    }

    // Update lines and labels
    updateLinesAndLabels(currentTarget);
  }, [targetMode, mapLoaded, gpsPosition]);

  return (
    <div 
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'relative'
      }}
    >
      <div 
        ref={mapContainer} 
        style={{ 
          width: '100%', 
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0
        }} 
      />

      {!mapLoaded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 10
        }}>
          <p>Loading map...</p>
        </div>
      )}

      {/* GPS Status and Accuracy Display */}
      {mapLoaded && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '500',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          zIndex: 10,
          maxWidth: '200px'
        }}>
          <div style={{ marginBottom: '4px', fontWeight: '600' }}>
            Mode: {targetMode === 'gps' ? 'GPS' : 'Pin'} {targetMode === 'gps' && '📍'}
          </div>
          {gpsStatus === 'loading' && (
            <div>GPS: Acquiring...</div>
          )}
          {gpsStatus === 'error' && (
            <div style={{ color: '#ef4444' }}>GPS: Not available</div>
          )}
          {gpsStatus === 'success' && gpsAccuracy && (
            <>
              <div style={{ 
                color: gpsAccuracy <= 10 ? '#10b981' : gpsAccuracy <= 20 ? '#fbbf24' : '#ef4444' 
              }}>
                GPS Accuracy: {Math.round(gpsAccuracy)}m
              </div>
              {targetMode === 'gps' && (
                <div style={{ marginTop: '4px', fontSize: '11px', opacity: 0.9 }}>
                  Click Pin marker to switch
                </div>
              )}
              {targetMode === 'pin' && gpsPosition && (
                <div style={{ marginTop: '4px', fontSize: '11px', opacity: 0.9 }}>
                  Click GPS marker to switch
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
