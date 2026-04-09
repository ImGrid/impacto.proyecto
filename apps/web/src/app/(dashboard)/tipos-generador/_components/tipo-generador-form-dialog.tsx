"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Loader2 } from "lucide-react";
import {
  useCreateTipoGenerador,
  useUpdateTipoGenerador,
} from "@/hooks/use-tipos-generador";
import type { TipoGenerador } from "@/types/api";
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
import { Button } from "@/components/ui/button";

const tipoGeneradorSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  descripcion: z.string().optional(),
});

type TipoGeneradorFormValues = z.infer<typeof tipoGeneradorSchema>;

interface TipoGeneradorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipoGenerador?: TipoGenerador;
}

export function TipoGeneradorFormDialog({
  open,
  onOpenChange,
  tipoGenerador,
}: TipoGeneradorFormDialogProps) {
  const isEditing = !!tipoGenerador;
  const createMutation = useCreateTipoGenerador();
  const updateMutation = useUpdateTipoGenerador();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<TipoGeneradorFormValues>({
    resolver: zodResolver(tipoGeneradorSchema),
    defaultValues: {
      nombre: "",
      descripcion: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        nombre: tipoGenerador?.nombre ?? "",
        descripcion: tipoGenerador?.descripcion ?? "",
      });
    }
  }, [open, tipoGenerador, form]);

  function onSubmit(data: TipoGeneradorFormValues) {
    const body = {
      nombre: data.nombre,
      ...(data.descripcion ? { descripcion: data.descripcion } : {}),
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: tipoGenerador.id, data: body },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createMutation.mutate(body, {
        onSuccess: () => onOpenChange(false),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? "Editar tipo de generador"
              : "Crear tipo de generador"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifique los datos del tipo de generador."
              : "Complete los datos para crear un nuevo tipo de generador."}
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
                      placeholder="Ej: Hospital, Restaurante..."
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
                  "Crear tipo"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
