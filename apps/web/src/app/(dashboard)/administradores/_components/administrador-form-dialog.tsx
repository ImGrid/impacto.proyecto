"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Loader2 } from "lucide-react";
import {
  useCreateAdministrador,
  useUpdateAdministrador,
} from "@/hooks/use-administradores";
import type { Administrador } from "@/types/api";
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

// Schema base con email y password opcionales
const baseSchema = z.object({
  email: z.string().optional(),
  password: z.string().optional(),
  nombre_completo: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(150, "Máximo 150 caracteres"),
  telefono: z
    .string()
    .min(1, "El teléfono es obligatorio")
    .max(20, "Máximo 20 caracteres"),
});

// Para crear: email y password son obligatorios
const createSchema = baseSchema.refine(
  (data) => !!data.email && data.email.includes("@"),
  { message: "Ingrese un email válido", path: ["email"] },
).refine(
  (data) => !!data.password && data.password.length >= 8,
  { message: "Mínimo 8 caracteres", path: ["password"] },
);

// Para editar: solo nombre y teléfono (email/password se ignoran)
const updateSchema = baseSchema;

type FormValues = z.infer<typeof baseSchema>;

interface AdministradorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  administrador?: Administrador;
}

export function AdministradorFormDialog({
  open,
  onOpenChange,
  administrador,
}: AdministradorFormDialogProps) {
  const isEditing = !!administrador;
  const createMutation = useCreateAdministrador();
  const updateMutation = useUpdateAdministrador();
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Se usa el schema de crear o editar según el modo
  const form = useForm<FormValues>({
    resolver: zodResolver(isEditing ? updateSchema : createSchema),
    defaultValues: {
      email: "",
      password: "",
      nombre_completo: "",
      telefono: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (isEditing) {
        form.reset({
          email: "",
          password: "",
          nombre_completo: administrador.nombre_completo,
          telefono: administrador.telefono,
        });
      } else {
        form.reset({
          email: "",
          password: "",
          nombre_completo: "",
          telefono: "",
        });
      }
    }
  }, [open, administrador, isEditing, form]);

  function onSubmit(data: FormValues) {
    if (isEditing) {
      updateMutation.mutate(
        {
          id: administrador.id,
          data: {
            nombre_completo: data.nombre_completo,
            telefono: data.telefono,
          },
        },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createMutation.mutate(
        {
          email: data.email!,
          password: data.password!,
          nombre_completo: data.nombre_completo,
          telefono: data.telefono,
        },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar administrador" : "Crear administrador"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifique los datos del administrador."
              : "Complete los datos para crear un nuevo administrador."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email y password solo al crear */}
            {!isEditing && (
              <>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="correo@ejemplo.com"
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Mínimo 8 caracteres"
                          disabled={isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="nombre_completo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nombre del administrador"
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
                      placeholder="Número de contacto"
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
                  "Crear administrador"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
