"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useDepartamentoActivo } from "@/components/departamento-context";
import { centroDepartamento } from "@/config/departamento-centros";

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

// Shape devuelto por GET /centros-operacionales/mapa.
// Verificado contra `centros-operacionales.service.ts#findAllForMap`.
type CentroOperacionalMapItem = {
  id: number;
  nombre_completo: string;
  nombre_punto: string;
  tipo_acopio: string;
  latitud: number | null;
  longitud: number | null;
  activo: boolean;
  zona: { nombre: string };
  departamento: { nombre: string };
};

interface CentrosOperacionalesMapViewProps {
  centros: CentroOperacionalMapItem[];
}

function FitBounds({ centros }: { centros: CentroOperacionalMapItem[] }) {
  const map = useMap();

  useEffect(() => {
    const conUbicacion = centros.filter(
      (c) => c.latitud != null && c.longitud != null,
    );

    if (conUbicacion.length === 0) return;

    if (conUbicacion.length === 1) {
      const c = conUbicacion[0];
      map.setView([c.latitud!, c.longitud!], 14);
      return;
    }

    const bounds = L.latLngBounds(
      conUbicacion.map((c) => [c.latitud!, c.longitud!] as L.LatLngTuple),
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, centros]);

  return null;
}

export default function CentrosOperacionalesMapView({
  centros,
}: CentrosOperacionalesMapViewProps) {
  const conUbicacion = centros.filter(
    (c) => c.latitud != null && c.longitud != null,
  );

  // Centro inicial = capital del departamento activo. Si hay datos con
  // coordenadas, FitBounds reencuadra el mapa a los marcadores.
  const departamentoActivo = useDepartamentoActivo();
  const center = centroDepartamento(departamentoActivo);

  return (
    <MapContainer
      key={String(departamentoActivo)}
      center={center}
      zoom={DEFAULT_ZOOM}
      className="h-[500px] w-full rounded-md border"
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds centros={conUbicacion} />

      {conUbicacion.map((centro) => (
        <Marker
          key={centro.id}
          position={[centro.latitud!, centro.longitud!]}
          icon={defaultIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{centro.nombre_punto}</p>
              <p>{centro.nombre_completo}</p>
              <p className="text-muted-foreground">
                {centro.tipo_acopio === "FIJO" ? "Fijo" : "Móvil"} —{" "}
                {centro.zona.nombre}
              </p>
              <p className="text-muted-foreground text-xs">
                {centro.departamento.nombre}
              </p>
              {!centro.activo && (
                <p className="mt-1 text-xs text-gray-400">Inactivo</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
