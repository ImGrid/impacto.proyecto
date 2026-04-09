"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Loader2 } from "lucide-react";
import {
  useCreateAsociacion,
  useUpdateAsociacion,
} from "@/hooks/use-asociaciones";
import type { Asociacion } from "@/types/api";
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
import { Button } from "@/components/ui/button";

const asociacionSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(150, "Máximo 150 caracteres"),
  representante: z.string().max(150, "Máximo 150 caracteres").optional(),
  telefono: z.string().max(20, "Máximo 20 caracteres").optional(),
  direccion: z.string().max(255, "Máximo 255 caracteres").optional(),
});

type AsociacionFormValues = z.infer<typeof asociacionSchema>;

interface AsociacionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asociacion?: Asociacion;
}

export function AsociacionFormDialog({
  open,
  onOpenChange,
  asociacion,
}: AsociacionFormDialogProps) {
  const isEditing = !!asociacion;
  const createMutation = useCreateAsociacion();
  const updateMutation = useUpdateAsociacion();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<AsociacionFormValues>({
    resolver: zodResolver(asociacionSchema),
    defaultValues: {
      nombre: "",
      representante: "",
      telefono: "",
      direccion: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        nombre: asociacion?.nombre ?? "",
        representante: asociacion?.representante ?? "",
        telefono: asociacion?.telefono ?? "",
        direccion: asociacion?.direccion ?? "",
      });
    }
  }, [open, asociacion, form]);

  function onSubmit(data: AsociacionFormValues) {
    const body = {
      nombre: data.nombre,
      ...(data.representante ? { representante: data.representante } : {}),
      ...(data.telefono ? { telefono: data.telefono } : {}),
      ...(data.direccion ? { direccion: data.direccion } : {}),
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: asociacion.id, data: body },
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
            {isEditing ? "Editar asociación" : "Crear asociación"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifique los datos de la asociación."
              : "Complete los datos para crear una nueva asociación."}
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
                      placeholder="Nombre de la asociación"
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
              name="representante"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Representante</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nombre del representante (opcional)"
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
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Número de contacto (opcional)"
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
              name="direccion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Dirección de la asociación (opcional)"
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
                  "Crear asociación"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
