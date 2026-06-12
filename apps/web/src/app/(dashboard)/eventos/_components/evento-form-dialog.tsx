"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useCreateEvento, useUpdateEvento } from "@/hooks/use-eventos";
import { useZonas } from "@/hooks/use-zonas";
import { useDepartamentoActivo } from "@/components/departamento-context";
import type { Evento, Zona } from "@/types/api";
import { cn, fechaSoloDesdeISO } from "@/lib/utils";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const MapPicker = dynamic(() => import("@/components/shared/map-picker"), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full rounded-md" />,
});

const eventoSchema = z.object({
  titulo: z
    .string()
    .min(1, "El título es obligatorio")
    .max(200, "Máximo 200 caracteres"),
  descripcion: z.string().optional(),
  zona_id: z.string().min(1, "Seleccione una zona"),
  direccion: z.string().optional(),
  fecha_evento: z.date({ message: "La fecha del evento es obligatoria" }),
  hora_inicio: z.string().optional(),
  hora_fin: z.string().optional(),
});

type EventoFormValues = z.infer<typeof eventoSchema>;

interface EventoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento?: Evento;
}

/**
 * Shell del diálogo. El form interno sólo se monta cuando los catálogos
 * (zonas) están listos para evitar el bug en Radix Select donde un value
 * controlado no se aplica si los <SelectItem> aún no se montaron al inicio.
 */
export function EventoFormDialog({
  open,
  onOpenChange,
  evento,
}: EventoFormDialogProps) {
  // El dropdown de zonas se acota al departamento activo del admin: un
  // evento solo puede crearse en una zona de su propio departamento.
  const departamentoActivo = useDepartamentoActivo();
  const { data: zonasData } = useZonas({
    limit: 100,
    activo: true,
    departamentoId: departamentoActivo ?? undefined,
  });
  const isEditing = !!evento;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar evento" : "Crear evento"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifique los datos del evento."
              : "Al crear un evento se notificará automáticamente a las recolectoras de la zona seleccionada."}
          </DialogDescription>
        </DialogHeader>

        {!open ? null : !zonasData ? (
          <div className="py-8 text-center text-muted-foreground">
            Cargando...
          </div>
        ) : (
          <EventoForm
            key={evento?.id ?? "new"}
            evento={evento}
            zonas={zonasData.data}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface EventoFormProps {
  evento?: Evento;
  zonas: Zona[];
  onClose: () => void;
}

function EventoForm({ evento, zonas, onClose }: EventoFormProps) {
  const isEditing = !!evento;
  const createMutation = useCreateEvento();
  const updateMutation = useUpdateEvento();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<EventoFormValues>({
    resolver: zodResolver(eventoSchema),
    defaultValues: {
      titulo: evento?.titulo ?? "",
      descripcion: evento?.descripcion ?? "",
      zona_id: evento ? String(evento.zona_id) : "",
      direccion: evento?.direccion ?? "",
      // @db.Date: a Date local del mismo día para que el calendario y el
      // guardado (format yyyy-MM-dd) no corran un día.
      fecha_evento: evento
        ? fechaSoloDesdeISO(evento.fecha_evento) ?? new Date()
        : new Date(),
      hora_inicio: evento?.hora_inicio
        ? new Date(evento.hora_inicio).toLocaleTimeString("es-BO", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "",
      hora_fin: evento?.hora_fin
        ? new Date(evento.hora_fin).toLocaleTimeString("es-BO", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "",
    },
  });

  const [mapPosition, setMapPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(
    evento && evento.latitud != null && evento.longitud != null
      ? { lat: Number(evento.latitud), lng: Number(evento.longitud) }
      : null,
  );

  function onSubmit(data: EventoFormValues) {
    const payload = {
      titulo: data.titulo,
      descripcion: data.descripcion || undefined,
      zona_id: Number(data.zona_id),
      direccion: data.direccion || undefined,
      latitud: mapPosition?.lat,
      longitud: mapPosition?.lng,
      fecha_evento: format(data.fecha_evento, "yyyy-MM-dd"),
      hora_inicio: data.hora_inicio || undefined,
      hora_fin: data.hora_fin || undefined,
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: evento.id, data: payload },
        { onSuccess: () => onClose() },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => onClose(),
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="titulo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej: Desfile en Zona Norte"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="descripcion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detalles del evento (opcional)"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="zona_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zona</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isPending}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar zona" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {zonas.map((z) => (
                      <SelectItem key={z.id} value={String(z.id)}>
                        {z.nombre}
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
            name="direccion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: Av. Blanco Galindo"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="fecha_evento"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                        disabled={isPending}
                      >
                        {field.value
                          ? format(field.value, "dd/MM/yyyy")
                          : "Seleccionar"}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      locale={es}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hora_inicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora inicio</FormLabel>
                <FormControl>
                  <Input type="time" disabled={isPending} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hora_fin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora fin</FormLabel>
                <FormControl>
                  <Input type="time" disabled={isPending} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <p className="text-sm font-medium mb-2">
            Ubicación en el mapa (opcional)
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            Haga clic en el mapa para marcar la ubicación del evento.
          </p>
          <MapPicker
            position={mapPosition}
            radiusKm={0}
            onPositionChange={(lat, lng) => setMapPosition({ lat, lng })}
          />
        </div>

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
              "Crear evento"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
