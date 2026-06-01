"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { LatLngExpression } from "leaflet";
import { MapContainer, useMap } from "react-leaflet";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Recalcula el tamaño del mapa al montarse. Necesario sobre todo en la vista
 * a pantalla completa, donde el contenedor del Dialog adopta su tamaño final
 * justo al abrirse.
 */
function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

interface MapaExpandibleProps {
  /** Remonta el mapa cuando cambia (p.ej. el departamento activo). */
  mapKey?: string;
  center: LatLngExpression;
  zoom: number;
  /** Título de la vista a pantalla completa. */
  titulo: string;
  /** Clases del mapa inline (alto, borde...). */
  inlineClassName?: string;
  /**
   * Contenido del mapa (TileLayer + FitBounds + marcadores). Se renderiza en
   * AMBAS instancias —la inline y la de pantalla completa—; cada FitBounds y
   * cada marcador se enlaza a su propio mapa vía el contexto de react-leaflet.
   */
  children: ReactNode;
}

/**
 * Envuelve un mapa de solo lectura (las vistas "Mapa" de las tablas) con un
 * botón "Mapa completo" que lo abre a pantalla completa en un Dialog anidado
 * de Radix (maneja focus, Escape, z-index y portal). El DialogContent se
 * estira a todo el viewport; su centrado por `transform` no atrapa el mapa
 * porque el mapa es contenido normal (no `position: fixed`).
 *
 * Son dos instancias de MapContainer (en Leaflet un mapa no se puede mover de
 * contenedor), pero comparten el mismo `children`.
 */
export function MapaExpandible({
  mapKey,
  center,
  zoom,
  titulo,
  inlineClassName = "h-[500px] w-full rounded-md border",
  children,
}: MapaExpandibleProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* `isolate` crea un contexto de apilamiento local: así el z-index del
          botón queda contenido y nunca se cuela por encima del Dialog de
          pantalla completa (que es z-50). */}
      <div className="relative isolate">
        <MapContainer
          key={mapKey}
          center={center}
          zoom={zoom}
          className={inlineClassName}
          style={{ zIndex: 0 }}
        >
          <InvalidateSizeOnMount />
          {children}
        </MapContainer>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setExpanded(true)}
          className="absolute right-2 top-2 z-10 gap-1.5 shadow-md"
          title="Ver el mapa en pantalla completa"
        >
          <Maximize2 className="h-4 w-4" />
          Mapa completo
        </Button>
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="flex h-screen w-full max-w-none flex-col gap-0 rounded-none border-0 p-0 sm:max-w-none">
          <DialogHeader className="border-b px-4 py-3 text-left">
            <DialogTitle className="text-base">{titulo}</DialogTitle>
            <DialogDescription>
              Use el zoom y arrastre el mapa para explorar. Haga clic en un
              punto para ver su información.
            </DialogDescription>
          </DialogHeader>

          <div className="relative flex-1">
            {expanded && (
              <MapContainer
                key={mapKey}
                center={center}
                zoom={zoom}
                className="h-full w-full"
                style={{ zIndex: 0 }}
              >
                <InvalidateSizeOnMount />
                {children}
              </MapContainer>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
