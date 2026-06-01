"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { useCreateTransaccion } from "@/hooks/use-transacciones";
import { useRecolectores } from "@/hooks/use-recolectores";
import { useSucursales } from "@/hooks/use-sucursales";
import { useMateriales } from "@/hooks/use-materiales";
import { useCentrosOperacionales } from "@/hooks/use-centros-operacionales";
import { useExternos } from "@/hooks/use-externos";
import type { UnidadMedida, CreateTransaccionInput } from "@/types/api";
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

const unidadOptions: { value: UnidadMedida; label: string }[] = [
  { value: "KG", label: "KG" },
  { value: "UNIDAD", label: "Unidad" },
  { value: "BOLSA", label: "Bolsa" },
  { value: "TONELADA", label: "Tonelada" },
];

/**
 * Modo del formulario:
 * - "recoleccion": el admin registra que se recolectó. Backend asigna
 *   estado=RECOLECTADO. El destino se ignora (siempre queda vacío).
 * - "entrega": flujo completo con destino. Backend asigna estado=ENTREGADO.
 *   El destino es libre: centro operacional / externo / desconocido / sin asignar.
 */
export type FormMode = "recoleccion" | "entrega";

interface TransaccionFormDialogProps {
  open: boolean;
  mode: FormMode;
  onOpenChange: (open: boolean) => void;
}

// Tipo de destino para el modo "entrega". El backend reconstruye los 3 campos
// polimórficos a partir de esta elección.
type TipoDestino = "ninguno" | "centro_op" | "externo" | "desconocido";

// Valor centinela del Select de material: registra un "Otro" de texto libre
// (nombre escrito por el usuario) en lugar de un material del catálogo.
const MATERIAL_OTRO = "__otro__";

const baseDetalle = z.object({
  material_id: z.string().min(1, "Seleccione un material"),
  // Solo se usa cuando material_id === MATERIAL_OTRO.
  nombre_personalizado: z.string().max(100, "Máximo 100 caracteres").optional(),
  cantidad: z
    .string()
    .min(1, "Cantidad obligatoria")
    .refine((v) => Number(v) > 0, "La cantidad debe ser mayor a 0"),
  unidad_medida: z.enum(["KG", "UNIDAD", "BOLSA", "TONELADA"]),
  precio_unitario: z.string().optional(),
  // Sucursal de origen de esta línea (opcional). Permite indicar que el
  // material provino de un punto específico — útil cuando el recolector
  // consolida material de varias sucursales en una sola entrega.
  sucursal_id: z.string().optional(),
});

function buildSchema(mode: FormMode) {
  return z
    .object({
      recolector_id: z.string().min(1, "Indique qué recolector recogió"),
      fecha: z.date().optional(),
      hora: z.string().optional(),
      observaciones: z.string().max(500, "Máximo 500 caracteres").optional(),
      // Destino polimórfico — solo aplica al modo "entrega".
      tipo_destino: z.enum(["ninguno", "centro_op", "externo", "desconocido"]),
      centro_operacional_id: z.string().optional(),
      acopiador_externo_id: z.string().optional(),
      detalles: z.array(baseDetalle).min(1, "Debe registrar al menos un material"),
    })
    .superRefine((data, ctx) => {
      if (data.fecha && data.fecha > new Date()) {
        ctx.addIssue({
          code: "custom",
          path: ["fecha"],
          message: "La fecha no puede ser futura",
        });
      }
      // Si la línea es "Otro", el nombre del material es obligatorio.
      data.detalles.forEach((d, i) => {
        if (
          d.material_id === MATERIAL_OTRO &&
          !d.nombre_personalizado?.trim()
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["detalles", i, "nombre_personalizado"],
            message: "Escriba qué material es",
          });
        }
      });
      if (mode === "entrega") {
        // Precio obligatorio para cada material.
        data.detalles.forEach((d, i) => {
          if (!d.precio_unitario || Number(d.precio_unitario) <= 0) {
            ctx.addIssue({
              code: "custom",
              path: ["detalles", i, "precio_unitario"],
              message: "El precio es obligatorio",
            });
          }
        });
        // Si elige centro_op o externo, el dropdown asociado es obligatorio.
        if (
          data.tipo_destino === "centro_op" &&
          !data.centro_operacional_id
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["centro_operacional_id"],
            message: "Seleccione el centro operacional",
          });
        }
        if (
          data.tipo_destino === "externo" &&
          !data.acopiador_externo_id
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["acopiador_externo_id"],
            message: "Seleccione el acopiador/comprador externo",
          });
        }
      }
    });
}

