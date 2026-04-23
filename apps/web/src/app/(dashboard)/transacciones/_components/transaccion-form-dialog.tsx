"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2, Plus, Trash2, Info } from "lucide-react";
import { useCreateTransaccion } from "@/hooks/use-transacciones";
import { useRecolectores } from "@/hooks/use-recolectores";
import { useSucursales } from "@/hooks/use-sucursales";
import { useMateriales } from "@/hooks/use-materiales";
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
 * - "recoleccion": el recolector ya recogió pero aún no entregó al acopiador.
 *   No se pide precio; se asigna acopiador automático por relación fija.
 * - "entrega": flujo completo recolector → acopiador (sin pago). Se exigen
 *   precios; también se asigna el acopiador automático del recolector.
 */
export type FormMode = "recoleccion" | "entrega";

interface TransaccionFormDialogProps {
  open: boolean;
  mode: FormMode;
  onOpenChange: (open: boolean) => void;
}

const baseDetalle = z.object({
  material_id: z.string().min(1, "Seleccione un material"),
  cantidad: z
    .string()
    .min(1, "Cantidad obligatoria")
    .refine((v) => Number(v) > 0, "La cantidad debe ser mayor a 0"),
  unidad_medida: z.enum(["KG", "UNIDAD", "BOLSA", "TONELADA"]),
  precio_unitario: z.string().optional(),
});

function buildSchema(mode: FormMode) {
  return z
    .object({
      recolector_id: z.string().min(1, "Indique qué recolector recogió"),
      sucursal_id: z.string().optional(),
      fecha: z.date().optional(),
      hora: z.string().optional(),
      observaciones: z.string().max(500, "Máximo 500 caracteres").optional(),
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
      if (mode === "entrega") {
        data.detalles.forEach((d, i) => {
          if (!d.precio_unitario || Number(d.precio_unitario) <= 0) {
            ctx.addIssue({
              code: "custom",
              path: ["detalles", i, "precio_unitario"],
              message: "El precio es obligatorio",
            });
          }
        });
      }
    });
}

type FormValues = {
  recolector_id: string;
  sucursal_id?: string;
  fecha?: Date;
  hora?: string;
  observaciones?: string;
  detalles: {
    material_id: string;
    cantidad: string;
    unidad_medida: UnidadMedida;
    precio_unitario?: string;
  }[];
};

const defaultDetalle = {
  material_id: "",
  cantidad: "",
  unidad_medida: "KG" as UnidadMedida,
  precio_unitario: "",
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

  const schema = buildSchema(mode);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      recolector_id: "",
      sucursal_id: "",
      fecha: undefined,
      hora: "",
      observaciones: "",
      detalles: [defaultDetalle],
    },
  });

  const detallesFields = useFieldArray({
    control: form.control,
    name: "detalles",
  });

  const recolectorId = form.watch("recolector_id");
  const recolectorSeleccionado = recolectoresData?.data.find(
    (r) => String(r.id) === recolectorId,
  );

  useEffect(() => {
    if (open) {
      form.reset({
        recolector_id: "",
        sucursal_id: "",
        fecha: undefined,
        hora: "",
        observaciones: "",
        detalles: [defaultDetalle],
      });
    }
  }, [open, form, mode]);

  function onSubmit(data: FormValues) {
    const payload: CreateTransaccionInput = {
      estado: mode === "recoleccion" ? "RECOLECTADO" : "ENTREGADO",
      recolector_id: Number(data.recolector_id),
      observaciones: data.observaciones || undefined,
      detalles: data.detalles.map((d) => ({
        material_id: Number(d.material_id),
        cantidad: Number(d.cantidad),
        unidad_medida: d.unidad_medida,
        precio_unitario:
          mode === "entrega" && d.precio_unitario
            ? Number(d.precio_unitario)
            : undefined,
      })),
    };

    if (data.sucursal_id) payload.sucursal_id = Number(data.sucursal_id);
    if (data.fecha) payload.fecha = format(data.fecha, "yyyy-MM-dd");
    if (data.hora) payload.hora = data.hora;

    createMutation.mutate(payload, {
      onSuccess: () => onOpenChange(false),
    });
  }

  const titulo =
    mode === "recoleccion" ? "Registrar recolección" : "Registrar entrega";
  const descripcion =
    mode === "recoleccion"
      ? "El recolector recogió pero aún no entregó al acopiador. No se pide precio; el acopiador lo completará al verificar."
      : "Flujo completo: el recolector ya entregó al acopiador. Se registran cantidades y precios finales.";
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

            {/* Info acopiador heredado: readonly */}
            {recolectorSeleccionado && (
              <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs">
                    Acopiador asignado
                  </p>
                  <p className="font-medium">
                    {recolectorSeleccionado.acopiador.nombre_completo}
                    {recolectorSeleccionado.acopiador.nombre_punto && (
                      <span className="text-muted-foreground">
                        {" "}— {recolectorSeleccionado.acopiador.nombre_punto}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    El recolector siempre entrega a su acopiador asignado.
                  </p>
                </div>
              </div>
            )}

            {/* Sucursal opcional */}
            <FormField
              control={form.control}
              name="sucursal_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Sucursal de origen{" "}
                    <span className="text-muted-foreground text-xs font-normal">
                      (opcional)
                    </span>
                  </FormLabel>
                  <Select
                    onValueChange={(v) =>
                      field.onChange(v === "__none__" ? "" : v)
                    }
                    value={field.value || "__none__"}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">No especificar</SelectItem>
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
                  className="grid grid-cols-12 items-start gap-2 rounded-md border p-3"
                >
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
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
