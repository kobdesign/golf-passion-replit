import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface CourseMapProps {
  courseName: string;
  coordinates: [number, number];
  onClose: () => void;
}

const CourseMap = ({ courseName, coordinates, onClose }: CourseMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const mapboxToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: coordinates,
      zoom: 15,
      pitch: 45,
    });

    // Add marker for the course
    new mapboxgl.Marker({ color: "#3b82f6" })
      .setLngLat(coordinates)
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<h3 class="font-bold">${courseName}</h3>`
        )
      )
      .addTo(map.current);

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, coordinates, courseName]);

  if (!mapboxToken) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <p className="text-lg text-muted-foreground">
            Loading map...
          </p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50">
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
        <div className="bg-card/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
          <h3 className="font-bold text-lg">{courseName}</h3>
        </div>
        <Button
          onClick={onClose}
          size="icon"
          className="rounded-full bg-card/95 backdrop-blur-sm"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};

export default CourseMap;
