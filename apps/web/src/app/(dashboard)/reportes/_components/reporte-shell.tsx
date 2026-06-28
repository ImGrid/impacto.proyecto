"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reporteParams } from "./query";

/**
 * Envoltura común de la página de un reporte: enlace de vuelta a /reportes,
 * título + descripción, y los botones de exportar (arriba a la derecha, donde
 * el usuario espera las acciones — docs/28). Excel vía ExcelJS, PDF vía Puppeteer
 * (ver docs/29); ambos descargan el reporte con los filtros aplicados.
 *
 * `graficables`: si el reporte tiene gráfico, muestra un check "Incluir
 * gráficos" que SOLO afecta al PDF (el Excel nunca lleva gráficos). Permite que
 * quien descarga decida si quiere el PDF con o sin gráficos (pedido del cliente).
 */
export function ReporteShell({
  title,
  description,
  exportar,
  graficables = false,
  children,
}: {
  title: string;
  description?: string;
  /** Si se define, el botón Excel descarga el reporte con los filtros dados. */
  exportar?: { endpoint: string; filtros: Record<string, unknown> };
  /** El reporte tiene gráfico → mostrar el check "Incluir gráficos" (solo PDF). */
  graficables?: boolean;
  children: React.ReactNode;
}) {
  // Por defecto el PDF incluye los gráficos; el usuario puede desmarcarlo.
  const [conGraficos, setConGraficos] = useState(true);

  function descargar(formato: "excel" | "pdf") {
    if (!exportar) return;
    const params = reporteParams(exportar.filtros);
    params.set("formato", formato);
    // El check solo aplica al PDF (el Excel no lleva gráficos).
    if (formato === "pdf" && graficables && !conGraficos) {
      params.set("graficos", "false");
    }
    const a = document.createElement("a");
    a.href = `/api/reportes/${exportar.endpoint}/export?${params.toString()}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href="/reportes"
            className="text-muted-foreground hover:text-foreground mb-1 inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Reportes
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1 text-sm">{description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {graficables && (
            <label className="text-muted-foreground flex cursor-pointer items-center gap-1.5 text-sm select-none">
              <input
                type="checkbox"
                className="accent-primary h-4 w-4"
                checked={conGraficos}
                onChange={(e) => setConGraficos(e.target.checked)}
              />
              Incluir gráficos en el PDF
            </label>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => descargar("excel")}
            disabled={!exportar}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => descargar("pdf")}
            disabled={!exportar}
          >
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}
