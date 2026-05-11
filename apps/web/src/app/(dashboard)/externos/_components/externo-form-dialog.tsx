"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Loader2 } from "lucide-react";
import { useCreateExterno, useUpdateExterno } from "@/hooks/use-externos";
import type { AcopiadorCompradorExterno } from "@/types/api";
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

const formSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(150, "Máximo 150 caracteres"),
  asociacion: z
    .string()
    .max(150, "Máximo 150 caracteres")
    .optional(),
  telefono: z
    .string()
    .max(20, "Máximo 20 caracteres")
    .optional(),
  observacion: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ExternoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  externo?: AcopiadorCompradorExterno;
}

export function ExternoFormDialog({
  open,
  onOpenChange,
  externo,
}: ExternoFormDialogProps) {
  const isEditing = !!externo;
  const createMutation = useCreateExterno();
  const updateMutation = useUpdateExterno();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      asociacion: "",
      telefono: "",
      observacion: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (isEditing) {
        form.reset({
          nombre: externo.nombre,
          asociacion: externo.asociacion ?? "",
          telefono: externo.telefono ?? "",
          observacion: externo.observacion ?? "",
        });
      } else {
        form.reset({
          nombre: "",
          asociacion: "",
          telefono: "",
          observacion: "",
        });
      }
    }
  }, [open, externo, isEditing, form]);

  function onSubmit(data: FormValues) {
    // Solo enviar campos no vacíos; los strings vacíos se traducen a undefined
    // para que el backend no los sobrescriba con valores en blanco.
    const trimmedAsociacion = data.asociacion?.trim();
    const trimmedTelefono = data.telefono?.trim();
    const trimmedObservacion = data.observacion?.trim();

    const payload = {
      nombre: data.nombre.trim(),
      ...(trimmedAsociacion ? { asociacion: trimmedAsociacion } : {}),
      ...(trimmedTelefono ? { telefono: trimmedTelefono } : {}),
      ...(trimmedObservacion ? { observacion: trimmedObservacion } : {}),
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: externo.id, data: payload },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar acopiador externo" : "Crear acopiador externo"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifique los datos del acopiador externo."
              : "Complete los datos para registrar un nuevo acopiador o comprador externo."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nombre del acopiador o comprador"
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
              name="asociacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Asociación{" "}
                    <span className="text-muted-foreground text-xs font-normal">
                      (opcional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nombre de la asociación o empresa"
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
                  <FormLabel>
                    Teléfono{" "}
                    <span className="text-muted-foreground text-xs font-normal">
                      (opcional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Número de contacto"
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
              name="observacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Observación{" "}
                    <span className="text-muted-foreground text-xs font-normal">
                      (opcional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales"
                      rows={3}
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
                  "Crear acopiador externo"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
