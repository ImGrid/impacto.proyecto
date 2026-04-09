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

type AcopiadorMapItem = {
  id: number;
  nombre_completo: string;
  nombre_punto: string;
  tipo_acopio: string;
  latitud: number | null;
  longitud: number | null;
  activo: boolean;
  zona: { nombre: string };
};

interface AcopiadoresMapViewProps {
  acopiadores: AcopiadorMapItem[];
}

function FitBounds({ acopiadores }: { acopiadores: AcopiadorMapItem[] }) {
  const map = useMap();

  useEffect(() => {
    const conUbicacion = acopiadores.filter(
      (a) => a.latitud != null && a.longitud != null,
    );

    if (conUbicacion.length === 0) return;

    if (conUbicacion.length === 1) {
      const a = conUbicacion[0];
      map.setView([a.latitud!, a.longitud!], 14);
      return;
    }

    const bounds = L.latLngBounds(
      conUbicacion.map((a) => [a.latitud!, a.longitud!] as L.LatLngTuple),
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, acopiadores]);

  return null;
}

export default function AcopiadoresMapView({
  acopiadores,
}: AcopiadoresMapViewProps) {
  const conUbicacion = acopiadores.filter(
    (a) => a.latitud != null && a.longitud != null,
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
      <FitBounds acopiadores={acopiadores} />

      {conUbicacion.map((acop) => (
        <Marker
          key={acop.id}
          position={[acop.latitud!, acop.longitud!]}
          icon={defaultIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{acop.nombre_punto}</p>
              <p>{acop.nombre_completo}</p>
              <p className="text-muted-foreground">
                {acop.tipo_acopio === "FIJO" ? "Fijo" : "Móvil"} — {acop.zona.nombre}
              </p>
              {!acop.activo && (
                <p className="mt-1 text-xs text-gray-400">Inactivo</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
