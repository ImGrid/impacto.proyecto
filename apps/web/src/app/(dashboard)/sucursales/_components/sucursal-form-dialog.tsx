"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useCreateSucursal, useUpdateSucursal } from "@/hooks/use-sucursales";
import { useGeneradores } from "@/hooks/use-generadores";
import { useZonas } from "@/hooks/use-zonas";
import { useMateriales } from "@/hooks/use-materiales";
import type { Sucursal, DiaSemana } from "@/types/api";
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

const materialRowSchema = z.object({
  material_id: z.string().min(1, "Seleccione un material"),
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
  latitud: z.string().min(1, "La latitud es obligatoria"),
  longitud: z.string().min(1, "La longitud es obligatoria"),
  zona_id: z.string().min(1, "Seleccione una zona"),
  materiales: z.array(materialRowSchema).optional(),
  horarios: z.array(horarioRowSchema).optional(),
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

export function SucursalFormDialog({
  open,
  onOpenChange,
  sucursal,
}: SucursalFormDialogProps) {
  const isEditing = !!sucursal;
  const createMutation = useCreateSucursal();
  const updateMutation = useUpdateSucursal();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const { data: generadoresData, isLoading: generadoresLoading } =
    useGeneradores({ limit: 100 });
  const generadores = generadoresData?.data ?? [];

  const { data: zonasData, isLoading: zonasLoading } = useZonas({
    limit: 100,
  });
  const zonas = zonasData?.data ?? [];

  const { data: materialesData, isLoading: materialesLoading } = useMateriales({
    limit: 100,
  });
  const materialesCatalogo = materialesData?.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      generador_id: "",
      nombre: "",
      direccion: "",
      latitud: "",
      longitud: "",
      zona_id: "",
      materiales: [],
      horarios: [],
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

  useEffect(() => {
    if (open) {
      if (isEditing) {
        form.reset({
          generador_id: String(sucursal.generador_id),
          nombre: sucursal.nombre,
          direccion: sucursal.direccion,
          latitud: String(sucursal.latitud),
          longitud: String(sucursal.longitud),
          zona_id: String(sucursal.zona_id),
          materiales: sucursal.sucursal_material.map((sm) => ({
            material_id: String(sm.material_id),
            cantidad_aproximada: sm.cantidad_aproximada ?? "",
          })),
          horarios: (sucursal.sucursal_horario ?? []).map((h) => ({
            dia_semana: h.dia_semana,
            hora_inicio: formatTimeFromISO(h.hora_inicio),
            hora_fin: formatTimeFromISO(h.hora_fin),
          })),
        });
      } else {
        form.reset({
          generador_id: "",
          nombre: "",
          direccion: "",
          latitud: "",
          longitud: "",
          zona_id: "",
          materiales: [],
          horarios: [],
        });
      }
    }
  }, [open, sucursal, isEditing, form]);

  function onSubmit(data: FormValues) {
    const materiales = data.materiales?.length
      ? data.materiales.map((m) => ({
          material_id: Number(m.material_id),
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
      latitud: Number(data.latitud),
      longitud: Number(data.longitud),
      zona_id: Number(data.zona_id),
      ...(materiales !== undefined ? { materiales } : {}),
      ...(horarios !== undefined ? { horarios } : {}),
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: sucursal.id, data: shared },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createMutation.mutate(
        { generador_id: Number(data.generador_id), ...shared },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  }

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
                    disabled={isPending || generadoresLoading || isEditing}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            generadoresLoading
                              ? "Cargando generadores..."
                              : "Seleccionar generador"
                          }
                        />
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="latitud"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitud</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="-17.3935"
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
                name="longitud"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitud</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="-66.1570"
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

              {materialesFields.fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`materiales.${index}.material_id`}
                    render={({ field: selectField }) => (
                      <FormItem className="flex-1">
                        <Select
                          onValueChange={selectField.onChange}
                          value={selectField.value}
                          disabled={isPending || materialesLoading}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue
                                placeholder={
                                  materialesLoading
                                    ? "Cargando..."
                                    : "Material"
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {materialesCatalogo.map((mat) => (
                              <SelectItem
                                key={mat.id}
                                value={String(mat.id)}
                              >
                                {mat.nombre}
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
              ))}
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
                  "Crear sucursal"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
