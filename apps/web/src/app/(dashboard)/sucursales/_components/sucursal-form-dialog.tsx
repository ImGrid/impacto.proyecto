"use client";

import dynamic from "next/dynamic";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { useCreateSucursal, useUpdateSucursal } from "@/hooks/use-sucursales";
import { useGeneradores } from "@/hooks/use-generadores";
import { useZonas } from "@/hooks/use-zonas";
import { useMateriales } from "@/hooks/use-materiales";
import type {
  DiaSemana,
  Generador,
  Material,
  Sucursal,
  UnidadMedida,
  Zona,
} from "@/types/api";
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
import { normalizarParaComparar } from "@/lib/utils";

const MapPicker = dynamic(() => import("@/components/shared/map-picker"), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full rounded-md" />,
});

// Valor centinela del Select de material: registra un "Otro" de texto libre.
const MATERIAL_OTRO = "__otro__";

const unidadOptions: { value: UnidadMedida; label: string }[] = [
  { value: "KG", label: "KG" },
  { value: "UNIDAD", label: "Unidad" },
  { value: "BOLSA", label: "Bolsa" },
  { value: "TONELADA", label: "Tonelada" },
];

const materialRowSchema = z.object({
  material_id: z.string().min(1, "Seleccione un material"),
  // Solo se usan cuando material_id === MATERIAL_OTRO.
  nombre_personalizado: z.string().max(100, "Máximo 100 caracteres").optional(),
  unidad_medida: z.enum(["KG", "UNIDAD", "BOLSA", "TONELADA"]).optional(),
  cantidad_aproximada: z.string().optional(),
});

const horarioRowSchema = z.object({
  dia_semana: z.string().min(1, "Seleccione un día"),
  hora_inicio: z.string().min(1, "Hora inicio requerida"),
  hora_fin: z.string().min(1, "Hora fin requerida"),
});

const formSchema = z.object({
  generador_id: z.string().min(1, "Seleccione un generador"),
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(150, "Máximo 150 caracteres"),
  direccion: z
    .string()
    .min(1, "La dirección es obligatoria")
    .max(255, "Máximo 255 caracteres"),
  latitud: z.number({ error: "La latitud es obligatoria" }).min(-90).max(90),
  longitud: z.number({ error: "La longitud es obligatoria" }).min(-180).max(180),
  zona_id: z.string().min(1, "Seleccione una zona"),
  materiales: z.array(materialRowSchema).optional(),
  horarios: z.array(horarioRowSchema).optional(),
})
  .superRefine((data, ctx) => {
    // "Otro": nombre obligatorio y sin duplicados (normalizado: ignora
    // mayúsculas, acentos y espacios).
    const otrosVistos = new Map<string, number>();
    data.materiales?.forEach((m, i) => {
      if (m.material_id !== MATERIAL_OTRO) return;
      const nombre = m.nombre_personalizado?.trim();
      if (!nombre) {
        ctx.addIssue({
          code: "custom",
          path: ["materiales", i, "nombre_personalizado"],
          message: "Escriba qué material es",
        });
        return;
      }
      const clave = normalizarParaComparar(nombre);
      if (otrosVistos.has(clave)) {
        ctx.addIssue({
          code: "custom",
          path: ["materiales", i, "nombre_personalizado"],
          message: 'Ya agregó un material "Otro" con ese nombre',
        });
      } else {
        otrosVistos.set(clave, i);
      }
    });
  });

type FormValues = z.infer<typeof formSchema>;

const diasSemana: { value: DiaSemana; label: string }[] = [
  { value: "LUNES", label: "Lunes" },
  { value: "MARTES", label: "Martes" },
  { value: "MIERCOLES", label: "Miércoles" },
  { value: "JUEVES", label: "Jueves" },
  { value: "VIERNES", label: "Viernes" },
  { value: "SABADO", label: "Sábado" },
  { value: "DOMINGO", label: "Domingo" },
];

function formatTimeFromISO(isoTime: string): string {
  const date = new Date(isoTime);
  return date.toISOString().substring(11, 16);
}

interface SucursalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sucursal?: Sucursal;
}

/**
 * Shell del diálogo. El form sólo se monta cuando los catálogos están listos
 * para evitar el bug en Radix Select donde un value controlado no se aplica
 * si los <SelectItem> aún no se montaron al primer render.
 */
