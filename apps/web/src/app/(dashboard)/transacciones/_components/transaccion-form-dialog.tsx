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
import { useAcopiadores } from "@/hooks/use-acopiadores";
import { useSucursales } from "@/hooks/use-sucursales";
import { useMateriales } from "@/hooks/use-materiales";
import type {
  EstadoTransaccion,
  UnidadMedida,
  CreateTransaccionInput,
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

// Estado PAGADO no se permite: es exclusivo del flujo de pago del acopiador.
const estadoOptions: { value: EstadoTransaccion; label: string; help: string }[] = [
  {
    value: "GENERADO",
    label: "Generado",
    help: "El generador registró residuos disponibles en una sucursal.",
  },
  {
    value: "RECOLECTADO",
    label: "Recolectado",
    help: "El recolector recogió los residuos; falta entregarlos al acopiador.",
  },
  {
    value: "ENTREGADO",
    label: "Entregado",
    help: "Flujo completo registrado; el acopiador recibió los materiales.",
  },
];

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
    estado: z.enum(["GENERADO", "RECOLECTADO", "ENTREGADO"]),
    recolector_id: z.string().optional(),
    acopiador_id: z.string().optional(),
    sucursal_id: z.string().optional(),
    fecha: z.date().optional(),
    hora: z.string().optional(),
    observaciones: z.string().max(500, "Máximo 500 caracteres").optional(),
    detalles: z
      .array(detalleSchema)
      .min(1, "Debe registrar al menos un material"),
  })
  .superRefine((data, ctx) => {
    if (data.estado === "GENERADO" && !data.sucursal_id) {
      ctx.addIssue({
        code: "custom",
        path: ["sucursal_id"],
        message: "La sucursal es obligatoria para el estado GENERADO",
      });
    }
    if (
      (data.estado === "RECOLECTADO" || data.estado === "ENTREGADO") &&
      !data.recolector_id
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["recolector_id"],
        message: "El recolector es obligatorio",
      });
    }
    if (data.estado === "ENTREGADO" && !data.acopiador_id) {
      ctx.addIssue({
        code: "custom",
        path: ["acopiador_id"],
        message: "El acopiador es obligatorio para el estado ENTREGADO",
      });
    }
    if (data.fecha && data.fecha > new Date()) {
      ctx.addIssue({
        code: "custom",
        path: ["fecha"],
        message: "La fecha no puede ser futura",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

const defaultDetalle = {
  material_id: "",
  cantidad: "",
  unidad_medida: "KG" as UnidadMedida,
  precio_unitario: "",
};

interface TransaccionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransaccionFormDialog({
  open,
  onOpenChange,
}: TransaccionFormDialogProps) {
  const createMutation = useCreateTransaccion();
  const isPending = createMutation.isPending;

  // Catálogos (solo activos)
  const { data: recolectoresData } = useRecolectores({
    limit: 100,
    activo: true,
  });
  const { data: acopiadoresData } = useAcopiadores({
    limit: 100,
    activo: true,
  });
  const { data: sucursalesData } = useSucursales({ limit: 100, activo: true });
  const { data: materialesData } = useMateriales({ limit: 100, activo: true });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      estado: "ENTREGADO",
      recolector_id: "",
      acopiador_id: "",
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

  const estado = form.watch("estado");

  useEffect(() => {
    if (open) {
      form.reset({
        estado: "ENTREGADO",
        recolector_id: "",
        acopiador_id: "",
        sucursal_id: "",
        fecha: undefined,
        hora: "",
        observaciones: "",
        detalles: [defaultDetalle],
      });
    }
  }, [open, form]);

  // Al cambiar de estado, limpiar campos que no aplican para no enviar datos erróneos
  useEffect(() => {
    if (estado === "GENERADO") {
      form.setValue("recolector_id", "");
      form.setValue("acopiador_id", "");
    } else if (estado === "RECOLECTADO") {
      form.setValue("sucursal_id", "");
    } else if (estado === "ENTREGADO") {
      form.setValue("sucursal_id", "");
    }
  }, [estado, form]);

  function onSubmit(data: FormValues) {
    const payload: CreateTransaccionInput = {
      estado: data.estado,
      observaciones: data.observaciones || undefined,
      detalles: data.detalles.map((d) => ({
        material_id: Number(d.material_id),
        cantidad: Number(d.cantidad),
        unidad_medida: d.unidad_medida,
        precio_unitario: d.precio_unitario
          ? Number(d.precio_unitario)
          : undefined,
      })),
    };

    if (data.recolector_id) payload.recolector_id = Number(data.recolector_id);
    if (data.acopiador_id) payload.acopiador_id = Number(data.acopiador_id);
    if (data.sucursal_id) payload.sucursal_id = Number(data.sucursal_id);
    if (data.fecha) payload.fecha = format(data.fecha, "yyyy-MM-dd");
    if (data.hora) payload.hora = data.hora;

    createMutation.mutate(payload, {
      onSuccess: () => onOpenChange(false),
    });
  }

  const estadoHelp = estadoOptions.find((o) => o.value === estado)?.help;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear transacción</DialogTitle>
          <DialogDescription>
            Registra manualmente una transacción en cualquier estado del flujo
            (excepto PAGADO, que se maneja desde el flujo de pago del
            acopiador).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="estado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado inicial</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {estadoOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {estadoHelp && (
                    <p className="text-muted-foreground text-xs">
                      {estadoHelp}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sucursal: solo para GENERADO */}
            {estado === "GENERADO" && (
              <FormField
                control={form.control}
                name="sucursal_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sucursal</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar sucursal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
            )}

            {/* Recolector: para RECOLECTADO y ENTREGADO */}
            {(estado === "RECOLECTADO" || estado === "ENTREGADO") && (
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
            )}

            {/* Acopiador: obligatorio en ENTREGADO, opcional en RECOLECTADO */}
            {(estado === "RECOLECTADO" || estado === "ENTREGADO") && (
              <FormField
                control={form.control}
                name="acopiador_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Acopiador
                      {estado === "RECOLECTADO" && (
                        <span className="text-muted-foreground text-xs font-normal">
                          {" "}
                          (opcional — si se omite se hereda del recolector)
                        </span>
                      )}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar acopiador" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {acopiadoresData?.data.map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {a.nombre_completo} — {a.nombre_punto}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

            {/* Detalles: array dinámico */}
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
                      <FormItem className="col-span-4">
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

                  <div className="col-span-1 flex justify-end pt-1">
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
                      placeholder="Notas sobre la transacción"
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
                  "Crear transacción"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
