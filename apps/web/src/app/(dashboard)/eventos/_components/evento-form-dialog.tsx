"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useCreateEvento, useUpdateEvento } from "@/hooks/use-eventos";
import { useZonas } from "@/hooks/use-zonas";
import type { Evento } from "@/types/api";
import { cn } from "@/lib/utils";
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

export function EventoFormDialog({
  open,
  onOpenChange,
  evento,
}: EventoFormDialogProps) {
  const isEditing = !!evento;
  const createMutation = useCreateEvento();
  const updateMutation = useUpdateEvento();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const { data: zonasData } = useZonas({ limit: 100, activo: true });

  const form = useForm<EventoFormValues>({
    resolver: zodResolver(eventoSchema),
    defaultValues: {
      titulo: "",
      descripcion: "",
      zona_id: "",
      direccion: "",
      fecha_evento: new Date(),
      hora_inicio: "",
      hora_fin: "",
    },
  });

  // Map position state (separate from form)
  const [mapPosition, setMapPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    if (open) {
      if (evento) {
        form.reset({
          titulo: evento.titulo,
          descripcion: evento.descripcion ?? "",
          zona_id: String(evento.zona_id),
          direccion: evento.direccion ?? "",
          fecha_evento: new Date(evento.fecha_evento),
          hora_inicio: evento.hora_inicio
            ? new Date(evento.hora_inicio).toLocaleTimeString("es-BO", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
            : "",
          hora_fin: evento.hora_fin
            ? new Date(evento.hora_fin).toLocaleTimeString("es-BO", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
            : "",
        });
        setMapPosition(
          evento.latitud && evento.longitud
            ? { lat: Number(evento.latitud), lng: Number(evento.longitud) }
            : null,
        );
      } else {
        form.reset({
          titulo: "",
          descripcion: "",
          zona_id: "",
          direccion: "",
          fecha_evento: new Date(),
          hora_inicio: "",
          hora_fin: "",
        });
        setMapPosition(null);
      }
    }
  }, [open, evento, form]);

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
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  }

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
                        {zonasData?.data.map((z) => (
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
                      <Input
                        type="time"
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
                name="hora_fin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora fin</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        disabled={isPending}
                        {...field}
                      />
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
                onClick={() => onOpenChange(false)}
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
      </DialogContent>
    </Dialog>
  );
}
