import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Enums } from "@/integrations/supabase/types";

type TeeType = Enums<"tee_type">;

interface HoleMapViewProps {
  mapboxToken: string;
  holeData: any;
  selectedTee: TeeType;
  onTargetPositionChange?: (position: [number, number]) => void;
}

export const HoleMapView = ({ 
  mapboxToken, 
  holeData, 
  selectedTee,
  onTargetPositionChange 
}: HoleMapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const targetMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [targetPosition, setTargetPosition] = useState<[number, number] | null>(null);
  const [mapMoved, setMapMoved] = useState(0);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Calculate distance between two coordinates (Haversine formula) in yards
  const calculateDistance = (coord1: [number, number], coord2: [number, number]): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (coord1[1] * Math.PI) / 180;
    const φ2 = (coord2[1] * Math.PI) / 180;
    const Δφ = ((coord2[1] - coord1[1]) * Math.PI) / 180;
    const Δλ = ((coord2[0] - coord1[0]) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distanceMeters = R * c;
    const distanceYards = distanceMeters * 1.09361;
    return Math.round(distanceYards);
  };

  // Initialize map
  useEffect(() => {
    console.log('[HoleMapView] Initializing map...', {
      hasContainer: !!mapContainer.current,
      hasToken: !!mapboxToken,
      hasHoleData: !!holeData,
      selectedTee
    });

    if (!mapContainer.current) {
      console.error('[HoleMapView] Map container ref is null');
      setMapError('Map container not found');
      setMapLoading(false);
      return;
    }

    if (!mapboxToken) {
      console.error('[HoleMapView] Mapbox token is missing');
      setMapError('Mapbox token not configured');
      setMapLoading(false);
      return;
    }

    if (!holeData) {
      console.error('[HoleMapView] Hole data is missing');
      setMapError('Hole data not available');
      setMapLoading(false);
      return;
    }

    const teePosition = holeData.tee_positions?.find(
      (tp: any) => tp.tee_type === selectedTee
    );
    
    console.log('[HoleMapView] Tee position:', teePosition);
    
    const pinPosition = holeData.pin_latitude && holeData.pin_longitude
      ? [holeData.pin_longitude, holeData.pin_latitude]
      : null;

    console.log('[HoleMapView] Pin position:', pinPosition);

    if (!teePosition) {
      console.error('[HoleMapView] No tee position found for selected tee:', selectedTee);
      setMapError(`No tee position found for ${selectedTee} tee`);
      setMapLoading(false);
      return;
    }

    if (!pinPosition) {
      console.error('[HoleMapView] No pin position found');
      setMapError('No pin position found for this hole');
      setMapLoading(false);
      return;
    }

    const teeCoords: [number, number] = [teePosition.longitude, teePosition.latitude];
    const pinCoords: [number, number] = pinPosition as [number, number];

    console.log('[HoleMapView] Coordinates:', { teeCoords, pinCoords });

    // Set initial target position at midpoint
    const initialTarget: [number, number] = [
      (teeCoords[0] + pinCoords[0]) / 2,
      (teeCoords[1] + pinCoords[1]) / 2,
    ];
    setTargetPosition(initialTarget);
    onTargetPositionChange?.(initialTarget);

    try {
      mapboxgl.accessToken = mapboxToken;

      // Check WebGL support
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      console.log('[HoleMapView] WebGL supported:', !!gl);
      if (!gl) {
        console.error('[HoleMapView] WebGL not supported in this environment');
        setMapError('WebGL not supported - map cannot render');
        setMapLoading(false);
        return;
      }

      // Log container dimensions
      if (mapContainer.current) {
        const rect = mapContainer.current.getBoundingClientRect();
        console.log('[HoleMapView] Container dimensions:', {
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left
        });
        
        if (rect.height === 0 || rect.width === 0) {
          console.error('[HoleMapView] Container has zero dimensions!');
          setMapError('Map container has no size');
          setMapLoading(false);
          return;
        }
      }

      console.log('[HoleMapView] Creating Mapbox map instance...');
      setDebugInfo('Creating map...');
      
      // Try streets style first - more reliable than satellite
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [(teeCoords[0] + pinCoords[0]) / 2, (teeCoords[1] + pinCoords[1]) / 2],
        zoom: 18,
        pitch: 25,
        bearing: 0,
        preserveDrawingBuffer: true,
        antialias: true,
        fadeDuration: 0,
      });

      // Comprehensive error handling
      map.current.on('error', (e) => {
        console.error('[HoleMapView] Mapbox error:', e.error);
        console.error('[HoleMapView] Error details:', JSON.stringify(e, null, 2));
        setMapError(`Map error: ${e.error?.message || 'Unknown error'}`);
        setMapLoading(false);
      });

      // Style load events
      map.current.on('style.load', () => {
        console.log('[HoleMapView] Style loaded successfully');
        setDebugInfo('Style loaded ✅');
      });

      map.current.on('styleimagemissing', (e) => {
        console.warn('[HoleMapView] Style image missing:', e.id);
      });

      // Tile events
      map.current.on('sourcedata', (e) => {
        if (e.isSourceLoaded && e.sourceId) {
          console.log('[HoleMapView] Source data loaded:', e.sourceId);
        }
      });

      map.current.on('data', (e) => {
        if (e.dataType === 'style') {
          console.log('[HoleMapView] Style data event:', e.dataType);
        }
      });

      // Render events
      let renderCount = 0;
      map.current.on('render', () => {
        renderCount++;
        if (renderCount === 1 || renderCount % 50 === 0) {
          console.log('[HoleMapView] Render event count:', renderCount);
        }
      });

      map.current.on("load", () => {
        console.log('[HoleMapView] Map loaded successfully');
        setDebugInfo('Map loaded ✅ Rendering...');
        
        // Debug: Check canvas element
        setTimeout(() => {
          const canvasElements = mapContainer.current?.querySelectorAll('canvas');
          console.log('[HoleMapView] Canvas elements found:', canvasElements?.length);
          setDebugInfo(`Canvas: ${canvasElements?.length || 0} elements ✅`);
          
          canvasElements?.forEach((canvas, index) => {
            const styles = window.getComputedStyle(canvas);
            console.log(`[HoleMapView] Canvas ${index}:`, {
              width: canvas.width,
              height: canvas.height,
              display: styles.display,
              visibility: styles.visibility,
              opacity: styles.opacity,
              zIndex: styles.zIndex,
              position: styles.position
            });
          });
        }, 500);
        
        setMapLoading(false);
        setMapError(null);
        
        if (!map.current) return;

        // Force resize to trigger canvas redraw
        setTimeout(() => {
          if (map.current) {
            console.log('[HoleMapView] Forcing map resize...');
            map.current.resize();
            map.current.triggerRepaint();
          }
        }, 100);

        // Debug: Capture canvas data to verify it has content
        map.current.once('idle', () => {
          if (!map.current) return;
          try {
            const canvas = map.current.getCanvas();
            const hasContent = canvas.toDataURL().length > 10000; // Empty canvas ~6k chars
            console.log('[HoleMapView] Canvas has rendered content:', hasContent);
            console.log('[HoleMapView] Canvas data URL length:', canvas.toDataURL().length);
            
            // Log all style layers
            const style = map.current.getStyle();
            console.log('[HoleMapView] Style layers:', style.layers?.map(l => ({
              id: l.id, 
              type: l.type, 
              visible: (l as any).layout?.visibility !== 'none'
            })));
          } catch (error) {
            console.error('[HoleMapView] Failed to capture canvas:', error);
          }
        });

      // Calculate bearing from tee to pin
      const bearing = Math.atan2(
        pinCoords[0] - teeCoords[0],
        pinCoords[1] - teeCoords[1]
      ) * (180 / Math.PI);

      // Add tee marker at bottom (small beige circle)
      const teeEl = document.createElement("div");
      teeEl.className = "w-5 h-5 flex items-center justify-center";
      teeEl.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" class="drop-shadow-lg">
          <circle cx="10" cy="10" r="8" fill="#D2B48C" stroke="white" stroke-width="2"/>
        </svg>
      `;
      new mapboxgl.Marker({ element: teeEl })
        .setLngLat(teeCoords)
        .addTo(map.current);

      // Add pin marker at top (white circle)
      const pinEl = document.createElement("div");
      pinEl.className = "w-3 h-3 flex items-center justify-center";
      pinEl.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 12 12" class="drop-shadow-xl">
          <circle cx="6" cy="6" r="5" fill="white" stroke="#666" stroke-width="1"/>
        </svg>
      `;
      new mapboxgl.Marker({ element: pinEl })
        .setLngLat(pinCoords)
        .addTo(map.current);

      // Add draggable target marker (crosshair aim icon)
      const targetEl = document.createElement("div");
      targetEl.className = "w-12 h-12 flex items-center justify-center cursor-move";
      targetEl.innerHTML = `
        <svg width="48" height="48" viewBox="0 0 48 48" class="drop-shadow-xl">
          <circle cx="24" cy="24" r="20" fill="none" stroke="white" stroke-width="2"/>
          <circle cx="24" cy="24" r="14" fill="none" stroke="white" stroke-width="1.5"/>
          <circle cx="24" cy="24" r="3" fill="white"/>
          <line x1="24" y1="4" x2="24" y2="12" stroke="white" stroke-width="2"/>
          <line x1="24" y1="36" x2="24" y2="44" stroke="white" stroke-width="2"/>
          <line x1="4" y1="24" x2="12" y2="24" stroke="white" stroke-width="2"/>
          <line x1="36" y1="24" x2="44" y2="24" stroke="white" stroke-width="2"/>
        </svg>
      `;
      
      const targetMarker = new mapboxgl.Marker({
        element: targetEl,
        draggable: true,
      })
        .setLngLat(initialTarget)
        .addTo(map.current);

      targetMarkerRef.current = targetMarker;

      // Update target position on drag
      targetMarker.on('drag', () => {
        const lngLat = targetMarker.getLngLat();
        const newTarget: [number, number] = [lngLat.lng, lngLat.lat];
        setTargetPosition(newTarget);
        onTargetPositionChange?.(newTarget);
        updateLines(teeCoords, newTarget, pinCoords);
      });

      // Update label positions when map moves
      map.current.on('move', () => {
        setMapMoved(prev => prev + 1);
      });

      // Initial line drawing
      updateLines(teeCoords, initialTarget, pinCoords);

      // Adjust camera to show tee at bottom, pin at top
      const bounds = new mapboxgl.LngLatBounds()
        .extend(teeCoords)
        .extend(pinCoords);
      
      try {
        map.current.fitBounds(bounds, {
          padding: { top: 60, bottom: 80, left: 40, right: 40 },
          bearing: bearing,
          pitch: 25,
          maxZoom: 19,
          duration: 1000,
        });
      } catch (error) {
        // Fallback if fitBounds fails - just center on midpoint
        console.warn('[HoleMapView] fitBounds failed, using fallback:', error);
        map.current.setCenter([(teeCoords[0] + pinCoords[0]) / 2, (teeCoords[1] + pinCoords[1]) / 2]);
        map.current.setZoom(18);
        map.current.setBearing(bearing);
        map.current.setPitch(25);
      }
    });

    const updateLines = (tee: [number, number], target: [number, number], pin: [number, number]) => {
      if (!map.current) return;

      // Remove existing sources and layers
      if (map.current.getSource("tee-target-line")) {
        map.current.removeLayer("tee-target-line");
        map.current.removeSource("tee-target-line");
      }
      if (map.current.getSource("target-pin-line")) {
        map.current.removeLayer("target-pin-line");
        map.current.removeSource("target-pin-line");
      }

      // Tee to target line
      map.current.addSource("tee-target-line", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [tee, target],
          },
        },
      });

      map.current.addLayer({
        id: "tee-target-line",
        type: "line",
        source: "tee-target-line",
        layout: {},
        paint: {
          "line-color": "#ffffff",
          "line-width": 3,
        },
      });

      // Target to pin line
      map.current.addSource("target-pin-line", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [target, pin],
          },
        },
      });

      map.current.addLayer({
        id: "target-pin-line",
        type: "line",
        source: "target-pin-line",
        layout: {},
        paint: {
          "line-color": "#ffffff",
          "line-width": 3,
        },
      });
    };

    } catch (error) {
      console.error('[HoleMapView] Error creating map:', error);
      setMapError(`Failed to initialize map: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMapLoading(false);
    }

    return () => {
      if (map.current) {
        console.log('[HoleMapView] Removing map instance');
        map.current.remove();
      }
    };
  }, [mapboxToken, holeData, selectedTee]);

  // Convert coordinates to screen position and calculate position at percentage from start
  const getLinePositionScreenCoords = (
    coord1: [number, number] | null, 
    coord2: [number, number] | null,
    percentage: number = 0.3
  ) => {
    if (!map.current || !coord1 || !coord2) return null;
    const point1 = map.current.project(coord1);
    const point2 = map.current.project(coord2);
    return { 
      x: point1.x + (point2.x - point1.x) * percentage, 
      y: point1.y + (point2.y - point1.y) * percentage 
    };
  };

  const teePosition = holeData.tee_positions?.find(
    (tp: any) => tp.tee_type === selectedTee
  );
  
  const teeCoords: [number, number] | null = teePosition 
    ? [teePosition.longitude, teePosition.latitude]
    : null;
  const pinCoords: [number, number] | null = holeData.pin_latitude && holeData.pin_longitude
    ? [holeData.pin_longitude, holeData.pin_latitude]
    : null;

  // Debug: compare with PreviewHole
  if (teeCoords && pinCoords && targetPosition) {
    const dbgTeeToTarget = calculateDistance(targetPosition, teeCoords);
    const dbgTargetToPin = calculateDistance(pinCoords, targetPosition);
    console.log('[HoleMapView] tee', selectedTee, 'teeCoords', teeCoords, 'target', targetPosition, 'pin', pinCoords, 'distances', { dbgTeeToTarget, dbgTargetToPin });
  }

  const teeToTargetDistance = teeCoords && targetPosition 
    ? calculateDistance(targetPosition, teeCoords)
    : 0;
  const targetToPinDistance = targetPosition && pinCoords
    ? calculateDistance(pinCoords, targetPosition)
    : 0;

  const teeTargetScreenPos = teeCoords && targetPosition 
    ? getLinePositionScreenCoords(teeCoords, targetPosition, 0.5)
    : null;
  const targetPinScreenPos = targetPosition && pinCoords
    ? getLinePositionScreenCoords(targetPosition, pinCoords, 0.5)
    : null;

  return (
    <div className="relative w-full h-full">
      {/* Map container - always render so ref can be grabbed */}
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Loading overlay */}
      {mapLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
          <div className="text-center p-6 space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
          <div className="text-center p-6 space-y-2">
            <p className="text-sm font-medium text-destructive">Map Error</p>
            <p className="text-xs text-muted-foreground">{mapError}</p>
          </div>
        </div>
      )}
      
      {/* Debug overlay - top right corner */}
      {debugInfo && !mapLoading && !mapError && (
        <div className="absolute top-4 right-4 bg-black/80 text-white text-xs px-3 py-2 rounded-lg z-[100] pointer-events-none">
          {debugInfo}
        </div>
      )}
      
      {/* Floating distance labels positioned on the lines */}
      {!mapLoading && !mapError && targetPosition && teeTargetScreenPos && (
        <div 
          key={`tee-target-${targetPosition[0]}-${targetPosition[1]}`}
          className="absolute z-[1] pointer-events-none -translate-y-1/2"
          style={{ left: `${teeTargetScreenPos.x - 60}px`, top: `${teeTargetScreenPos.y}px` }}
        >
          <div className="bg-black/80 rounded-full w-12 h-12 flex items-center justify-center shadow-xl">
            <p className="text-white text-base font-bold leading-none">{teeToTargetDistance}<span className="text-xs">y</span></p>
          </div>
        </div>
      )}
      {!mapLoading && !mapError && targetPosition && targetPinScreenPos && (
        <div 
          key={`target-pin-${targetPosition[0]}-${targetPosition[1]}`}
          className="absolute z-[1] pointer-events-none -translate-y-1/2"
          style={{ left: `${targetPinScreenPos.x - 60}px`, top: `${targetPinScreenPos.y - 14}px` }}
        >
          <div className="bg-black/80 rounded-full w-12 h-12 flex items-center justify-center shadow-xl">
            <p className="text-white text-base font-bold leading-none">{targetToPinDistance}<span className="text-xs">y</span></p>
          </div>
        </div>
      )}
    </div>
  );
};
