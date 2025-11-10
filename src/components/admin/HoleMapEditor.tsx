import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation, Target, Plus, Trash2 } from "lucide-react";

interface TeeMarker {
  id: string;
  type: 'black' | 'blue' | 'white' | 'yellow' | 'red';
  latitude: number;
  longitude: number;
  distance: number;
  marker?: mapboxgl.Marker;
}

interface HoleMapEditorProps {
  holeNumber: number;
  holeId: string;
  centerLat?: number;
  centerLng?: number;
  pinPosition?: { latitude: number; longitude: number } | null;
  targetPosition?: { latitude: number; longitude: number } | null;
  teePositions: TeeMarker[];
  availableTeeTypes: TeeMarker['type'][];
  onPinUpdate: (lat: number, lng: number) => void;
  onTargetUpdate: (lat: number, lng: number) => void;
  onTeeAdd: (type: TeeMarker['type'], lat: number, lng: number) => void;
  onTeeUpdate: (teeId: string, lat: number, lng: number, distance: number) => void;
  onTeeDelete: (teeId: string) => void;
}

const TEE_COLORS = {
  black: '#000000',
  blue: '#3B82F6',
  white: '#FFFFFF',
  yellow: '#FCD34D',
  red: '#EF4444',
};

const TEE_LABELS = {
  black: 'Black',
  blue: 'Blue',
  white: 'White',
  yellow: 'Yellow',
  red: 'Red',
};

