"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Loader2, Plus, Trash2, MapPin } from "lucide-react";
import { GENERO_OPTIONS } from "@/lib/constants";
import {
  useCreateRecolector,
  useUpdateRecolector,
} from "@/hooks/use-recolectores";
import { useAcopiadores } from "@/hooks/use-acopiadores";
import { useZonas } from "@/hooks/use-zonas";
import { useAsociaciones } from "@/hooks/use-asociaciones";
import { useMateriales } from "@/hooks/use-materiales";
import { useTiposGenerador } from "@/hooks/use-tipos-generador";
import type { Recolector, Genero, DiaSemana } from "@/types/api";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const MapPicker = dynamic(() => import("@/components/shared/map-picker"), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full rounded-md" />,
});

// --- Constantes ---

const diasSemana: { value: DiaSemana; label: string }[] = [
  { value: "LUNES", label: "Lunes" },
  { value: "MARTES", label: "Martes" },
  { value: "MIERCOLES", label: "Miércoles" },
  { value: "JUEVES", label: "Jueves" },
  { value: "VIERNES", label: "Viernes" },
  { value: "SABADO", label: "Sábado" },
  { value: "DOMINGO", label: "Domingo" },
];

// --- Zod Schema ---

const materialRowSchema = z.object({
  material_id: z.string().min(1, "Seleccione un material"),
  cantidad_mensual: z.string().optional(),
  precio_venta: z.string().optional(),
  es_principal: z.boolean().optional(),
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
  direccion_domicilio: z
    .string()
    .min(1, "La dirección es obligatoria")
    .max(255, "Máximo 255 caracteres"),
  latitud: z.number({ error: "La latitud es obligatoria" }).min(-90).max(90),
  longitud: z.number({ error: "La longitud es obligatoria" }).min(-180).max(180),
  acopiador_id: z.string().min(1, "Seleccione un acopiador"),
  zona_id: z.string().min(1, "Seleccione una zona"),
  asociacion_id: z.string().optional(),
  genero: z.string().min(1, "Seleccione el género"),
  edad: z.string().min(1, "La edad es obligatoria"),
  trabaja_individual: z.boolean().optional(),
  dias_trabajo: z.array(z.string()).optional(),
  materiales: z.array(materialRowSchema).optional(),
  tipos_generador_ids: z.array(z.string()).optional(),
});

const createSchema = baseSchema
  .refine(
    (data) => !data.email || data.email.includes("@"),
    { message: "Ingrese un email válido", path: ["email"] },
  )
  .refine((data) => !!data.password && data.password.length >= 8, {
    message: "Mínimo 8 caracteres",
    path: ["password"],
  });

const updateSchema = baseSchema;

type FormValues = z.infer<typeof baseSchema>;

// --- Componente ---

interface RecolectorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recolector?: Recolector;
}

