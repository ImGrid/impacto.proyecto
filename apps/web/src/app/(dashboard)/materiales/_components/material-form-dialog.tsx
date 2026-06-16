"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Loader2, Sparkles } from "lucide-react";
import {
  useCreateMaterial,
  useUpdateMaterial,
  sugerirFactorMaterial,
  type SugerenciaFactor,
} from "@/hooks/use-materiales";
import type { Material, UnidadMedida } from "@/types/api";
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
import { Button } from "@/components/ui/button";

const UNIDADES: { value: UnidadMedida; label: string }[] = [
  { value: "KG", label: "Kilogramos (Kg)" },
  { value: "UNIDAD", label: "Unidad" },
  { value: "BOLSA", label: "Bolsa" },
  { value: "TONELADA", label: "Tonelada" },
];

const materialSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  descripcion: z.string().optional(),
  unidad_medida_default: z.enum(["KG", "UNIDAD", "BOLSA", "TONELADA"]).optional(),
  factor_co2: z.string().optional(),
  peso_unitario_kg: z.string().optional(),
});

type MaterialFormValues = z.infer<typeof materialSchema>;

interface MaterialFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: Material;
}

export function MaterialFormDialog({
  open,
  onOpenChange,
  material,
}: MaterialFormDialogProps) {
  const isEditing = !!material;
  const createMutation = useCreateMaterial();
  const updateMutation = useUpdateMaterial();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      nombre: "",
      descripcion: "",
      unidad_medida_default: undefined,
      factor_co2: "",
      peso_unitario_kg: "",
    },
  });

  // El campo de peso solo tiene sentido cuando el material se cuenta por
  // unidad (botellas, latas…). Para kg/tonelada no aplica, así que se oculta.
  const unidad = form.watch("unidad_medida_default");
  const nombreActual = form.watch("nombre")?.trim();

  const [sugerencia, setSugerencia] = useState<SugerenciaFactor | null>(null);
  const [sugiriendo, setSugiriendo] = useState(false);

  useEffect(() => {
    if (open) {
      setSugerencia(null);
      form.reset({
        nombre: material?.nombre ?? "",
        descripcion: material?.descripcion ?? "",
        unidad_medida_default:
          (material?.unidad_medida_default as MaterialFormValues["unidad_medida_default"]) ??
          undefined,
        factor_co2:
          material?.factor_co2 != null ? String(material.factor_co2) : "",
        peso_unitario_kg:
          material?.peso_unitario_kg != null
            ? String(material.peso_unitario_kg)
            : "",
      });
    }
  }, [open, material, form]);

  // Pide una sugerencia de factor según el nombre y, si la hay, pre-llena el
  // factor (y la unidad/peso si el material se cuenta por unidad). NO guarda
  // nada: el admin revisa y confirma con el botón de guardar.
  async function handleSugerir() {
    const nombre = (form.getValues("nombre") ?? "").trim();
    if (!nombre) return;
    setSugiriendo(true);
    try {
      const res = await sugerirFactorMaterial(nombre);
      setSugerencia(res);
      if (res.encontrado) {
        form.setValue("factor_co2", String(res.factor_co2));
        if (res.peso_unitario_kg != null) {
          form.setValue("unidad_medida_default", "UNIDAD");
          form.setValue("peso_unitario_kg", String(res.peso_unitario_kg));
        }
      }
    } catch {
      setSugerencia(null);
    } finally {
      setSugiriendo(false);
    }
  }

  function onSubmit(data: MaterialFormValues) {
    const body: Record<string, unknown> = { nombre: data.nombre };
    if (data.descripcion) body.descripcion = data.descripcion;
    if (data.unidad_medida_default)
      body.unidad_medida_default = data.unidad_medida_default;
    if (data.factor_co2) body.factor_co2 = Number(data.factor_co2);
    // El peso solo se envía para materiales por unidad (donde se ve el campo).
    if (data.unidad_medida_default === "UNIDAD" && data.peso_unitario_kg)
      body.peso_unitario_kg = Number(data.peso_unitario_kg);

    if (isEditing) {
      updateMutation.mutate(
        { id: material.id, data: body },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createMutation.mutate(
        body as Parameters<typeof createMutation.mutate>[0],
        { onSuccess: () => onOpenChange(false) },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar material" : "Crear material"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifique los datos del material."
              : "Complete los datos para crear un nuevo material."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Plástico PET, Cartón..."
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
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción opcional"
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
              name="unidad_medida_default"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidad de medida</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar unidad (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {UNIDADES.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {unidad === "UNIDAD" && (
              <FormField
                control={form.control}
                name="peso_unitario_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso por unidad (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        placeholder="0.30"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Cuánto pesa una unidad. Sirve para calcular los kilos y el
                      CO₂ cuando el material se cuenta por unidad. Ejemplo: una
                      botella ≈ 0,30 kg.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="factor_co2"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Factor CO2</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={handleSugerir}
                      disabled={isPending || sugiriendo || !nombreActual}
                      title={
                        nombreActual
                          ? "Sugerir el factor según el nombre"
                          : "Escriba primero el nombre del material"
                      }
                    >
                      {sugiriendo ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      Sugerir
                    </Button>
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      placeholder="0.0000"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  {sugerencia &&
                    (sugerencia.encontrado ? (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                        <p className="font-medium">
                          Sugerencia: «{sugerencia.material_canonico}» — factor{" "}
                          {Number(sugerencia.factor_co2).toLocaleString("es-BO", {
                            maximumFractionDigits: 4,
                          })}
                          {sugerencia.peso_unitario_kg != null &&
                            ` · peso ${Number(
                              sugerencia.peso_unitario_kg,
                            ).toLocaleString("es-BO", {
                              maximumFractionDigits: 4,
                            })} kg/unidad`}
                        </p>
                        <p className="opacity-90">
                          Fuente: {sugerencia.fuente} ({sugerencia.anio}) ·
                          confianza {sugerencia.confianza}
                          {sugerencia.metodo === "aproximado" &&
                            " · coincidencia aproximada"}
                          . Es una sugerencia: puede editarla.
                        </p>
                        {sugerencia.nota && (
                          <p className="mt-1 opacity-80">{sugerencia.nota}</p>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                        No encontramos una sugerencia para ese nombre. Ingrese el
                        factor a mano si lo conoce.
                      </div>
                    ))}
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
                  "Crear material"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
