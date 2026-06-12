"use client";

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
import { useCentrosOperacionales } from "@/hooks/use-centros-operacionales";
import { useExternos } from "@/hooks/use-externos";
import type {
  AcopiadorCompradorExterno,
  CentroOperacional,
  EditTransaccionAdminInput,
  Material,
  PaginatedResponse,
  Recolector,
  Sucursal,
  TransaccionDetalle,
  UnidadMedida,
} from "@/types/api";
import { cn, parsearDecimal, fechaSoloDesdeISO } from "@/lib/utils";
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

type TipoDestino = "ninguno" | "centro_op" | "externo" | "desconocido";

// Deriva el tipo de destino actual de la transacción a partir de los 3
// campos polimórficos. Garantizado por CHECK constraint en BD que máximo 1
// está marcado.
function deriveTipoDestino(t: TransaccionDetalle | undefined): TipoDestino {
  if (!t) return "ninguno";
  if (t.centro_operacional_id != null) return "centro_op";
  if (t.acopiador_externo_id != null) return "externo";
  if (t.destino_desconocido) return "desconocido";
  return "ninguno";
}

// Valor centinela del Select de material: registra un "Otro" de texto libre.
const MATERIAL_OTRO = "__otro__";

const detalleSchema = z.object({
  material_id: z.string().min(1, "Seleccione un material"),
  // Solo se usa cuando material_id === MATERIAL_OTRO.
  nombre_personalizado: z.string().max(100, "Máximo 100 caracteres").optional(),
  cantidad: z
    .string()
    .min(1, "Cantidad obligatoria")
    .refine((v) => {
      const n = parsearDecimal(v);
      return n != null && n > 0;
    }, "La cantidad debe ser mayor a 0"),
  unidad_medida: z.enum(["KG", "UNIDAD", "BOLSA", "TONELADA"]),
  // Opcional (una recolección puede no tener precio aún). Pero si se escribe
  // algo, debe ser un número válido ≥ 0 — así un valor inválido muestra error
  // en vez de perderse en silencio (bug histórico con la coma decimal).
  precio_unitario: z
    .string()
    .optional()
    .refine((v) => {
      if (!v || v.trim() === "") return true;
      const n = parsearDecimal(v);
      return n != null && n >= 0;
    }, "Precio inválido"),
  // Sucursal de origen de esta línea (opcional). Permite indicar que el
  // material provino de un punto específico.
  sucursal_id: z.string().optional(),
});