export function RecolectorFormDialog({
  open,
  onOpenChange,
  recolector,
}: RecolectorFormDialogProps) {
  const isEditing = !!recolector;
  const createMutation = useCreateRecolector();
  const updateMutation = useUpdateRecolector();
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Catálogos para los Selects
  const { data: acopiadoresData, isLoading: acopiadoresLoading } =
    useAcopiadores({ limit: 100 });
  const acopiadores = acopiadoresData?.data ?? [];

  const { data: zonasData, isLoading: zonasLoading } = useZonas({
    limit: 100,
  });
  const zonas = zonasData?.data ?? [];

  const { data: asociacionesData, isLoading: asociacionesLoading } =
    useAsociaciones({ limit: 100 });
  const asociaciones = asociacionesData?.data ?? [];

  const { data: materialesData, isLoading: materialesLoading } = useMateriales({
    limit: 100,
  });
  const materialesCatalogo = materialesData?.data ?? [];

  const { data: tiposGenData, isLoading: tiposGenLoading } = useTiposGenerador({
    limit: 100,
  });
  const tiposGenerador = tiposGenData?.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(isEditing ? updateSchema : createSchema),
    defaultValues: {
      email: "",
      password: "",
      nombre_completo: "",
      cedula_identidad: "",
      celular: "",
      direccion_domicilio: "",
      latitud: undefined as unknown as number,
      longitud: undefined as unknown as number,
      acopiador_id: "",
      zona_id: "",
      asociacion_id: "",
      genero: "",
      edad: "",
      trabaja_individual: true,
      dias_trabajo: [],
      materiales: [],
      tipos_generador_ids: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "materiales",
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
          nombre_completo: recolector.nombre_completo,
          cedula_identidad: recolector.cedula_identidad,
          celular: recolector.celular,
          direccion_domicilio: recolector.direccion_domicilio,
          latitud: Number(recolector.latitud),
          longitud: Number(recolector.longitud),
          acopiador_id: String(recolector.acopiador_id),
          zona_id: String(recolector.zona_id),
          asociacion_id: recolector.asociacion_id
            ? String(recolector.asociacion_id)
            : "",
          genero: recolector.genero,
          edad: String(recolector.edad),
          trabaja_individual: recolector.trabaja_individual,
          dias_trabajo: recolector.recolector_dia_trabajo.map(
            (d) => d.dia_semana,
          ),
          materiales: recolector.recolector_material.map((rm) => ({
            material_id: String(rm.material_id),
            cantidad_mensual:
              rm.cantidad_mensual != null ? String(rm.cantidad_mensual) : "",
            precio_venta:
              rm.precio_venta != null ? String(rm.precio_venta) : "",
            es_principal: rm.es_principal,
          })),
          tipos_generador_ids: recolector.recolector_tipo_generador.map((rt) =>
            String(rt.tipo_generador_id),
          ),
        });
      } else {
        form.reset({
          email: "",
          password: "",
          nombre_completo: "",
          cedula_identidad: "",
          celular: "",
          direccion_domicilio: "",
          latitud: undefined as unknown as number,
          longitud: undefined as unknown as number,
          acopiador_id: "",
          zona_id: "",
          asociacion_id: "",
          genero: "",
          edad: "",
          trabaja_individual: true,
          dias_trabajo: [],
          materiales: [],
          tipos_generador_ids: [],
        });
      }
    }
  }, [open, recolector, isEditing, form]);

  function handlePositionChange(lat: number, lng: number) {
    form.setValue("latitud", parseFloat(lat.toFixed(8)), {
      shouldValidate: true,
    });
    form.setValue("longitud", parseFloat(lng.toFixed(8)), {
      shouldValidate: true,
    });
  }

  function onSubmit(data: FormValues) {
    const edadNum = Number(data.edad);

    const materiales = data.materiales?.length
      ? data.materiales.map((m) => ({
          material_id: Number(m.material_id),
          ...(m.cantidad_mensual
            ? { cantidad_mensual: Number(m.cantidad_mensual) }
            : {}),
          ...(m.precio_venta
            ? { precio_venta: Number(m.precio_venta) }
            : {}),
          ...(m.es_principal !== undefined
            ? { es_principal: m.es_principal }
            : {}),
        }))
      : undefined;

    const diasTrabajo = data.dias_trabajo?.length
      ? (data.dias_trabajo as DiaSemana[])
      : undefined;

    const tiposGeneradorIds = data.tipos_generador_ids?.length
      ? data.tipos_generador_ids.map(Number)
      : undefined;

    const shared = {
      nombre_completo: data.nombre_completo,
      cedula_identidad: data.cedula_identidad,
      celular: data.celular,
      direccion_domicilio: data.direccion_domicilio,
      latitud: data.latitud,
      longitud: data.longitud,
      acopiador_id: Number(data.acopiador_id),
      zona_id: Number(data.zona_id),
      genero: data.genero as Genero,
      edad: edadNum,
      trabaja_individual: data.trabaja_individual ?? true,
      ...(data.asociacion_id
        ? { asociacion_id: Number(data.asociacion_id) }
        : {}),
      ...(diasTrabajo !== undefined ? { dias_trabajo: diasTrabajo } : {}),
      ...(materiales !== undefined ? { materiales } : {}),
      ...(tiposGeneradorIds !== undefined
        ? { tipos_generador_ids: tiposGeneradorIds }
        : {}),
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: recolector.id, data: shared },
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
            {isEditing ? "Editar recolector" : "Crear recolector"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifique los datos del recolector."
              : "Complete los datos para registrar un nuevo recolector."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* === SECCIÓN: Cuenta === */}
            {!isEditing && (
              <fieldset className="space-y-4">
                <legend className="text-sm font-semibold">
                  Cuenta de usuario
                </legend>
                <div className="grid grid-cols-2 gap-4">
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
                </div>
              </fieldset>
            )}

            {/* === SECCIÓN: Datos personales === */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold">
                Datos personales
              </legend>
              <FormField
                control={form.control}
                name="nombre_completo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nombre del recolector"
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
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="genero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Género</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GENERO_OPTIONS.map((opt) => (
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
                <FormField
                  control={form.control}
                  name="edad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edad</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={14}
                          max={100}
                          placeholder="14-100"
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
                  name="trabaja_individual"
                  render={({ field }) => (
                    <FormItem className="flex flex-col justify-end">
                      <div className="flex items-center gap-2 h-9">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">
                          Trabaja individual
                        </FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </fieldset>

            {/* === SECCIÓN: Ubicación === */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold">Ubicación</legend>
              <FormField
                control={form.control}
                name="direccion_domicilio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección de domicilio</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Dirección completa"
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
                    Ubicación en el mapa
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  Haga click en el mapa para marcar la ubicación del domicilio
                  del recolector. Puede arrastrar el marcador para ajustar.
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
                            <SelectItem
                              key={zona.id}
                              value={String(zona.id)}
                            >
                              {zona.nombre}
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
                  name="asociacion_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asociación (opcional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isPending || asociacionesLoading}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                asociacionesLoading
                                  ? "Cargando..."
                                  : "Sin asociación"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {asociaciones.map((asoc) => (
                            <SelectItem
                              key={asoc.id}
                              value={String(asoc.id)}
                            >
                              {asoc.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </fieldset>

            {/* === SECCIÓN: Relación con acopiador === */}
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold">Acopiador asignado</legend>
              <FormField
                control={form.control}
                name="acopiador_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Acopiador</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isPending || acopiadoresLoading}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              acopiadoresLoading
                                ? "Cargando acopiadores..."
                                : "Seleccionar acopiador"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {acopiadores.map((acop) => (
                          <SelectItem
                            key={acop.id}
                            value={String(acop.id)}
                          >
                            {acop.nombre_completo} — {acop.nombre_punto}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            {/* === SECCIÓN: Días de trabajo === */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">
                Días de trabajo (opcional)
              </legend>
              <FormField
                control={form.control}
                name="dias_trabajo"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {diasSemana.map((dia) => {
                        const checked = field.value?.includes(dia.value) ?? false;
                        return (
                          <label
                            key={dia.value}
                            className="flex items-center gap-1.5 text-sm"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(isChecked) => {
                                const current = field.value ?? [];
                                if (isChecked) {
                                  field.onChange([...current, dia.value]);
                                } else {
                                  field.onChange(
                                    current.filter((d) => d !== dia.value),
                                  );
                                }
                              }}
                              disabled={isPending}
                            />
                            {dia.label}
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            {/* === SECCIÓN: Tipos de generador === */}
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">
                Tipos de generador donde recolecta (opcional)
              </legend>
              <FormField
                control={form.control}
                name="tipos_generador_ids"
                render={({ field }) => (
                  <FormItem>
                    {tiposGenLoading ? (
                      <p className="text-muted-foreground text-sm">
                        Cargando tipos...
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {tiposGenerador.map((tipo) => {
                          const val = String(tipo.id);
                          const checked =
                            field.value?.includes(val) ?? false;
                          return (
                            <label
                              key={tipo.id}
                              className="flex items-center gap-1.5 text-sm"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(isChecked) => {
                                  const current = field.value ?? [];
                                  if (isChecked) {
                                    field.onChange([...current, val]);
                                  } else {
                                    field.onChange(
                                      current.filter((v) => v !== val),
                                    );
                                  }
                                }}
                                disabled={isPending}
                              />
                              {tipo.nombre}
                            </label>
                          );
                        })}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            {/* === SECCIÓN: Materiales === */}
            <fieldset className="space-y-3">
              <div className="flex items-center justify-between">
                <legend className="text-sm font-semibold">
                  Materiales que recolecta (opcional)
                </legend>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      material_id: "",
                      cantidad_mensual: "",
                      precio_venta: "",
                      es_principal: false,
                    })
                  }
                  disabled={isPending}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Agregar
                </Button>
              </div>

              {fields.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No se han agregado materiales.
                </p>
              )}

              {fields.length > 0 && (
                <div className="space-y-3">
                  {/* Header de columnas */}
                  <div className="grid grid-cols-[1fr_5rem_5rem_4.5rem_2rem] gap-2 text-xs text-muted-foreground px-0.5">
                    <span>Material</span>
                    <span>Cant/mes</span>
                    <span>Precio</span>
                    <span>Principal</span>
                    <span></span>
                  </div>

                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-[1fr_5rem_5rem_4.5rem_2rem] gap-2 items-start"
                    >
                      <FormField
                        control={form.control}
                        name={`materiales.${index}.material_id`}
                        render={({ field: selectField }) => (
                          <FormItem>
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
                                        ? "..."
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
                        name={`materiales.${index}.cantidad_mensual`}
                        render={({ field: inputField }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                step="any"
                                placeholder="0"
                                disabled={isPending}
                                {...inputField}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`materiales.${index}.precio_venta`}
                        render={({ field: inputField }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                step="any"
                                placeholder="Bs."
                                disabled={isPending}
                                {...inputField}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`materiales.${index}.es_principal`}
                        render={({ field: checkField }) => (
                          <FormItem className="flex items-center justify-center pt-2">
                            <FormControl>
                              <Checkbox
                                checked={checkField.value}
                                onCheckedChange={checkField.onChange}
                                disabled={isPending}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(index)}
                        disabled={isPending}
                        className="mt-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </fieldset>

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
                  "Crear recolector"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
