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

type GeneradorMapItem = {
  id: number;
  razon_social: string;
  latitud: number | null;
  longitud: number | null;
  activo: boolean;
  tipo_generador: { nombre: string };
};

interface GeneradoresMapViewProps {
  generadores: GeneradorMapItem[];
}

function FitBounds({ generadores }: { generadores: GeneradorMapItem[] }) {
  const map = useMap();

  useEffect(() => {
    const conUbicacion = generadores.filter(
      (g) => g.latitud != null && g.longitud != null,
    );

    if (conUbicacion.length === 0) return;

    if (conUbicacion.length === 1) {
      const g = conUbicacion[0];
      map.setView([g.latitud!, g.longitud!], 14);
      return;
    }

    const bounds = L.latLngBounds(
      conUbicacion.map((g) => [g.latitud!, g.longitud!] as L.LatLngTuple),
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, generadores]);

  return null;
}

export default function GeneradoresMapView({
  generadores,
}: GeneradoresMapViewProps) {
  const conUbicacion = generadores.filter(
    (g) => g.latitud != null && g.longitud != null,
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
      <FitBounds generadores={generadores} />

      {conUbicacion.map((gen) => (
        <Marker
          key={gen.id}
          position={[gen.latitud!, gen.longitud!]}
          icon={defaultIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{gen.razon_social}</p>
              <p className="text-muted-foreground">{gen.tipo_generador.nombre}</p>
              {!gen.activo && (
                <p className="mt-1 text-xs text-gray-400">Inactivo</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
