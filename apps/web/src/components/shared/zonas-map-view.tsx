"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Circle, Popup, useMap } from "react-leaflet";
import type { Zona } from "@/types/api";

// Centro de Cochabamba
const COCHABAMBA_CENTER: L.LatLngExpression = [-17.3895, -66.1568];
const DEFAULT_ZOOM = 13;

interface ZonasMapViewProps {
  zonas: Zona[];
}

function FitBounds({ zonas }: { zonas: Zona[] }) {
  const map = useMap();

  useEffect(() => {
    const zonasConUbicacion = zonas.filter(
      (z) => z.latitud != null && z.longitud != null,
    );

    if (zonasConUbicacion.length === 0) return;

    if (zonasConUbicacion.length === 1) {
      const z = zonasConUbicacion[0];
      map.setView([z.latitud!, z.longitud!], 14);
      return;
    }

    const bounds = L.latLngBounds(
      zonasConUbicacion.map((z) => [z.latitud!, z.longitud!] as L.LatLngTuple),
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, zonas]);

  return null;
}

export default function ZonasMapView({ zonas }: ZonasMapViewProps) {
  const zonasConUbicacion = zonas.filter(
    (z) => z.latitud != null && z.longitud != null,
  );

  return (
    <MapContainer
      center={COCHABAMBA_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-[500px] w-full rounded-md border"
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds zonas={zonas} />

      {zonasConUbicacion.map((zona) => (
        <Circle
          key={zona.id}
          center={[zona.latitud!, zona.longitud!]}
          radius={(zona.radio_km ?? 1) * 1000}
          pathOptions={{
            color: zona.activo ? "#0C5C63" : "#9ca3af",
            fillColor: zona.activo ? "#0C5C63" : "#9ca3af",
            fillOpacity: 0.15,
            weight: 2,
          }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{zona.nombre}</p>
              {zona.radio_km && (
                <p className="text-muted-foreground">
                  Radio: {zona.radio_km} km
                </p>
              )}
              {zona.descripcion && (
                <p className="text-muted-foreground mt-1">
                  {zona.descripcion}
                </p>
              )}
              {!zona.activo && (
                <p className="mt-1 text-xs text-gray-400">Inactiva</p>
              )}
            </div>
          </Popup>
        </Circle>
      ))}
    </MapContainer>
  );
}
