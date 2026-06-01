"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { GeoSearchControl, GeoapifyProvider } from "leaflet-geosearch";
import { Maximize2 } from "lucide-react";
import { useDepartamentoActivo } from "@/components/departamento-context";
import { centroDepartamento } from "@/config/departamento-centros";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// API key de Geoapify (geocoding). Se inyecta en build (NEXT_PUBLIC_*).
// Si no está definida, el buscador de direcciones simplemente no se muestra
// y el mapa sigue funcionando con click/arrastre como antes.
const GEOAPIFY_API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

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

/**
 * Buscador de direcciones (geocoding con Geoapify) montado como control del
 * mapa. Al elegir un resultado, centra el mapa (lo hace el propio control vía
 * `updateMap`) y propaga las coordenadas al formulario con `onPositionChange`,
 * de modo que se reutiliza el marcador draggable del MapPicker (por eso el
 * control va con `showMarker: false`, para no duplicar marcadores).
 *
 * Si no hay API key configurada, no monta nada.
 */
function AddressSearch({
  onPositionChange,
}: {
  onPositionChange: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  // Ref para usar siempre la última callback sin re-montar el control en cada
  // render (onPositionChange viene del form y no está memoizada).
  const onPositionChangeRef = useRef(onPositionChange);
  useEffect(() => {
    onPositionChangeRef.current = onPositionChange;
  });

  useEffect(() => {
    if (!GEOAPIFY_API_KEY) return;

    const provider = new GeoapifyProvider({
      params: {
        apiKey: GEOAPIFY_API_KEY,
        // Restringe los resultados SOLO a Bolivia (ISO 3166-1 alpha-2, en
        // minúscula). Sin esto el geocoder busca en todo el mundo.
        filter: "countrycode:bo",
        // Resultados en español.
        lang: "es",
      },
    });

    const control = GeoSearchControl({
      provider,
      style: "bar",
      showMarker: false, // se usa el marcador draggable propio del MapPicker
      showPopup: false,
      autoComplete: true,
      autoCompleteDelay: 250,
      searchLabel: "Buscar dirección...",
      notFoundMessage: "No se encontró la dirección.",
      keepResult: true,
    });

    map.addControl(control);

    function handleShowLocation(e: L.LeafletEvent) {
      // El evento trae el resultado en `location` con x=lon, y=lat.
      const { x, y } = (
        e as unknown as { location: { x: number; y: number } }
      ).location;
      onPositionChangeRef.current(y, x);
    }

    map.on("geosearch/showlocation", handleShowLocation);

    return () => {
      map.off("geosearch/showlocation", handleShowLocation);
      map.removeControl(control);
    };
  }, [map]);

  return null;
}

/**
 * Contenido interno del mapa (tiles, handlers de click/arrastre, buscador y
 * marcador/círculo). Se reutiliza en el mapa inline (300px) y en el mapa a
 * pantalla completa. Son DOS instancias de MapContainer distintas (en Leaflet
 * un mapa no se puede "mover" de contenedor), pero ambas comparten
 * `position`/`onPositionChange` —controlados por el formulario—, así que la
 * ubicación queda sincronizada entre las dos.
 */
function MapContents({
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
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPositionChange={onPositionChange} />
      <InvalidateSizeOnMount />
      <FlyToPosition position={position} />
      <AddressSearch onPositionChange={onPositionChange} />

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
    </>
  );
}

export default function MapPicker({
  position,
  radiusKm,
  onPositionChange,
}: MapPickerProps) {
  // Centro inicial cuando aún no hay posición = capital del departamento
  // activo (antes era siempre Cochabamba).
  const departamentoActivo = useDepartamentoActivo();
  const centroInicial = centroDepartamento(departamentoActivo);
  const [expanded, setExpanded] = useState(false);

  const center: [number, number] = position
    ? [position.lat, position.lng]
    : centroInicial;
  const zoom = position ? 14 : DEFAULT_ZOOM;

  return (
    <>
      {/* Mapa inline (300px) con botón para expandir a pantalla completa. */}
      <div className="relative">
        <MapContainer
          center={center}
          zoom={zoom}
          className="h-[300px] w-full rounded-md border"
          style={{ zIndex: 0 }}
        >
          <MapContents
            position={position}
            radiusKm={radiusKm}
            onPositionChange={onPositionChange}
          />
        </MapContainer>

        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => setExpanded(true)}
          // Solo icono (el mapa inline es pequeño); el texto va en el tooltip
          // nativo (title). El buscador "bar" va centrado arriba y el zoom
          // arriba-izquierda, así que la esquina superior derecha queda libre.
          className="absolute right-2 top-2 z-[1000] shadow-md"
          title="Ver el mapa en pantalla completa"
        >
          <Maximize2 className="h-4 w-4" />
          <span className="sr-only">Ver el mapa en pantalla completa</span>
        </Button>
      </div>

      {/* Vista a pantalla completa: Dialog anidado de Radix (maneja focus,
          Escape, z-index y portal correctamente). El contenido se estira a
          todo el viewport sobrescribiendo el ancho/alto del DialogContent; el
          centrado por `transform` del dialog NO atrapa nada porque el mapa es
          contenido normal (no `position: fixed`). */}
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="flex h-screen w-full max-w-none flex-col gap-0 rounded-none border-0 p-0 sm:max-w-none">
          <DialogHeader className="border-b px-4 py-3 text-left">
            <DialogTitle className="text-base">
              Seleccione la ubicación
            </DialogTitle>
            <DialogDescription>
              Busque una dirección, haga clic en el mapa o arrastre el marcador
              para fijar el punto.
            </DialogDescription>
          </DialogHeader>

          <div className="relative flex-1">
            <MapContainer
              center={center}
              zoom={zoom}
              className="h-full w-full"
              style={{ zIndex: 0 }}
            >
              <MapContents
                position={position}
                radiusKm={radiusKm}
                onPositionChange={onPositionChange}
              />
            </MapContainer>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
