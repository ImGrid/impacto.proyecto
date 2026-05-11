"use client";

import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Loader2, MapPin } from "lucide-react";
import { useCreateGenerador, useUpdateGenerador } from "@/hooks/use-generadores";
import { useTiposGenerador } from "@/hooks/use-tipos-generador";
import type { Generador, TipoGenerador } from "@/types/api";
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
import { Skeleton } from "@/components/ui/skeleton";

const MapPicker = dynamic(() => import("@/components/shared/map-picker"), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full rounded-md" />,
});

// Schema base: email y password opcionales (solo se validan al crear)
const baseSchema = z.object({
  email: z.string().optional(),
  password: z.string().optional(),
  razon_social: z
    .string()
    .min(1, "La razon social es obligatoria")
    .max(200, "Maximo 200 caracteres"),
  tipo_generador_id: z.string().min(1, "Seleccione un tipo de generador"),
  contacto_nombre: z
    .string()
    .min(1, "El nombre de contacto es obligatorio")
    .max(150, "Maximo 150 caracteres"),
  contacto_telefono: z
    .string()
    .min(1, "El telefono de contacto es obligatorio")
    .max(20, "Maximo 20 caracteres"),
  contacto_email: z.string().optional(),
  latitud: z.number().min(-90).max(90).nullable(),
  longitud: z.number().min(-180).max(180).nullable(),
});

const createSchema = baseSchema
  .refine(
    (data) => !data.email || data.email.includes("@"),
    { message: "Ingrese un email valido", path: ["email"] },
  )
  .refine((data) => !!data.password && data.password.length >= 8, {
    message: "Minimo 8 caracteres",
    path: ["password"],
  });

const updateSchema = baseSchema;

type FormValues = z.infer<typeof baseSchema>;

interface GeneradorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generador?: Generador;
}

/**
 * Shell del diálogo. El form sólo se monta cuando los catálogos están listos
 * para evitar el bug en Radix Select donde un value controlado no se aplica
 * si los <SelectItem> aún no se montaron al primer render.
 */
export function GeneradorFormDialog({
  open,
  onOpenChange,
  generador,
}: GeneradorFormDialogProps) {
  const { data: tiposData } = useTiposGenerador({ limit: 100 });
  const isEditing = !!generador;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar generador" : "Crear generador"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifique los datos de la empresa generadora."
              : "Complete los datos para registrar una nueva empresa generadora."}
          </DialogDescription>
        </DialogHeader>

        {!open ? null : !tiposData ? (
          <div className="py-8 text-center text-muted-foreground">
            Cargando...
          </div>
        ) : (
          <GeneradorForm
            key={generador?.id ?? "new"}
            generador={generador}
            tiposGenerador={tiposData.data}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface GeneradorFormProps {
  generador?: Generador;
  tiposGenerador: TipoGenerador[];
  onClose: () => void;
}

function GeneradorForm({
  generador,
  tiposGenerador,
  onClose,
}: GeneradorFormProps) {
  const isEditing = !!generador;
  const createMutation = useCreateGenerador();
  const updateMutation = useUpdateGenerador();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(isEditing ? updateSchema : createSchema),
    defaultValues: {
      email: "",
      password: "",
      razon_social: generador?.razon_social ?? "",
      tipo_generador_id: generador ? String(generador.tipo_generador_id) : "",
      contacto_nombre: generador?.contacto_nombre ?? "",
      contacto_telefono: generador?.contacto_telefono ?? "",
      contacto_email: generador?.contacto_email ?? "",
      latitud:
        generador && generador.latitud != null
          ? Number(generador.latitud)
          : null,
      longitud:
        generador && generador.longitud != null
          ? Number(generador.longitud)
          : null,
    },
  });

  const latitud = form.watch("latitud");
  const longitud = form.watch("longitud");

  const mapPosition =
    latitud != null && longitud != null
      ? { lat: latitud, lng: longitud }
      : null;

  function handlePositionChange(lat: number, lng: number) {
    form.setValue("latitud", parseFloat(lat.toFixed(8)), {
      shouldValidate: true,
    });
    form.setValue("longitud", parseFloat(lng.toFixed(8)), {
      shouldValidate: true,
    });
  }

  function onSubmit(data: FormValues) {
    const shared = {
      razon_social: data.razon_social,
      tipo_generador_id: Number(data.tipo_generador_id),
      contacto_nombre: data.contacto_nombre,
      contacto_telefono: data.contacto_telefono,
      ...(data.contacto_email ? { contacto_email: data.contacto_email } : {}),
      ...(data.latitud != null ? { latitud: data.latitud } : {}),
      ...(data.longitud != null ? { longitud: data.longitud } : {}),
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: generador.id, data: shared },
        { onSuccess: () => onClose() },
      );
    } else {
      createMutation.mutate(
        { email: data.email!, password: data.password!, ...shared },
        { onSuccess: () => onClose() },
      );
    }
  }

  return (
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
                      placeholder="correo@empresa.com"
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
          name="razon_social"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Razón social</FormLabel>
              <FormControl>
                <Input
                  placeholder="Nombre de la empresa"
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
          name="tipo_generador_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de generador</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isPending}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tiposGenerador.map((tipo) => (
                    <SelectItem key={tipo.id} value={String(tipo.id)}>
                      {tipo.nombre}
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
          name="contacto_nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de contacto</FormLabel>
              <FormControl>
                <Input
                  placeholder="Persona de contacto"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contacto_telefono"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono de contacto</FormLabel>
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
            name="contacto_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email de contacto</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Opcional"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Mapa para seleccionar ubicación */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Ubicación en el mapa</span>
          </div>
          <p className="text-muted-foreground text-xs">
            Haga click en el mapa para marcar la ubicación de la empresa.
            Puede arrastrar el marcador para ajustar la posición.
          </p>
          <MapPicker
            position={mapPosition}
            radiusKm={0}
            onPositionChange={handlePositionChange}
          />
          {mapPosition && (
            <p className="text-muted-foreground text-xs">
              Lat: {mapPosition.lat.toFixed(6)}, Lng:{" "}
              {mapPosition.lng.toFixed(6)}
            </p>
          )}
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
              "Crear generador"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
