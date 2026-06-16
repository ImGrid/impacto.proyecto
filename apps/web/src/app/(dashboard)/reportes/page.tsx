import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { reportes, reporteCategorias } from "@/config/reportes";

/**
 * Pestaña "Reportes" — grilla de tarjetas para ELEGIR un reporte (paso 1 del
 * flujo elegir → detalle). Tarjetas consistentes agrupadas por categoría, con
 * ícono + título + descripción (patrón docs/28: consistencia + information scent).
 */
export default function ReportesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Elige un reporte. Los datos se muestran para el departamento activo y
          el período que selecciones; podrás descargarlos en Excel o PDF.
        </p>
      </div>

      {reporteCategorias.map((categoria) => {
        const items = reportes.filter((r) => r.categoria === categoria);
        if (items.length === 0) return null;
        return (
          <section key={categoria} className="space-y-3">
            <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-wide">
              {categoria}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((r) => (
                <Link key={r.id} href={r.href} className="group">
                  <Card className="h-full transition-colors group-hover:border-primary/50 group-hover:bg-accent/40">
                    <CardContent className="flex items-start gap-3 pt-6">
                      <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
                        <r.icon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold leading-tight">{r.title}</p>
                        <p className="text-muted-foreground mt-1 text-sm leading-snug">
                          {r.descripcion}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
