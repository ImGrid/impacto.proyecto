"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Loader2 } from "lucide-react";
import { useCreateCiudad, useUpdateCiudad } from "@/hooks/use-ciudades";
import { useDepartamentos } from "@/hooks/use-departamentos";
import type { Ciudad, Departamento } from "@/types/api";
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
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  departamento_id: z.string().min(1, "Seleccione un departamento"),
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(120, "Máximo 120 caracteres"),
});

type FormValues = z.infer<typeof formSchema>;

interface CiudadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ciudad?: Ciudad;
}

/**
 * Shell del diálogo. El formulario interno sólo se monta cuando todos los
 * catálogos están listos para evitar el bug en Radix Select donde un value
 * controlado no se aplica si los <SelectItem> aún no se montaron al momento
 * del render inicial (ver `transaccion-edit-dialog.tsx` para el patrón).
 */
export function CiudadFormDialog({
  open,
  onOpenChange,
  ciudad,
}: CiudadFormDialogProps) {
  const { data: departamentosData } = useDepartamentos({
    limit: 100,
    activo: true,
  });

  const isEditing = !!ciudad;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar ciudad" : "Crear ciudad"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifique los datos de la ciudad."
              : "Complete los datos para registrar una nueva ciudad."}
          </DialogDescription>
        </DialogHeader>

        {!open ? null : !departamentosData ? (
          <div className="py-8 text-center text-muted-foreground">
            Cargando...
          </div>
        ) : (
          <CiudadForm
            // El key reinicia el form cuando se cambia de ciudad sin cerrar.
            key={ciudad?.id ?? "new"}
            ciudad={ciudad}
            departamentos={departamentosData.data}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface CiudadFormProps {
  ciudad?: Ciudad;
  departamentos: Departamento[];
  onClose: () => void;
}

function CiudadForm({ ciudad, departamentos, onClose }: CiudadFormProps) {
  const isEditing = !!ciudad;
  const createMutation = useCreateCiudad();
  const updateMutation = useUpdateCiudad();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      departamento_id: ciudad ? String(ciudad.departamento_id) : "",
      nombre: ciudad?.nombre ?? "",
    },
  });

  function onSubmit(data: FormValues) {
    const payload = {
      departamento_id: Number(data.departamento_id),
      nombre: data.nombre.trim(),
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: ciudad.id, data: payload },
        { onSuccess: () => onClose() },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => onClose(),
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="departamento_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Departamento</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isPending}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar departamento" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {departamentos.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.nombre}
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
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Cercado" disabled={isPending} {...field} />
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
              "Crear ciudad"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