export function SucursalFormDialog({
  open,
  onOpenChange,
  sucursal,
}: SucursalFormDialogProps) {
  const { data: generadoresData } = useGeneradores({ limit: 100 });
  const { data: zonasData } = useZonas({ limit: 100 });
  const { data: materialesData } = useMateriales({ limit: 100 });
  const isEditing = !!sucursal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar sucursal" : "Crear sucursal"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifique los datos de la sucursal."
              : "Complete los datos para registrar una nueva sucursal."}
          </DialogDescription>
        </DialogHeader>

        {!open ? null : !generadoresData ||
          !zonasData ||
          !materialesData ? (
          <div className="py-8 text-center text-muted-foreground">
            Cargando...
          </div>
        ) : (
          <SucursalForm
            key={sucursal?.id ?? "new"}
            sucursal={sucursal}
            generadores={generadoresData.data}
            zonas={zonasData.data}
            materialesCatalogo={materialesData.data}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface SucursalFormProps {
  sucursal?: Sucursal;
  generadores: Generador[];
  zonas: Zona[];
  materialesCatalogo: Material[];
  onClose: () => void;
}

function SucursalForm({
  sucursal,
  generadores,
  zonas,
  materialesCatalogo,
  onClose,
}: SucursalFormProps) {
  const isEditing = !!sucursal;
  const createMutation = useCreateSucursal();
  const updateMutation = useUpdateSucursal();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      generador_id: sucursal ? String(sucursal.generador_id) : "",
      nombre: sucursal?.nombre ?? "",
      direccion: sucursal?.direccion ?? "",
      latitud:
        sucursal != null
          ? Number(sucursal.latitud)
          : (undefined as unknown as number),
      longitud:
        sucursal != null
          ? Number(sucursal.longitud)
          : (undefined as unknown as number),
      zona_id: sucursal ? String(sucursal.zona_id) : "",
      materiales:
        sucursal?.sucursal_material.map((sm) => ({
          // Si la línea no tiene material de catálogo es un "Otro".
          material_id:
            sm.material_id != null ? String(sm.material_id) : MATERIAL_OTRO,
          nombre_personalizado: sm.nombre_personalizado ?? "",
          unidad_medida: (sm.unidad_medida ?? "KG") as UnidadMedida,
          cantidad_aproximada: sm.cantidad_aproximada ?? "",
        })) ?? [],
      horarios:
        sucursal?.sucursal_horario?.map((h) => ({
          dia_semana: h.dia_semana,
          hora_inicio: formatTimeFromISO(h.hora_inicio),
          hora_fin: formatTimeFromISO(h.hora_fin),
        })) ?? [],
    },
  });

  const materialesFields = useFieldArray({
    control: form.control,
    name: "materiales",
  });

  const horariosFields = useFieldArray({
    control: form.control,
    name: "horarios",
  });

  const latitud = form.watch("latitud");
  const longitud = form.watch("longitud");

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
  }

  function onSubmit(data: FormValues) {
    const materiales = data.materiales?.length
      ? data.materiales.map((m) => ({
          // Catálogo (material_id) o "Otro" (nombre_personalizado + unidad).
          ...(m.material_id === MATERIAL_OTRO
            ? {
                nombre_personalizado: m.nombre_personalizado?.trim(),
                unidad_medida: m.unidad_medida,
              }
            : { material_id: Number(m.material_id) }),
          ...(m.cantidad_aproximada
            ? { cantidad_aproximada: m.cantidad_aproximada }
            : {}),
        }))
      : undefined;

    const horarios = data.horarios?.length
      ? data.horarios.map((h) => ({
          dia_semana: h.dia_semana as DiaSemana,
          hora_inicio: h.hora_inicio,
          hora_fin: h.hora_fin,
        }))
      : undefined;

    const shared = {
      nombre: data.nombre,
      direccion: data.direccion,
      latitud: data.latitud,
      longitud: data.longitud,
      zona_id: Number(data.zona_id),
      ...(materiales !== undefined ? { materiales } : {}),
      ...(horarios !== undefined ? { horarios } : {}),
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: sucursal.id, data: shared },
        { onSuccess: () => onClose() },
      );
    } else {
      createMutation.mutate(
        { generador_id: Number(data.generador_id), ...shared },
        { onSuccess: () => onClose() },
      );
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="generador_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Generador</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isPending || isEditing}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar generador" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {generadores.map((gen) => (
                    <SelectItem key={gen.id} value={String(gen.id)}>
                      {gen.razon_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEditing && (
                <p className="text-muted-foreground text-xs">
                  El generador no se puede cambiar.
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la sucursal</FormLabel>
              <FormControl>
                <Input
                  placeholder="Nombre del punto de recogida"
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
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Input
                  placeholder="Dirección de la sucursal"
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
            Haga click en el mapa para marcar la ubicación de la sucursal.
            Puede arrastrar el marcador para ajustar la posición.
          </p>
          <MapPicker
            position={mapPosition}
            radiusKm={0}
            onPositionChange={handlePositionChange}
          />
          {mapPosition ? (
            <p className="text-muted-foreground text-xs">
              Lat: {mapPosition.lat.toFixed(6)}, Lng:{" "}
              {mapPosition.lng.toFixed(6)}
            </p>
          ) : (
            <p className="text-destructive text-xs">
              {form.formState.errors.latitud?.message ??
                form.formState.errors.longitud?.message ??
                ""}
            </p>
          )}
        </div>

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

        {/* Sección de horarios de recogida */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <FormLabel>Horarios de recogida (opcional)</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                horariosFields.append({
                  dia_semana: "",
                  hora_inicio: "08:00",
                  hora_fin: "12:00",
                })
              }
              disabled={isPending}
            >
              <Plus className="mr-1 h-3 w-3" />
              Agregar día
            </Button>
          </div>

          {horariosFields.fields.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No se han definido horarios de recogida.
            </p>
          )}

          {horariosFields.fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2">
              <FormField
                control={form.control}
                name={`horarios.${index}.dia_semana`}
                render={({ field: selectField }) => (
                  <FormItem className="flex-1">
                    <Select
                      onValueChange={selectField.onChange}
                      value={selectField.value}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Día" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {diasSemana.map((dia) => (
                          <SelectItem key={dia.value} value={dia.value}>
                            {dia.label}
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
                name={`horarios.${index}.hora_inicio`}
                render={({ field: inputField }) => (
                  <FormItem className="w-28">
                    <FormControl>
                      <Input
                        type="time"
                        disabled={isPending}
                        {...inputField}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`horarios.${index}.hora_fin`}
                render={({ field: inputField }) => (
                  <FormItem className="w-28">
                    <FormControl>
                      <Input
                        type="time"
                        disabled={isPending}
                        {...inputField}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => horariosFields.remove(index)}
                disabled={isPending}
                className="mt-0.5"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Sección dinámica de materiales */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <FormLabel>Materiales (opcional)</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                materialesFields.append({
                  material_id: "",
                  nombre_personalizado: "",
                  unidad_medida: "KG",
                  cantidad_aproximada: "",
                })
              }
              disabled={isPending}
            >
              <Plus className="mr-1 h-3 w-3" />
              Agregar
            </Button>
          </div>

          {materialesFields.fields.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No se han agregado materiales.
            </p>
          )}

          {materialesFields.fields.map((field, index) => {
            const esOtro =
              form.watch(`materiales.${index}.material_id`) === MATERIAL_OTRO;
            return (
              <div
                key={field.id}
                className="space-y-2 rounded-md border p-2"
              >
                <div className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`materiales.${index}.material_id`}
                    render={({ field: selectField }) => (
                      <FormItem className="flex-1">
                        <Select
                          onValueChange={selectField.onChange}
                          value={selectField.value}
                          disabled={isPending}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Material" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {materialesCatalogo.map((mat) => (
                              <SelectItem key={mat.id} value={String(mat.id)}>
                                {mat.nombre}
                              </SelectItem>
                            ))}
                            <SelectItem value={MATERIAL_OTRO}>
                              Otro (especificar)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`materiales.${index}.cantidad_aproximada`}
                    render={({ field: inputField }) => (
                      <FormItem className="w-32">
                        <FormControl>
                          <Input
                            placeholder="Cantidad"
                            disabled={isPending}
                            {...inputField}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => materialesFields.remove(index)}
                    disabled={isPending}
                    className="mt-0.5"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Nombre + unidad cuando la línea es "Otro". */}
                {esOtro && (
                  <div className="flex items-start gap-2">
                    <FormField
                      control={form.control}
                      name={`materiales.${index}.nombre_personalizado`}
                      render={({ field: inputField }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              placeholder="¿Qué material es? (ej: Pilas...)"
                              disabled={isPending}
                              {...inputField}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`materiales.${index}.unidad_medida`}
                      render={({ field: selectField }) => (
                        <FormItem className="w-32">
                          <Select
                            onValueChange={selectField.onChange}
                            value={selectField.value}
                            disabled={isPending}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {unidadOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
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
              "Crear sucursal"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