const formSchema = z
  .object({
    observaciones: z.string().max(500, "Máximo 500 caracteres").optional(),
    recolector_id: z.string().optional(),
    fecha: z.date().optional(),
    hora: z.string().optional(),
    tipo_destino: z.enum(["ninguno", "centro_op", "externo", "desconocido"]),
    centro_operacional_id: z.string().optional(),
    acopiador_externo_id: z.string().optional(),
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
    // Si la línea es "Otro", el nombre del material es obligatorio.
    data.detalles.forEach((d, i) => {
      if (d.material_id === MATERIAL_OTRO && !d.nombre_personalizado?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["detalles", i, "nombre_personalizado"],
          message: "Escriba qué material es",
        });
      }
    });
    if (data.tipo_destino === "centro_op" && !data.centro_operacional_id) {
      ctx.addIssue({
        code: "custom",
        path: ["centro_operacional_id"],
        message: "Seleccione el centro operacional",
      });
    }
    if (data.tipo_destino === "externo" && !data.acopiador_externo_id) {
      ctx.addIssue({
        code: "custom",
        path: ["acopiador_externo_id"],
        message: "Seleccione el acopiador/comprador externo",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

interface TransaccionEditDialogProps {
  transaccionId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Shell del diálogo: controla el open/close y carga la transacción a editar.
 * El formulario interno (EditForm) sólo se monta cuando TODOS los datos
 * necesarios están listos. Esto evita el bug en Radix Select donde un
 * `value` controlado no se aplica si los <SelectItem> aún no se montaron
 * en el momento del primer render: al inicializar `useForm` ya con los
 * valores correctos como `defaultValues`, no hace falta `form.reset` y los
 * Select muestran la opción seleccionada desde el primer render.
 */
export function TransaccionEditDialog({
  transaccionId,
  open,
  onOpenChange,
}: TransaccionEditDialogProps) {
  const { data: transaccion, isLoading: loadingTransaccion } =
    useTransaccionDetalle(open ? transaccionId : null);
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

  const ready =
    transaccion &&
    recolectoresData &&
    sucursalesData &&
    materialesData &&
    centrosData &&
    externosData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar entrega{transaccion ? ` #${transaccion.id}` : ""}
          </DialogTitle>
          <DialogDescription>
            {transaccion?.estado === "PAGADO"
              ? "Esta entrega ya fue pagada. Solo puede editar las observaciones."
              : "Corrija los campos que necesite. Los cambios se guardan sin afectar el estado del flujo."}
          </DialogDescription>
        </DialogHeader>

        {loadingTransaccion || !ready ? (
          <div className="py-8 text-center text-muted-foreground">
            Cargando...
          </div>
        ) : (
          <EditForm
            // El key reinicia el formulario completo cuando se cambia de
            // transacción mientras el diálogo está abierto.
            key={transaccion.id}
            transaccion={transaccion}
            recolectores={recolectoresData.data}
            sucursales={sucursalesData.data}
            materiales={materialesData.data}
            centros={centrosData.data}
            externos={externosData.data}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface EditFormProps {
  transaccion: TransaccionDetalle;
  recolectores: Recolector[];
  sucursales: Sucursal[];
  materiales: Material[];
  centros: CentroOperacional[];
  externos: AcopiadorCompradorExterno[];
  onClose: () => void;
}

function EditForm({
  transaccion,
  recolectores,
  sucursales,
  materiales,
  centros,
  externos,
  onClose,
}: EditFormProps) {
  const editMutation = useEditTransaccionAdmin(transaccion.id);
  const esPagada = transaccion.estado === "PAGADO";

  // Hora: el backend guarda los componentes UTC del momento de creación
  // (porque la columna BD es `time without time zone` y Prisma serializa el
  // Date con sufijo Z). Al leer queremos mostrar la hora local del usuario:
  // si una transacción se registró a las 22:50 hora Bolivia, el usuario
  // espera ver "22:50" en el form, no "02:50" (UTC).
  const horaStr = transaccion.hora
    ? (() => {
        const d = new Date(transaccion.hora);
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      })()
    : "";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      observaciones: transaccion.observaciones ?? "",
      recolector_id: transaccion.recolector_id
        ? String(transaccion.recolector_id)
        : "",
      // @db.Date llega como medianoche UTC; lo pasamos a un Date local del
      // mismo día para que el calendario y el guardado no corran un día.
      fecha: fechaSoloDesdeISO(transaccion.fecha),
      hora: horaStr,
      tipo_destino: deriveTipoDestino(transaccion),
      centro_operacional_id: transaccion.centro_operacional_id
        ? String(transaccion.centro_operacional_id)
        : "",
      acopiador_externo_id: transaccion.acopiador_externo_id
        ? String(transaccion.acopiador_externo_id)
        : "",
      detalles:
        transaccion.detalle_transaccion.length > 0
          ? transaccion.detalle_transaccion.map((d) => ({
              // Si la línea no tiene material de catálogo es un "Otro".
              material_id:
                d.material_id != null ? String(d.material_id) : MATERIAL_OTRO,
              nombre_personalizado: d.nombre_personalizado ?? "",
              cantidad: String(d.cantidad),
              unidad_medida: d.unidad_medida as UnidadMedida,
              precio_unitario:
                Number(d.precio_unitario) > 0
                  ? String(d.precio_unitario)
                  : "",
              sucursal_id:
                d.sucursal_id != null ? String(d.sucursal_id) : "",
            }))
          : [
              {
                material_id: "",
                nombre_personalizado: "",
                cantidad: "",
                unidad_medida: "KG" as UnidadMedida,
                precio_unitario: "",
                sucursal_id: "",
              },
            ],
    },
  });

  const detallesFields = useFieldArray({
    control: form.control,
    name: "detalles",
  });

  const tipoDestino = form.watch("tipo_destino");

  function onSubmit(data: FormValues) {
    const payload: EditTransaccionAdminInput = {};

    if ((data.observaciones ?? "") !== (transaccion.observaciones ?? "")) {
      payload.observaciones = data.observaciones || "";
    }

    if (!esPagada) {
      // Fecha y hora
      // El día almacenado son los primeros 10 chars del ISO (@db.Date en UTC).
      // Comparar contra eso evita el corrimiento de zona horaria; data.fecha es
      // un Date local del día correcto, así que format(...,"yyyy-MM-dd") da el
      // día real sin retroceder.
      const fechaOriginal = transaccion.fecha
        ? transaccion.fecha.slice(0, 10)
        : "";
      if (data.fecha) {
        const fechaNueva = format(data.fecha, "yyyy-MM-dd");
        if (fechaNueva !== fechaOriginal) payload.fecha = fechaNueva;
      }
      if (data.hora && data.hora !== horaStr) payload.hora = data.hora;

      // Recolector
      const recolectorNuevo = data.recolector_id
        ? Number(data.recolector_id)
        : null;
      if (recolectorNuevo && recolectorNuevo !== transaccion.recolector_id) {
        payload.recolector_id = recolectorNuevo;
      }

      // Destino polimórfico. Solo enviamos cambios si el destino efectivo
      // difiere del original. Cuando hay cambio, se envían los 3 campos
      // (el service hace un UPDATE atómico — ver helper validarUnicidadDestino
      // y comentario "UPDATE atómico" en transacciones.service.ts).
      const tipoOriginal = deriveTipoDestino(transaccion);
      const centroNuevoId = data.centro_operacional_id
        ? Number(data.centro_operacional_id)
        : null;
      const externoNuevoId = data.acopiador_externo_id
        ? Number(data.acopiador_externo_id)
        : null;

      const destinoCambio =
        data.tipo_destino !== tipoOriginal ||
        (data.tipo_destino === "centro_op" &&
          centroNuevoId !== transaccion.centro_operacional_id) ||
        (data.tipo_destino === "externo" &&
          externoNuevoId !== transaccion.acopiador_externo_id);

      if (destinoCambio) {
        if (data.tipo_destino === "centro_op") {
          payload.centro_operacional_id = centroNuevoId;
          payload.acopiador_externo_id = null;
          payload.destino_desconocido = false;
        } else if (data.tipo_destino === "externo") {
          payload.centro_operacional_id = null;
          payload.acopiador_externo_id = externoNuevoId;
          payload.destino_desconocido = false;
        } else if (data.tipo_destino === "desconocido") {
          payload.centro_operacional_id = null;
          payload.acopiador_externo_id = null;
          payload.destino_desconocido = true;
        } else {
          // "ninguno" — limpiar los 3.
          payload.centro_operacional_id = null;
          payload.acopiador_externo_id = null;
          payload.destino_desconocido = false;
        }
      }

      // Detalles. Cada uno puede traer su propia `sucursal_id` (opcional).
      payload.detalles = data.detalles.map((d) => ({
        // Catálogo (material_id) o "Otro" (nombre_personalizado), nunca ambos.
        ...(d.material_id === MATERIAL_OTRO
          ? { nombre_personalizado: d.nombre_personalizado?.trim() }
          : { material_id: Number(d.material_id) }),
        cantidad: parsearDecimal(d.cantidad) ?? 0,
        unidad_medida: d.unidad_medida,
        // null (vacío) → undefined: omite el precio (recolección sin valorar).
        // Un número válido (incluido 0) se envía tal cual.
        precio_unitario: parsearDecimal(d.precio_unitario) ?? undefined,
        ...(d.sucursal_id ? { sucursal_id: Number(d.sucursal_id) } : {}),
      }));
    }

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    editMutation.mutate(payload, {
      onSuccess: () => onClose(),
    });
  }

  return (
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
                      {recolectores.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.nombre_completo} ({r.cedula_identidad})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    Si el destino es un centro operacional, el recolector
                    debe pertenecer al mismo departamento.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Destino polimórfico */}
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
                        if (v !== "centro_op") {
                          form.setValue("centro_operacional_id", "");
                        }
                        if (v !== "externo") {
                          form.setValue("acopiador_externo_id", "");
                        }
                      }}
                      value={field.value}
                      disabled={editMutation.isPending}
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
                        <SelectItem value="desconocido">Desconocido</SelectItem>
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
                        disabled={editMutation.isPending}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar centro" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {centros.map((c) => (
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
                        disabled={editMutation.isPending}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar externo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {externos.map((e) => (
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
            </div>

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
                      <PopoverContent className="w-auto p-0" align="start">
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
                      nombre_personalizado: "",
                      cantidad: "",
                      unidad_medida: "KG" as UnidadMedida,
                      precio_unitario: "",
                      sucursal_id: "",
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
                  className="space-y-2 rounded-md border p-3"
                >
                <div className="grid grid-cols-12 items-start gap-2">
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
                            {materiales.map((m) => (
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
                            type="text"
                            inputMode="decimal"
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
                            type="text"
                            inputMode="decimal"
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
                            disabled={editMutation.isPending}
                            {...inputField}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Origen (sucursal) por línea — opcional. */}
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
                        disabled={editMutation.isPending}
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
                          {sucursales.map((s) => (
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
            onClick={onClose}
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
  );
}
