"use client";

import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Loader2, MapPin } from "lucide-react";
import { useCreateZona, useUpdateZona } from "@/hooks/use-zonas";
import { useCiudades } from "@/hooks/use-ciudades";
import type { Ciudad, Zona } from "@/types/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const MapPicker = dynamic(() => import("@/components/shared/map-picker"), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full rounded-md" />,
});

const zonaSchema = z.object({
  ciudad_id: z.string().min(1, "Seleccione una ciudad"),
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  descripcion: z.string().optional(),
  latitud: z.number().min(-90).max(90).nullable(),
  longitud: z.number().min(-180).max(180).nullable(),
  radio_km: z
    .number()
    .min(0.01, "El radio debe ser mayor a 0")
    .max(100, "El radio no puede ser mayor a 100 km")
    .nullable(),
});

type ZonaFormValues = z.infer<typeof zonaSchema>;

interface ZonaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zona?: Zona;
}

/**
 * Shell del diálogo. El form sólo se monta cuando los catálogos están listos
 * para evitar el bug en Radix Select donde un value controlado no se aplica
 * si los <SelectItem> aún no se montaron al primer render.
 */
export function ZonaFormDialog({
  open,
  onOpenChange,
  zona,
}: ZonaFormDialogProps) {
  const { data: ciudadesData } = useCiudades({ limit: 100, activo: true });
  const isEditing = !!zona;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar zona" : "Crear zona"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifique los datos de la zona."
              : "Complete los datos para crear una nueva zona."}
          </DialogDescription>
        </DialogHeader>

        {!open ? null : !ciudadesData ? (
          <div className="py-8 text-center text-muted-foreground">
            Cargando...
          </div>
        ) : (
          <ZonaForm
            key={zona?.id ?? "new"}
            zona={zona}
            ciudades={ciudadesData.data}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ZonaFormProps {
  zona?: Zona;
  ciudades: Ciudad[];
  onClose: () => void;
}

function ZonaForm({ zona, ciudades, onClose }: ZonaFormProps) {
  const isEditing = !!zona;
  const createMutation = useCreateZona();
  const updateMutation = useUpdateZona();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<ZonaFormValues>({
    resolver: zodResolver(zonaSchema),
    defaultValues: {
      ciudad_id: zona ? String(zona.ciudad_id) : "",
      nombre: zona?.nombre ?? "",
      descripcion: zona?.descripcion ?? "",
      latitud: zona && zona.latitud != null ? Number(zona.latitud) : null,
      longitud: zona && zona.longitud != null ? Number(zona.longitud) : null,
      radio_km: zona && zona.radio_km != null ? Number(zona.radio_km) : null,
    },
  });

  const latitud = form.watch("latitud");
  const longitud = form.watch("longitud");
  const radioKm = form.watch("radio_km");

  const mapPosition =
    latitud != null && longitud != null
      ? { lat: latitud, lng: longitud }
      : null;

  function handlePositionChange(lat: number, lng: number) {
    form.setValue("latitud", parseFloat(lat.toFixed(8)), {
      shouldValidate: true,
    });
    form.setValue("longitud", parseFloat(lng.toFixed(8)), {
      shouldValidate: true,
    });
    // Si no tiene radio, poner un default
    if (!form.getValues("radio_km")) {
      form.setValue("radio_km", 1, { shouldValidate: true });
    }
  }

  function onSubmit(data: ZonaFormValues) {
    if (isEditing) {
      updateMutation.mutate(
        {
          id: zona.id,
          data: {
            ciudad_id: Number(data.ciudad_id),
            nombre: data.nombre,
            descripcion: data.descripcion || undefined,
            latitud: data.latitud ?? null,
            longitud: data.longitud ?? null,
            radio_km: data.radio_km ?? null,
          },
        },
        { onSuccess: () => onClose() },
      );
    } else {
      const body: {
        ciudad_id: number;
        nombre: string;
        descripcion?: string;
        latitud?: number;
        longitud?: number;
        radio_km?: number;
      } = {
        ciudad_id: Number(data.ciudad_id),
        nombre: data.nombre,
        ...(data.descripcion ? { descripcion: data.descripcion } : {}),
        ...(data.latitud != null ? { latitud: data.latitud } : {}),
        ...(data.longitud != null ? { longitud: data.longitud } : {}),
        ...(data.radio_km != null ? { radio_km: data.radio_km } : {}),
      };
      createMutation.mutate(body, { onSuccess: () => onClose() });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="ciudad_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ciudad</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isPending}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar ciudad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ciudades.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nombre} ({c.departamento.nombre})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Nombre de la zona"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="descripcion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descripción opcional"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Mapa para seleccionar ubicación */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Ubicación en el mapa</span>
          </div>
          <p className="text-muted-foreground text-xs">
            Haga click en el mapa para colocar el centro de la zona.
            Puede arrastrar el marcador para ajustar la posición.
          </p>
          <MapPicker
            position={mapPosition}
            radiusKm={radioKm ?? 0}
            onPositionChange={handlePositionChange}
          />
          {mapPosition && (
            <p className="text-muted-foreground text-xs">
              Lat: {mapPosition.lat.toFixed(6)}, Lng:{" "}
              {mapPosition.lng.toFixed(6)}
            </p>
          )}
        </div>

        <FormField
          control={form.control}
          name="radio_km"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Radio (km)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="any"
                  min="0.01"
                  max="100"
                  placeholder="Ej: 2.5"
                  disabled={isPending}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val === "" ? null : parseFloat(val));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : isEditing ? (
              "Guardar cambios"
            ) : (
              "Crear zona"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
