"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";
import {
  useEditTransaccionAdmin,
  useTransaccionDetalle,
} from "@/hooks/use-transacciones";
import { useRecolectores } from "@/hooks/use-recolectores";
import { useSucursales } from "@/hooks/use-sucursales";
import { useMateriales } from "@/hooks/use-materiales";
import type {
  EditTransaccionAdminInput,
  UnidadMedida,
} from "@/types/api";
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

const detalleSchema = z.object({
  material_id: z.string().min(1, "Seleccione un material"),
  cantidad: z
    .string()
    .min(1, "Cantidad obligatoria")
    .refine((v) => Number(v) > 0, "La cantidad debe ser mayor a 0"),
  unidad_medida: z.enum(["KG", "UNIDAD", "BOLSA", "TONELADA"]),
  precio_unitario: z.string().optional(),
});

const formSchema = z
  .object({
    observaciones: z.string().max(500, "Máximo 500 caracteres").optional(),
    recolector_id: z.string().optional(),
    sucursal_id: z.string().optional(),
    fecha: z.date().optional(),
    hora: z.string().optional(),
    detalles: z.array(detalleSchema).min(1, "Debe haber al menos un material"),
  })
  .superRefine((data, ctx) => {
    if (data.fecha && data.fecha > new Date()) {
      ctx.addIssue({
        code: "custom",
        path: ["fecha"],
        message: "La fecha no puede ser futura",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

interface TransaccionEditDialogProps {
  transaccionId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransaccionEditDialog({
  transaccionId,
  open,
  onOpenChange,
}: TransaccionEditDialogProps) {
  const { data: transaccion, isLoading } = useTransaccionDetalle(
    open ? transaccionId : null,
  );
  const editMutation = useEditTransaccionAdmin(transaccionId ?? 0);
  const [sucursalQuitada, setSucursalQuitada] = useState(false);

  const esPagada = transaccion?.estado === "PAGADO";

  // Recolectores del mismo acopiador actual de la entrega.
  const { data: recolectoresData } = useRecolectores({
    limit: 100,
    activo: true,
    acopiador_id: transaccion?.acopiador_id ?? undefined,
  });
  const { data: sucursalesData } = useSucursales({ limit: 100, activo: true });
  const { data: materialesData } = useMateriales({ limit: 100, activo: true });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      observaciones: "",
      recolector_id: "",
      sucursal_id: "",
      fecha: undefined,
      hora: "",
      detalles: [
        {
          material_id: "",
          cantidad: "",
          unidad_medida: "KG" as UnidadMedida,
          precio_unitario: "",
        },
      ],
    },
  });

  const detallesFields = useFieldArray({
    control: form.control,
    name: "detalles",
  });

  // Precargar cuando llega la transacción. También se reejecuta cuando
  // llegan los recolectores porque el Select de shadcn no refleja el
  // `value` si al montar la opción aún no existe en la lista.
  useEffect(() => {
    if (open && transaccion && recolectoresData) {
      setSucursalQuitada(false);
      // hora: viene como "1970-01-01THH:mm:ss.sssZ" — extraemos HH:mm.
      const horaDate = transaccion.hora ? new Date(transaccion.hora) : null;
      const horaStr = horaDate
        ? `${String(horaDate.getUTCHours()).padStart(2, "0")}:${String(horaDate.getUTCMinutes()).padStart(2, "0")}`
        : "";

      form.reset({
        observaciones: transaccion.observaciones ?? "",
        recolector_id: transaccion.recolector_id
          ? String(transaccion.recolector_id)
          : "",
        sucursal_id: transaccion.sucursal_id
          ? String(transaccion.sucursal_id)
          : "",
        fecha: transaccion.fecha ? new Date(transaccion.fecha) : undefined,
        hora: horaStr,
        detalles:
          transaccion.detalle_transaccion.length > 0
            ? transaccion.detalle_transaccion.map((d) => ({
                material_id: String(d.material_id),
                cantidad: String(d.cantidad),
                unidad_medida: d.unidad_medida as UnidadMedida,
                precio_unitario:
                  Number(d.precio_unitario) > 0
                    ? String(d.precio_unitario)
                    : "",
              }))
            : [
                {
                  material_id: "",
                  cantidad: "",
                  unidad_medida: "KG" as UnidadMedida,
                  precio_unitario: "",
                },
              ],
      });
    }
  }, [open, transaccion, recolectoresData, form]);

  function onSubmit(data: FormValues) {
    if (!transaccion) return;

    const payload: EditTransaccionAdminInput = {};

    if ((data.observaciones ?? "") !== (transaccion.observaciones ?? "")) {
      payload.observaciones = data.observaciones || "";
    }

    if (!esPagada) {
      // Fecha y hora
      const fechaOriginal = transaccion.fecha
        ? format(new Date(transaccion.fecha), "yyyy-MM-dd")
        : "";
      if (data.fecha) {
        const fechaNueva = format(data.fecha, "yyyy-MM-dd");
        if (fechaNueva !== fechaOriginal) payload.fecha = fechaNueva;
      }
      const horaOriginal = transaccion.hora
        ? (() => {
            const h = new Date(transaccion.hora);
            return `${String(h.getUTCHours()).padStart(2, "0")}:${String(h.getUTCMinutes()).padStart(2, "0")}`;
          })()
        : "";
      if (data.hora && data.hora !== horaOriginal) payload.hora = data.hora;

      // Recolector
      const recolectorNuevo = data.recolector_id
        ? Number(data.recolector_id)
        : null;
      if (recolectorNuevo && recolectorNuevo !== transaccion.recolector_id) {
        payload.recolector_id = recolectorNuevo;
      }

      // Sucursal: usamos el flag "sucursalQuitada" para distinguir quitar vs no cambiar.
      const sucursalNueva = data.sucursal_id
        ? Number(data.sucursal_id)
        : null;
      if (sucursalQuitada) {
        payload.sucursal_id = null;
      } else if (sucursalNueva && sucursalNueva !== transaccion.sucursal_id) {
        payload.sucursal_id = sucursalNueva;
      }

      // Detalles
      payload.detalles = data.detalles.map((d) => ({
        material_id: Number(d.material_id),
        cantidad: Number(d.cantidad),
        unidad_medida: d.unidad_medida,
        precio_unitario: d.precio_unitario
          ? Number(d.precio_unitario)
          : undefined,
      }));
    }

    if (Object.keys(payload).length === 0) {
      onOpenChange(false);
      return;
    }

    editMutation.mutate(payload, {
      onSuccess: () => onOpenChange(false),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar entrega{transaccion ? ` #${transaccion.id}` : ""}
          </DialogTitle>
          <DialogDescription>
            {esPagada
              ? "Esta entrega ya fue pagada. Solo puede editar las observaciones."
              : "Corrija los campos que necesite. Los cambios se guardan sin afectar el estado del flujo."}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !transaccion ? (
          <div className="py-8 text-center text-muted-foreground">
            Cargando...
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {!esPagada && (
                <>
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
                          disabled={editMutation.isPending}
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
                        <p className="text-muted-foreground text-xs">
                          Solo se listan recolectores del mismo acopiador
                          actual.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Sucursal */}
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
                          onValueChange={(v) => {
                            if (v === "__none__") {
                              field.onChange("");
                              setSucursalQuitada(true);
                            } else {
                              field.onChange(v);
                              setSucursalQuitada(false);
                            }
                          }}
                          value={
                            sucursalQuitada
                              ? "__none__"
                              : field.value || "__none__"
                          }
                          disabled={editMutation.isPending}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">
                              No especificar
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

                  {/* Fecha + hora */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fecha"
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
                                  disabled={editMutation.isPending}
                                >
                                  {field.value
                                    ? format(field.value, "dd/MM/yyyy")
                                    : "Elegir"}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(d) => d > new Date()}
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
                          <FormLabel>Hora</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              disabled={editMutation.isPending}
                              {...field}
                            />
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
                          detallesFields.append({
                            material_id: "",
                            cantidad: "",
                            unidad_medida: "KG" as UnidadMedida,
                            precio_unitario: "",
                          })
                        }
                        disabled={editMutation.isPending}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Agregar
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
                            <FormItem className="col-span-4">
                              <Select
                                onValueChange={selectField.onChange}
                                value={selectField.value}
                                disabled={editMutation.isPending}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Material" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {materialesData?.data.map((m) => (
                                    <SelectItem
                                      key={m.id}
                                      value={String(m.id)}
                                    >
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
                                  disabled={editMutation.isPending}
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
                                disabled={editMutation.isPending}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {unidadOptions.map((opt) => (
                                    <SelectItem
                                      key={opt.value}
                                      value={opt.value}
                                    >
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
                          name={`detalles.${index}.precio_unitario`}
                          render={({ field: inputField }) => (
                            <FormItem className="col-span-3">
                              <FormControl>
                                <Input
                                  type="number"
                                  step="any"
                                  placeholder="Precio (Bs)"
                                  disabled={editMutation.isPending}
                                  {...inputField}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="col-span-1 flex justify-end pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => detallesFields.remove(index)}
                            disabled={
                              editMutation.isPending ||
                              detallesFields.fields.length === 1
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Observaciones — siempre editable */}
              <FormField
                control={form.control}
                name="observaciones"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observaciones</FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={editMutation.isPending}
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
                  disabled={editMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={editMutation.isPending}>
                  {editMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