const HoleMapEditor = ({
  holeNumber,
  centerLat,
  centerLng,
  pinPosition,
  targetPosition,
  teePositions,
  availableTeeTypes,
  onPinUpdate,
  onTargetUpdate,
  onTeeAdd,
  onTeeUpdate,
  onTeeDelete,
}: HoleMapEditorProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const pinMarker = useRef<mapboxgl.Marker | null>(null);
  const targetMarker = useRef<mapboxgl.Marker | null>(null);
  const teeMarkers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const mapboxToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || "";
  const [mapReady, setMapReady] = useState(false);
  const [selectedTeeType, setSelectedTeeType] = useState<TeeMarker['type'] | null>(null);
  const [isAddingPin, setIsAddingPin] = useState(false);
  const [isAddingTarget, setIsAddingTarget] = useState(false);
  const [isAddingTee, setIsAddingTee] = useState(false);

  // Initialize map
  useEffect(() => {
    console.log('[HoleMapEditor] Initializing...', {
      hasContainer: !!mapContainer.current,
      hasToken: !!mapboxToken,
      tokenLength: mapboxToken?.length || 0
    });
    
    if (!mapContainer.current || !mapboxToken) {
      if (!mapboxToken) {
        console.error('[HoleMapEditor] Mapbox token not found in environment variables');
      }
      return;
    }

    const defaultLat = centerLat || 13.7563;
    const defaultLng = centerLng || 100.5018;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [defaultLng, defaultLat],
      zoom: 17,
      pitch: 0,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on('load', () => {
      setMapReady(true);
    });

    return () => {
      setMapReady(false);
      map.current?.remove();
    };
  }, [mapboxToken, centerLat, centerLng]);

  // Update pin marker and camera when pinPosition or holeNumber changes
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Clear existing pin marker
    if (pinMarker.current) {
      pinMarker.current.remove();
      pinMarker.current = null;
    }

    // Add new pin marker if position exists
    if (pinPosition) {
      addPinMarker(pinPosition.latitude, pinPosition.longitude);
      
      // If we have tee positions, fit bounds to show tee at bottom and pin at top
      if (teePositions.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        
        // Add pin to bounds
        bounds.extend([pinPosition.longitude, pinPosition.latitude]);
        
        // Add all tees to bounds
        teePositions.forEach(tee => {
          bounds.extend([tee.longitude, tee.latitude]);
        });
        
        // Fit map to show all markers with padding
        map.current.fitBounds(bounds, {
          padding: { top: 100, bottom: 100, left: 50, right: 50 },
          duration: 1000,
          bearing: 0, // Keep north pointing up
          pitch: 45, // Add some tilt for better perspective
        });
      } else {
        // No tees yet, just center on pin
        map.current.flyTo({
          center: [pinPosition.longitude, pinPosition.latitude],
          zoom: 17,
          bearing: 0,
          pitch: 45,
          duration: 1000,
          essential: true
        });
      }
    }
  }, [mapReady, pinPosition, holeNumber, teePositions]);

  // Update target marker
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Clear existing target marker
    if (targetMarker.current) {
      targetMarker.current.remove();
      targetMarker.current = null;
    }

    // Add new target marker if position exists
    if (targetPosition) {
      addTargetMarker(targetPosition.latitude, targetPosition.longitude);
    }
  }, [mapReady, targetPosition, holeNumber]);

  // Update tee markers
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Remove old markers
    teeMarkers.current.forEach(marker => marker.remove());
    teeMarkers.current.clear();

    // Add new markers
    teePositions.forEach(tee => {
      const el = createTeeMarkerElement(tee.type);
      const marker = new mapboxgl.Marker({
        element: el,
        draggable: true,
      })
        .setLngLat([tee.longitude, tee.latitude])
        .addTo(map.current!);

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        const distance = calculateDistance(lngLat.lat, lngLat.lng);
        onTeeUpdate(tee.id, lngLat.lat, lngLat.lng, distance);
      });

      teeMarkers.current.set(tee.id, marker);
    });
  }, [mapReady, teePositions, pinPosition]);

  const createTeeMarkerElement = (type: TeeMarker['type']) => {
    const el = document.createElement('div');
    el.style.width = '24px';
    el.style.height = '24px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = TEE_COLORS[type];
    el.style.border = type === 'white' ? '3px solid #000' : '3px solid #fff';
    el.style.cursor = 'grab';
    el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
    return el;
  };

  const addPinMarker = (lat: number, lng: number) => {
    if (pinMarker.current) {
      pinMarker.current.remove();
    }

    const el = document.createElement('div');
    el.innerHTML = '<div style="color: red; font-size: 32px;">📍</div>';
    
    pinMarker.current = new mapboxgl.Marker({
      element: el,
      draggable: true,
    })
      .setLngLat([lng, lat])
      .addTo(map.current!);

    pinMarker.current.on('dragend', () => {
      const lngLat = pinMarker.current!.getLngLat();
      onPinUpdate(lngLat.lat, lngLat.lng);
    });
  };

  const addTargetMarker = (lat: number, lng: number) => {
    if (targetMarker.current) {
      targetMarker.current.remove();
    }

    const el = document.createElement('div');
    el.innerHTML = '<div style="color: #3b82f6; font-size: 32px;">🎯</div>';
    
    targetMarker.current = new mapboxgl.Marker({
      element: el,
      draggable: true,
    })
      .setLngLat([lng, lat])
      .addTo(map.current!);

    targetMarker.current.on('dragend', () => {
      const lngLat = targetMarker.current!.getLngLat();
      onTargetUpdate(lngLat.lat, lngLat.lng);
    });
  };

  const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
    if (isAddingPin) {
      onPinUpdate(e.lngLat.lat, e.lngLat.lng);
      setIsAddingPin(false);
    } else if (isAddingTarget) {
      onTargetUpdate(e.lngLat.lat, e.lngLat.lng);
      setIsAddingTarget(false);
    } else if (isAddingTee && selectedTeeType) {
      onTeeAdd(selectedTeeType, e.lngLat.lat, e.lngLat.lng);
      setIsAddingTee(false);
      setSelectedTeeType(null);
    }
  };

  useEffect(() => {
    if (!map.current || !mapReady) return;
    
    if (isAddingPin || isAddingTarget || isAddingTee) {
      map.current.getCanvas().style.cursor = 'crosshair';
      map.current.on('click', handleMapClick);
    } else {
      map.current.getCanvas().style.cursor = '';
      map.current.off('click', handleMapClick);
    }

    return () => {
      if (map.current) {
        map.current.off('click', handleMapClick);
      }
    };
  }, [mapReady, isAddingPin, isAddingTarget, isAddingTee, selectedTeeType]);

  const calculateDistance = (teeLat: number, teeLng: number): number => {
    if (!pinPosition) return 0;
    
    const R = 6371e3; // Earth radius in meters
    const φ1 = teeLat * Math.PI / 180;
    const φ2 = pinPosition.latitude * Math.PI / 180;
    const Δφ = (pinPosition.latitude - teeLat) * Math.PI / 180;
    const Δλ = (pinPosition.longitude - teeLng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distanceMeters = R * c;
    return Math.round(distanceMeters * 1.09361); // Convert to yards
  };

  const handleAddTeeClick = (type: TeeMarker['type']) => {
    setSelectedTeeType(type);
    setIsAddingTee(true);
    setIsAddingPin(false);
  };

  if (!mapboxToken) {
    console.error('[HoleMapEditor] Mapbox token missing - check VITE_MAPBOX_PUBLIC_TOKEN environment variable');
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-2">
          <p className="text-destructive font-medium">Map Configuration Error</p>
          <p className="text-sm text-muted-foreground">Mapbox token not configured. Please check VITE_MAPBOX_PUBLIC_TOKEN environment variable.</p>
        </CardContent>
      </Card>
    );
  }

  const existingTeeTypes = new Set(teePositions.map(t => t.type));
  const availableToAdd = availableTeeTypes.filter(type => !existingTeeTypes.has(type));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Map Editor - หลุมที่ {holeNumber}
        </CardTitle>
        <CardDescription>
          คลิกปุ่มด้านล่างแล้วคลิกบนแผนที่เพื่อเพิ่มตำแหน่ง หรือลากหมุดเพื่อปรับตำแหน่ง
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Control buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={isAddingPin ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setIsAddingPin(!isAddingPin);
              setIsAddingTarget(false);
              setIsAddingTee(false);
            }}
          >
            <Target className="mr-2 h-4 w-4" />
            {pinPosition ? 'ย้าย Pin' : 'เพิ่ม Pin'}
          </Button>

          <Button
            variant={isAddingTarget ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setIsAddingTarget(!isAddingTarget);
              setIsAddingPin(false);
              setIsAddingTee(false);
            }}
          >
            <Navigation className="mr-2 h-4 w-4" />
            {targetPosition ? 'ย้าย Target' : 'เพิ่ม Target'}
          </Button>

          {availableToAdd.map(type => (
            <Button
              key={type}
              variant={isAddingTee && selectedTeeType === type ? "default" : "outline"}
              size="sm"
              onClick={() => handleAddTeeClick(type)}
              style={{
                backgroundColor: isAddingTee && selectedTeeType === type 
                  ? undefined 
                  : type === 'white' ? '#f8f8f8' : undefined,
                color: type === 'white' && !(isAddingTee && selectedTeeType === type) ? '#000' : undefined,
                borderColor: type === 'white' ? '#ccc' : undefined,
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              เพิ่ม Tee {TEE_LABELS[type]}
            </Button>
          ))}
        </div>

        {/* Map */}
        <div ref={mapContainer} className="w-full h-[500px] rounded-lg overflow-hidden border" />

        {/* Tee positions list */}
        {teePositions.length > 0 && (
          <div className="space-y-2">
            <Label>Tee Positions:</Label>
            <div className="space-y-2">
              {teePositions.map(tee => (
                <div
                  key={tee.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{
                        backgroundColor: TEE_COLORS[tee.type],
                        border: tee.type === 'white' ? '2px solid #000' : '2px solid #fff',
                      }}
                    />
                    <div>
                      <div className="font-medium">{TEE_LABELS[tee.type]} Tee</div>
                      <div className="text-sm text-muted-foreground">
                        {tee.distance} yards
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onTeeDelete(tee.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {isAddingPin && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              📍 คลิกบนแผนที่เพื่อวาง Pin
            </p>
          </div>
        )}

        {isAddingTarget && (
          <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
            <p className="text-sm text-orange-900 dark:text-orange-100">
              🎯 คลิกบนแผนที่เพื่อวาง Target (จุดเป้าหมายบนแฟร์เวย์)
            </p>
          </div>
        )}

        {isAddingTee && selectedTeeType && (
          <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-900 dark:text-green-100">
              ⛳ คลิกบนแผนที่เพื่อวาง Tee {TEE_LABELS[selectedTeeType]}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HoleMapEditor;
