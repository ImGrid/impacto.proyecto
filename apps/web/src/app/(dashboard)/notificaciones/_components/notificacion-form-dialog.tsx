"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Loader2 } from "lucide-react";
import { useCreateNotificacion } from "@/hooks/use-notificaciones";
import { useZonas } from "@/hooks/use-zonas";
import { useRecolectores } from "@/hooks/use-recolectores";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

const MODOS = [
  { value: "general", label: "General (todas las recolectoras)" },
  { value: "zona", label: "Por zona" },
  { value: "individual", label: "Individual (seleccionar recolectoras)" },
];

const notificacionSchema = z.object({
  titulo: z
    .string()
    .min(1, "El título es obligatorio")
    .max(200, "Máximo 200 caracteres"),
  mensaje: z.string().optional(),
});

type NotificacionFormValues = z.infer<typeof notificacionSchema>;

interface NotificacionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificacionFormDialog({
  open,
  onOpenChange,
}: NotificacionFormDialogProps) {
  const createMutation = useCreateNotificacion();
  const isPending = createMutation.isPending;

  const [modo, setModo] = useState<"general" | "zona" | "individual">(
    "general",
  );
  const [zonaId, setZonaId] = useState<string>("");
  const [selectedReceptors, setSelectedReceptors] = useState<number[]>([]);

  const { data: zonasData } = useZonas({ limit: 100, activo: true });
  const { data: recolectoresData } = useRecolectores({
    limit: 100,
    activo: true,
  });

  const form = useForm<NotificacionFormValues>({
    resolver: zodResolver(notificacionSchema),
    defaultValues: { titulo: "", mensaje: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ titulo: "", mensaje: "" });
      setModo("general");
      setZonaId("");
      setSelectedReceptors([]);
    }
  }, [open, form]);

  function toggleReceptor(usuarioId: number) {
    setSelectedReceptors((prev) =>
      prev.includes(usuarioId)
        ? prev.filter((id) => id !== usuarioId)
        : [...prev, usuarioId],
    );
  }

  function onSubmit(data: NotificacionFormValues) {
    const payload: {
      titulo: string;
      mensaje?: string;
      zona_id?: number;
      receptor_ids?: number[];
    } = {
      titulo: data.titulo,
      mensaje: data.mensaje || undefined,
    };

    if (modo === "zona" && zonaId) {
      payload.zona_id = Number(zonaId);
    } else if (modo === "individual" && selectedReceptors.length > 0) {
      payload.receptor_ids = selectedReceptors;
    }

    createMutation.mutate(payload, {
      onSuccess: () => onOpenChange(false),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar notificación</DialogTitle>
          <DialogDescription>
            Envíe un mensaje a todas las recolectoras, a una zona específica o a
            recolectoras individuales.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Destinatario</label>
              <Select
                value={modo}
                onValueChange={(v) => {
                  setModo(v as typeof modo);
                  setZonaId("");
                  setSelectedReceptors([]);
                }}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODOS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {modo === "zona" && (
              <div>
                <label className="text-sm font-medium">Zona</label>
                <Select value={zonaId} onValueChange={setZonaId}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Seleccionar zona" />
                  </SelectTrigger>
                  <SelectContent>
                    {zonasData?.data.map((z) => (
                      <SelectItem key={z.id} value={String(z.id)}>
                        {z.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {modo === "individual" && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Seleccionar recolectoras ({selectedReceptors.length}{" "}
                  seleccionadas)
                </label>
                <div className="max-h-[200px] overflow-y-auto rounded-md border p-3 space-y-2">
                  {recolectoresData?.data.map((r) => (
                    <label
                      key={r.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedReceptors.includes(r.usuario_id)}
                        onCheckedChange={() => toggleReceptor(r.usuario_id)}
                      />
                      <span className="text-sm">
                        {r.nombre_completo}
                        <span className="text-muted-foreground ml-1">
                          ({r.zona.nombre})
                        </span>
                      </span>
                    </label>
                  ))}
                  {(!recolectoresData?.data ||
                    recolectoresData.data.length === 0) && (
                    <p className="text-sm text-muted-foreground">
                      No hay recolectoras registradas.
                    </p>
                  )}
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Necesitamos más plástico"
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
              name="mensaje"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensaje</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalle del mensaje (opcional)"
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
              <Button
                type="submit"
                disabled={
                  isPending ||
                  (modo === "zona" && !zonaId) ||
                  (modo === "individual" && selectedReceptors.length === 0)
                }
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar notificación"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
