"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Loader2 } from "lucide-react";
import { useCreateMaterial, useUpdateMaterial } from "@/hooks/use-materiales";
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
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        nombre: material?.nombre ?? "",
        descripcion: material?.descripcion ?? "",
        unidad_medida_default:
          (material?.unidad_medida_default as MaterialFormValues["unidad_medida_default"]) ??
          undefined,
        factor_co2:
          material?.factor_co2 != null ? String(material.factor_co2) : "",
      });
    }
  }, [open, material, form]);

  function onSubmit(data: MaterialFormValues) {
    const body: Record<string, unknown> = { nombre: data.nombre };
    if (data.descripcion) body.descripcion = data.descripcion;
    if (data.unidad_medida_default)
      body.unidad_medida_default = data.unidad_medida_default;
    if (data.factor_co2) body.factor_co2 = Number(data.factor_co2);

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

            <FormField
              control={form.control}
              name="factor_co2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Factor CO2</FormLabel>
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
