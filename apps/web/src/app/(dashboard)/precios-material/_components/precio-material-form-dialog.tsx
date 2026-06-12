"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import {
  useCreatePrecioMaterial,
  useUpdatePrecioMaterial,
} from "@/hooks/use-precios-material";
import { useMateriales } from "@/hooks/use-materiales";
import type { Material, PrecioMaterial } from "@/types/api";
import { cn, fechaSoloDesdeISO } from "@/lib/utils";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

const precioSchema = z
  .object({
    material_id: z.string().min(1, "Seleccione un material"),
    precio_minimo: z
      .string()
      .min(1, "El precio mínimo es obligatorio")
      .refine(
        (v) => !isNaN(Number(v)) && Number(v) > 0,
        "Debe ser mayor a 0",
      ),
    precio_maximo: z
      .string()
      .min(1, "El precio máximo es obligatorio")
      .refine(
        (v) => !isNaN(Number(v)) && Number(v) > 0,
        "Debe ser mayor a 0",
      ),
    fecha_inicio: z.date({ message: "La fecha de inicio es obligatoria" }),
    fecha_fin: z.date().optional(),
  })
  .refine(
    (data) => Number(data.precio_maximo) >= Number(data.precio_minimo),
    {
      message: "El precio máximo debe ser mayor o igual al mínimo",
      path: ["precio_maximo"],
    },
  )
  .refine(
    (data) => !data.fecha_fin || data.fecha_fin >= data.fecha_inicio,
    {
      message: "La fecha fin debe ser posterior a la fecha inicio",
      path: ["fecha_fin"],
    },
  );

type PrecioFormValues = z.infer<typeof precioSchema>;

interface PrecioMaterialFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  precio?: PrecioMaterial;
}

/**
 * Shell del diálogo. El form sólo se monta cuando los catálogos están listos
 * para evitar el bug en Radix Select donde un value controlado no se aplica
 * si los <SelectItem> aún no se montaron al primer render.
 */
export function PrecioMaterialFormDialog({
  open,
  onOpenChange,
  precio,
}: PrecioMaterialFormDialogProps) {
  const { data: materialesData } = useMateriales({
    limit: 100,
    activo: true,
  });
  const isEditing = !!precio;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar precio" : "Nuevo precio"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifique los datos del precio vigente."
              : "Defina el precio referencial para un material. Si ya existe un precio vigente, se cerrará automáticamente."}
          </DialogDescription>
        </DialogHeader>

        {!open ? null : !materialesData ? (
          <div className="py-8 text-center text-muted-foreground">
            Cargando...
          </div>
        ) : (
          <PrecioForm
            key={precio?.id ?? "new"}
            precio={precio}
            materiales={materialesData.data}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface PrecioFormProps {
  precio?: PrecioMaterial;
  materiales: Material[];
  onClose: () => void;
}

function PrecioForm({ precio, materiales, onClose }: PrecioFormProps) {
  const isEditing = !!precio;
  const createMutation = useCreatePrecioMaterial();
  const updateMutation = useUpdatePrecioMaterial();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<PrecioFormValues>({
    resolver: zodResolver(precioSchema),
    defaultValues: {
      material_id: precio ? String(precio.material_id) : "",
      precio_minimo: precio ? String(Number(precio.precio_minimo)) : "",
      precio_maximo: precio ? String(Number(precio.precio_maximo)) : "",
      // @db.Date: a Date local del mismo día para que el calendario y el
      // guardado (format yyyy-MM-dd) no corran un día.
      fecha_inicio: precio
        ? fechaSoloDesdeISO(precio.fecha_inicio) ?? new Date()
        : new Date(),
      fecha_fin:
        precio && precio.fecha_fin
          ? fechaSoloDesdeISO(precio.fecha_fin)
          : undefined,
    },
  });

  function onSubmit(data: PrecioFormValues) {
    const fechaInicio = format(data.fecha_inicio, "yyyy-MM-dd");
    const fechaFin = data.fecha_fin
      ? format(data.fecha_fin, "yyyy-MM-dd")
      : undefined;

    if (isEditing) {
      updateMutation.mutate(
        {
          id: precio.id,
          data: {
            precio_minimo: Number(data.precio_minimo),
            precio_maximo: Number(data.precio_maximo),
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin ?? null,
          },
        },
        { onSuccess: () => onClose() },
      );
    } else {
      createMutation.mutate(
        {
          material_id: Number(data.material_id),
          precio_minimo: Number(data.precio_minimo),
          precio_maximo: Number(data.precio_maximo),
          fecha_inicio: fechaInicio,
          ...(fechaFin ? { fecha_fin: fechaFin } : {}),
        },
        { onSuccess: () => onClose() },
      );
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="material_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Material</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isPending || isEditing}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar material" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {materiales.map((m) => (
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="precio_minimo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio mínimo (Bs)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
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
            name="precio_maximo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio máximo (Bs)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
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
            name="fecha_inicio"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha inicio</FormLabel>
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
            name="fecha_fin"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha fin (opcional)</FormLabel>
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
                          : "Indefinido"}
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
              "Crear precio"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