type FormValues = {
  recolector_id: string;
  fecha?: Date;
  hora?: string;
  observaciones?: string;
  tipo_destino: TipoDestino;
  centro_operacional_id?: string;
  acopiador_externo_id?: string;
  detalles: {
    material_id: string;
    nombre_personalizado?: string;
    cantidad: string;
    unidad_medida: UnidadMedida;
    precio_unitario?: string;
    sucursal_id?: string;
  }[];
};

const defaultDetalle = {
  material_id: "",
  nombre_personalizado: "",
  cantidad: "",
  unidad_medida: "KG" as UnidadMedida,
  precio_unitario: "",
  sucursal_id: "",
};

const defaultValues: FormValues = {
  recolector_id: "",
  fecha: undefined,
  hora: "",
  observaciones: "",
  tipo_destino: "ninguno",
  centro_operacional_id: "",
  acopiador_externo_id: "",
  detalles: [defaultDetalle],
};

export function TransaccionFormDialog({
  open,
  mode,
  onOpenChange,
}: TransaccionFormDialogProps) {
  const createMutation = useCreateTransaccion();
  const isPending = createMutation.isPending;

  const { data: recolectoresData } = useRecolectores({
    limit: 100,
    activo: true,
  });
  const { data: sucursalesData } = useSucursales({ limit: 100, activo: true });
  const { data: materialesData } = useMateriales({ limit: 100, activo: true });
  const { data: centrosData } = useCentrosOperacionales({
    limit: 100,
    activo: true,
  });
  const { data: externosData } = useExternos({ limit: 100, activo: true });

  const schema = buildSchema(mode);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const detallesFields = useFieldArray({
    control: form.control,
    name: "detalles",
  });

  const tipoDestino = form.watch("tipo_destino");

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, form, mode]);

  function onSubmit(data: FormValues) {
    const payload: CreateTransaccionInput = {
      estado: mode === "recoleccion" ? "RECOLECTADO" : "ENTREGADO",
      recolector_id: Number(data.recolector_id),
      observaciones: data.observaciones || undefined,
      detalles: data.detalles.map((d) => ({
        // Catálogo (material_id) o "Otro" (nombre_personalizado), nunca ambos.
        ...(d.material_id === MATERIAL_OTRO
          ? { nombre_personalizado: d.nombre_personalizado?.trim() }
          : { material_id: Number(d.material_id) }),
        cantidad: Number(d.cantidad),
        unidad_medida: d.unidad_medida,
        precio_unitario:
          mode === "entrega" && d.precio_unitario
            ? Number(d.precio_unitario)
            : undefined,
        ...(d.sucursal_id ? { sucursal_id: Number(d.sucursal_id) } : {}),
      })),
    };

    if (data.fecha) payload.fecha = format(data.fecha, "yyyy-MM-dd");
    if (data.hora) payload.hora = data.hora;

    // Destino polimórfico solo aplica al modo entrega; recoleccion lo ignora.
    if (mode === "entrega") {
      if (data.tipo_destino === "centro_op" && data.centro_operacional_id) {
        payload.centro_operacional_id = Number(data.centro_operacional_id);
      } else if (
        data.tipo_destino === "externo" &&
        data.acopiador_externo_id
      ) {
        payload.acopiador_externo_id = Number(data.acopiador_externo_id);
      } else if (data.tipo_destino === "desconocido") {
        payload.destino_desconocido = true;
      }
      // "ninguno" → no se envía ningún campo de destino.
    }

    createMutation.mutate(payload, {
      onSuccess: () => onOpenChange(false),
    });
  }

  const titulo =
    mode === "recoleccion" ? "Registrar recolección" : "Registrar entrega";
  const descripcion =
    mode === "recoleccion"
      ? "El recolector recogió pero aún no entregó. No se pide precio ni destino; el centro operacional los completará al verificar."
      : "Flujo completo: el recolector ya entregó. Se registran cantidades, precios y destino final.";
  const labelConfirmar =
    mode === "recoleccion" ? "Registrar recolección" : "Registrar entrega";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {/* Recolector */}
            <FormField
              control={form.control}
              name="recolector_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recolector</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar recolector" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {recolectoresData?.data.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.nombre_completo} ({r.cedula_identidad})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Destino polimórfico — solo en modo entrega */}
            {mode === "entrega" && (
              <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                <FormField
                  control={form.control}
                  name="tipo_destino"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destino de la entrega</FormLabel>
                      <Select
                        onValueChange={(v: TipoDestino) => {
                          field.onChange(v);
                          // Limpiar dropdowns dependientes al cambiar el tipo.
                          if (v !== "centro_op") {
                            form.setValue("centro_operacional_id", "");
                          }
                          if (v !== "externo") {
                            form.setValue("acopiador_externo_id", "");
                          }
                        }}
                        value={field.value}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ninguno">
                            Sin asignar (pendiente)
                          </SelectItem>
                          <SelectItem value="centro_op">
                            Centro operacional
                          </SelectItem>
                          <SelectItem value="externo">
                            Acopiador/comprador externo
                          </SelectItem>
                          <SelectItem value="desconocido">
                            Desconocido
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {tipoDestino === "centro_op" && (
                  <FormField
                    control={form.control}
                    name="centro_operacional_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Centro operacional</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isPending}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleccionar centro" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {centrosData?.data.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.nombre_completo} — {c.nombre_punto}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {tipoDestino === "externo" && (
                  <FormField
                    control={form.control}
                    name="acopiador_externo_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Acopiador/comprador externo</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isPending}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleccionar externo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {externosData?.data.map((e) => (
                              <SelectItem key={e.id} value={String(e.id)}>
                                {e.nombre}
                                {e.asociacion ? ` (${e.asociacion})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {tipoDestino === "desconocido" && (
                  <p className="text-muted-foreground text-xs italic">
                    Se entregó pero no se sabe a quién. Esta entrega queda en
                    ENTREGADO indefinidamente (no genera pago).
                  </p>
                )}

                {tipoDestino === "ninguno" && (
                  <p className="text-muted-foreground text-xs italic">
                    Destino pendiente. Podrá asignarse después editando la
                    entrega o cuando un centro operacional la verifique.
                  </p>
                )}
              </div>
            )}

            {/* Fecha y hora opcionales (backdating) */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fecha"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>
                      Fecha{" "}
                      <span className="text-muted-foreground text-xs font-normal">
                        (opcional)
                      </span>
                    </FormLabel>
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
                              : "Hoy"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
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
                name="hora"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Hora{" "}
                      <span className="text-muted-foreground text-xs font-normal">
                        (opcional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input type="time" disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Materiales */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Materiales</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    detallesFields.append({ ...defaultDetalle })
                  }
                  disabled={isPending}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Agregar material
                </Button>
              </div>

              {detallesFields.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="space-y-2 rounded-md border p-3"
                >
                <div className="grid grid-cols-12 items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`detalles.${index}.material_id`}
                    render={({ field: selectField }) => (
                      <FormItem
                        className={
                          mode === "entrega" ? "col-span-4" : "col-span-6"
                        }
                      >
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
                            {materialesData?.data.map((m) => (
                              <SelectItem key={m.id} value={String(m.id)}>
                                {m.nombre}
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
                    name={`detalles.${index}.cantidad`}
                    render={({ field: inputField }) => (
                      <FormItem className="col-span-2">
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder="Cant."
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
                    name={`detalles.${index}.unidad_medida`}
                    render={({ field: selectField }) => (
                      <FormItem className="col-span-2">
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

                  {mode === "entrega" && (
                    <FormField
                      control={form.control}
                      name={`detalles.${index}.precio_unitario`}
                      render={({ field: inputField }) => (
                        <FormItem className="col-span-3">
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="Precio (Bs)"
                              disabled={isPending}
                              {...inputField}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div
                    className={cn(
                      "flex justify-end pt-1",
                      mode === "entrega" ? "col-span-1" : "col-span-2",
                    )}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => detallesFields.remove(index)}
                      disabled={isPending || detallesFields.fields.length === 1}
                      aria-label="Quitar línea"
                      title="Quitar línea"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Nombre libre cuando la línea es "Otro". */}
                {form.watch(`detalles.${index}.material_id`) ===
                  MATERIAL_OTRO && (
                  <FormField
                    control={form.control}
                    name={`detalles.${index}.nombre_personalizado`}
                    render={({ field: inputField }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">
                          Nombre del material (Otro)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="¿Qué material es? (ej: Pilas, Telgopor...)"
                            disabled={isPending}
                            {...inputField}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Origen (sucursal) por línea — opcional. Permite indicar
                    desde qué sucursal vino este material específico cuando
                    el recolector consolidó material de varias sucursales. */}
                <FormField
                  control={form.control}
                  name={`detalles.${index}.sucursal_id`}
                  render={({ field: selectField }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Origen{" "}
                        <span className="font-normal">(opcional)</span>
                      </FormLabel>
                      <Select
                        onValueChange={(v) =>
                          selectField.onChange(v === "__none__" ? "" : v)
                        }
                        value={selectField.value || "__none__"}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">
                            Sin especificar origen
                          </SelectItem>
                          {sucursalesData?.data.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.generador.razon_social} — {s.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </div>
              ))}
            </div>

            <FormField
              control={form.control}
              name="observaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Observaciones{" "}
                    <span className="text-muted-foreground text-xs font-normal">
                      (opcional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        mode === "recoleccion"
                          ? "Notas sobre la recolección"
                          : "Notas sobre la entrega"
                      }
                      disabled={isPending}
                      rows={2}
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
                ) : (
                  labelConfirmar
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
