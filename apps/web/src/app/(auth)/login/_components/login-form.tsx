"use client";

import { useActionState, useEffect, startTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { login, type LoginState } from "@/app/actions/auth";
import type { Departamento } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const loginSchema = z.object({
  identificador: z.string().min(1, "Ingrese su email, CI o teléfono"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  departamento_id: z.string().min(1, "Seleccione un departamento"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  departamentos: Departamento[];
}

export function LoginForm({ departamentos }: LoginFormProps) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    login,
    null,
  );

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identificador: "",
      password: "",
      departamento_id: "",
    },
  });

  // Mostrar error del servidor como toast
  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  function onSubmit(data: LoginFormValues) {
    const formData = new FormData();
    formData.append("identificador", data.identificador);
    formData.append("password", data.password);
    formData.append("departamento_id", data.departamento_id);
    formData.append("callbackUrl", callbackUrl);
    startTransition(() => {
      formAction(formData);
    });
  }

  // Si no hay departamentos disponibles, mostrar aviso claro y deshabilitar
  // el formulario: sin un departamento el admin no puede iniciar sesión.
  if (departamentos.length === 0) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <p className="font-medium text-destructive">
          No se pudieron cargar los departamentos.
        </p>
        <p className="mt-1 text-muted-foreground">
          Verifique su conexión y vuelva a cargar la página. Si el problema
          continúa, contacte al soporte técnico.
        </p>
      </div>
    );
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
                    <SelectValue placeholder="Seleccione su departamento" />
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
          name="identificador"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email, CI o Teléfono</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="admin@tripleimpacto.bo"
                  autoComplete="username"
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
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Ingresando...
            </>
          ) : (
            "Ingresar"
          )}
        </Button>
      </form>
    </Form>
  );
}
