"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Loader2, MapPin } from "lucide-react";
import { useCreateAcopiador, useUpdateAcopiador } from "@/hooks/use-acopiadores";
import { useZonas } from "@/hooks/use-zonas";
import type { Acopiador, TipoAcopio } from "@/types/api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const MapPicker = dynamic(() => import("@/components/shared/map-picker"), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full rounded-md" />,
});

const baseSchema = z.object({
  email: z.string().optional(),
  password: z.string().optional(),
  nombre_completo: z
    .string()
    .min(1, "El nombre completo es obligatorio")
    .max(150, "Máximo 150 caracteres"),
  cedula_identidad: z
    .string()
    .min(1, "La cédula de identidad es obligatoria")
    .max(20, "Máximo 20 caracteres"),
  celular: z
    .string()
    .min(1, "El celular es obligatorio")
    .max(20, "Máximo 20 caracteres"),
  tipo_acopio: z.string().min(1, "Seleccione un tipo de acopio"),
  nombre_punto: z
    .string()
    .min(1, "El nombre del punto es obligatorio")
    .max(150, "Máximo 150 caracteres"),
  zona_id: z.string().min(1, "Seleccione una zona"),
  direccion: z.string().optional(),
  latitud: z.number().min(-90).max(90).nullable(),
  longitud: z.number().min(-180).max(180).nullable(),
  horario_operacion: z.string().optional(),
});

const createSchema = baseSchema
  .refine((data) => !!data.email && data.email.includes("@"), {
    message: "Ingrese un email válido",
    path: ["email"],
  })
  .refine((data) => !!data.password && data.password.length >= 8, {
    message: "Mínimo 8 caracteres",
    path: ["password"],
  });

const updateSchema = baseSchema;

type FormValues = z.infer<typeof baseSchema>;

interface AcopiadorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  acopiador?: Acopiador;
}

export function AcopiadorFormDialog({
  open,
  onOpenChange,
  acopiador,
}: AcopiadorFormDialogProps) {
  const isEditing = !!acopiador;
  const createMutation = useCreateAcopiador();
  const updateMutation = useUpdateAcopiador();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const { data: zonasData, isLoading: zonasLoading } = useZonas({
    limit: 100,
  });
  const zonas = zonasData?.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(isEditing ? updateSchema : createSchema),
    defaultValues: {
      email: "",
      password: "",
      nombre_completo: "",
      cedula_identidad: "",
      celular: "",
      tipo_acopio: "",
      nombre_punto: "",
      zona_id: "",
      direccion: "",
      latitud: null,
      longitud: null,
      horario_operacion: "",
    },
  });

  const latitud = form.watch("latitud");
  const longitud = form.watch("longitud");

  const mapPosition =
    latitud != null && longitud != null
      ? { lat: latitud, lng: longitud }
      : null;

  useEffect(() => {
    if (open) {
      if (isEditing) {
        form.reset({
          email: "",
          password: "",
          nombre_completo: acopiador.nombre_completo,
          cedula_identidad: acopiador.cedula_identidad,
          celular: acopiador.celular,
          tipo_acopio: acopiador.tipo_acopio,
          nombre_punto: acopiador.nombre_punto,
          zona_id: String(acopiador.zona_id),
          direccion: acopiador.direccion ?? "",
          latitud: acopiador.latitud != null ? Number(acopiador.latitud) : null,
          longitud: acopiador.longitud != null ? Number(acopiador.longitud) : null,
          horario_operacion: acopiador.horario_operacion ?? "",
        });
      } else {
        form.reset({
          email: "",
          password: "",
          nombre_completo: "",
          cedula_identidad: "",
          celular: "",
          tipo_acopio: "",
          nombre_punto: "",
          zona_id: "",
          direccion: "",
          latitud: null,
          longitud: null,
          horario_operacion: "",
        });
      }
    }
  }, [open, acopiador, isEditing, form]);

  function handlePositionChange(lat: number, lng: number) {
    form.setValue("latitud", parseFloat(lat.toFixed(8)), {
      shouldValidate: true,
    });
    form.setValue("longitud", parseFloat(lng.toFixed(8)), {
      shouldValidate: true,
    });
  }

  function onSubmit(data: FormValues) {
    const shared = {
      nombre_completo: data.nombre_completo,
      cedula_identidad: data.cedula_identidad,
      celular: data.celular,
      tipo_acopio: data.tipo_acopio as TipoAcopio,
      nombre_punto: data.nombre_punto,
      zona_id: Number(data.zona_id),
      ...(data.direccion ? { direccion: data.direccion } : {}),
      ...(data.latitud != null ? { latitud: data.latitud } : {}),
      ...(data.longitud != null ? { longitud: data.longitud } : {}),
      ...(data.horario_operacion
        ? { horario_operacion: data.horario_operacion }
        : {}),
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: acopiador.id, data: shared },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createMutation.mutate(
        { email: data.email!, password: data.password!, ...shared },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar acopiador" : "Crear acopiador"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifique los datos del acopiador."
              : "Complete los datos para registrar un nuevo acopiador."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isEditing && (
              <>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="correo@ejemplo.com"
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Mínimo 8 caracteres"
                          disabled={isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="nombre_completo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nombre del acopiador"
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
                name="cedula_identidad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cédula de identidad</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Número de CI"
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
                name="celular"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Celular</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Número de celular"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo_acopio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de acopio</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FIJO">Fijo</SelectItem>
                        <SelectItem value="MOVIL">Móvil</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zona_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zona</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isPending || zonasLoading}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              zonasLoading
                                ? "Cargando zonas..."
                                : "Seleccionar zona"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {zonas.map((zona) => (
                          <SelectItem key={zona.id} value={String(zona.id)}>
                            {zona.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nombre_punto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del punto de acopio</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nombre del centro de acopio"
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
              name="direccion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Dirección del punto de acopio"
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
                <span className="text-sm font-medium">
                  Ubicación en el mapa (opcional)
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                Haga click en el mapa para marcar la ubicación del punto de
                acopio. Puede arrastrar el marcador para ajustar la posición.
              </p>
              <MapPicker
                position={mapPosition}
                radiusKm={0}
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
              name="horario_operacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horario de operación (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Lun-Vie 8:00-18:00"
                      disabled={isPending}
                      {...field}
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
                  "Crear acopiador"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
