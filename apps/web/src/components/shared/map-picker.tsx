"use client";

import { useCallback, useEffect, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";

// Fix Leaflet default marker icon (broken in webpack/Next.js)
const defaultIcon = L.icon({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Centro de Cochabamba
const COCHABAMBA_CENTER: L.LatLngExpression = [-17.3895, -66.1568];
const DEFAULT_ZOOM = 13;

interface MapPickerProps {
  position: { lat: number; lng: number } | null;
  radiusKm: number;
  onPositionChange: (lat: number, lng: number) => void;
}

function ClickHandler({
  onPositionChange,
}: {
  onPositionChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    // Necesario cuando el mapa está dentro de un dialog/modal
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function FlyToPosition({
  position,
}: {
  position: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  const hasFlown = useRef(false);

  useEffect(() => {
    if (position && !hasFlown.current) {
      map.flyTo([position.lat, position.lng], 14, { duration: 0.5 });
      hasFlown.current = true;
    }
  }, [map, position]);

  return null;
}

export default function MapPicker({
  position,
  radiusKm,
  onPositionChange,
}: MapPickerProps) {
  const handleDragEnd = useCallback(
    (e: L.DragEndEvent) => {
      const marker = e.target as L.Marker;
      const latlng = marker.getLatLng();
      onPositionChange(latlng.lat, latlng.lng);
    },
    [onPositionChange],
  );

  return (
    <MapContainer
      center={position ? [position.lat, position.lng] : COCHABAMBA_CENTER}
      zoom={position ? 14 : DEFAULT_ZOOM}
      className="h-[300px] w-full rounded-md border"
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPositionChange={onPositionChange} />
      <InvalidateSizeOnMount />
      <FlyToPosition position={position} />

      {position && (
        <>
          <Marker
            position={[position.lat, position.lng]}
            icon={defaultIcon}
            draggable
            eventHandlers={{ dragend: handleDragEnd }}
          />
          {radiusKm > 0 && (
            <Circle
              center={[position.lat, position.lng]}
              radius={radiusKm * 1000}
              pathOptions={{
                color: "#007ECC",
                fillColor: "#007ECC",
                fillOpacity: 0.15,
                weight: 2,
              }}
            />
          )}
        </>
      )}
    </MapContainer>
  );
}
