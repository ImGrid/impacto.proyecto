"use client";

import Link from "next/link";
import { ArrowRight, Clock, CreditCard, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Alertas operacionales: entregas sin pagar y entregas esperando
 * verificación del acopiador. Son lo "accionable" del dashboard.
 *
 * Si no hay alertas, mostramos un estado positivo ("todo al día")
 * en vez de ocultar el bloque — el admin ve rápido que no hay fuego.
 */
interface AlertasCardProps {
  pendientes_pago_count: number;
  pendientes_pago_monto: number;
  pendientes_verificacion_count: number;
}

function formatBs(n: number) {
  return new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function AlertasCard({
  pendientes_pago_count,
  pendientes_pago_monto,
  pendientes_verificacion_count,
}: AlertasCardProps) {
  const todoAlDia =
    pendientes_pago_count === 0 && pendientes_verificacion_count === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pendientes de atención</CardTitle>
        <CardDescription>
          Cosas que requieren acción en el flujo operativo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {todoAlDia ? (
          <div className="flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
            <span>No hay entregas pendientes. Todo al día.</span>
          </div>
        ) : (
          <>
            <AlertaFila
              icon={<CreditCard className="h-5 w-5" />}
              color="amber"
              visible={pendientes_pago_count > 0}
              label={`${pendientes_pago_count} ${
                pendientes_pago_count === 1 ? "entrega" : "entregas"
              } sin pagar`}
              detail={`${formatBs(pendientes_pago_monto)} Bs pendientes`}
              href="/pagos"
              linkLabel="Ir a pagos"
            />
            <AlertaFila
              icon={<Clock className="h-5 w-5" />}
              color="sky"
              visible={pendientes_verificacion_count > 0}
              label={`${pendientes_verificacion_count} ${
                pendientes_verificacion_count === 1 ? "entrega" : "entregas"
              } esperando verificación`}
              detail="El acopiador aún no las ha completado"
              href="/transacciones?estado=RECOLECTADO"
              linkLabel="Ver"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AlertaFila({
  icon,
  color,
  visible,
  label,
  detail,
  href,
  linkLabel,
}: {
  icon: React.ReactNode;
  color: "amber" | "sky";
  visible: boolean;
  label: string;
  detail: string;
  href: string;
  linkLabel: string;
}) {
  if (!visible) return null;
  const styles = {
    amber:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300",
    sky: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300",
  } as const;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border p-3 text-sm",
        styles[color],
      )}
    >
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-xs opacity-80">{detail}</p>
        </div>
      </div>
      <Link
        href={href}
        className="flex items-center gap-1 text-xs font-medium hover:underline"
      >
        {linkLabel}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
