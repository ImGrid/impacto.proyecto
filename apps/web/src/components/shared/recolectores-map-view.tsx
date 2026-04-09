"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";

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

type RecolectorMapItem = {
  id: number;
  nombre_completo: string;
  direccion_domicilio: string;
  latitud: number | null;
  longitud: number | null;
  activo: boolean;
  acopiador: { nombre_completo: string };
  zona: { nombre: string };
};

interface RecolectoresMapViewProps {
  recolectores: RecolectorMapItem[];
}

function FitBounds({ recolectores }: { recolectores: RecolectorMapItem[] }) {
  const map = useMap();

  useEffect(() => {
    const conUbicacion = recolectores.filter(
      (r) => r.latitud != null && r.longitud != null,
    );

    if (conUbicacion.length === 0) return;

    if (conUbicacion.length === 1) {
      const r = conUbicacion[0];
      map.setView([r.latitud!, r.longitud!], 14);
      return;
    }

    const bounds = L.latLngBounds(
      conUbicacion.map((r) => [r.latitud!, r.longitud!] as L.LatLngTuple),
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, recolectores]);

  return null;
}

export default function RecolectoresMapView({
  recolectores,
}: RecolectoresMapViewProps) {
  const conUbicacion = recolectores.filter(
    (r) => r.latitud != null && r.longitud != null,
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
      <FitBounds recolectores={recolectores} />

      {conUbicacion.map((rec) => (
        <Marker
          key={rec.id}
          position={[rec.latitud!, rec.longitud!]}
          icon={defaultIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{rec.nombre_completo}</p>
              <p className="text-muted-foreground">{rec.direccion_domicilio}</p>
              <p className="text-muted-foreground">
                Acopiador: {rec.acopiador.nombre_completo}
              </p>
              <p className="text-muted-foreground">Zona: {rec.zona.nombre}</p>
              {!rec.activo && (
                <p className="mt-1 text-xs text-gray-400">Inactivo</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
