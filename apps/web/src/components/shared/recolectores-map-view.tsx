"use client";

import { useEffect } from "react";
import L from "leaflet";
import { TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useDepartamentoActivo } from "@/components/departamento-context";
import { centroDepartamento } from "@/config/departamento-centros";
import { MapaExpandible } from "./mapa-expandible";

const defaultIcon = L.icon({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const DEFAULT_ZOOM = 13;

type RecolectorMapItem = {
  id: number;
  nombre_completo: string;
  direccion_domicilio: string;
  latitud: number | null;
  longitud: number | null;
  activo: boolean;
  zona: { nombre: string };
  departamento: { nombre: string };
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

  // Centro inicial = capital del departamento activo. Si hay datos con
  // coordenadas, FitBounds reencuadra el mapa a los marcadores.
  const departamentoActivo = useDepartamentoActivo();
  const center = centroDepartamento(departamentoActivo);

  return (
    <MapaExpandible
      mapKey={String(departamentoActivo)}
      center={center}
      zoom={DEFAULT_ZOOM}
      titulo="Recolectores"
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
              <p className="text-muted-foreground">Zona: {rec.zona.nombre}</p>
              <p className="text-muted-foreground">
                Departamento: {rec.departamento.nombre}
              </p>
              {!rec.activo && (
                <p className="mt-1 text-xs text-gray-400">Inactivo</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapaExpandible>
  );
}
