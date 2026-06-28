"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { type MultiOption } from "@/components/shared/multi-select";
import { useGeneradores } from "@/hooks/use-generadores";
import { useTiposGenerador } from "@/hooks/use-tipos-generador";
import { useZonas } from "@/hooks/use-zonas";
import { useDepartamentoActivo } from "@/components/departamento-context";
import type { ReporteSucursalesFiltros } from "@/types/reportes";
import { ReportePeriodoFiltro } from "../../_components/reporte-periodo-filtro";
import { ReporteFiltroExtra } from "../../_components/reporte-filtro-extra";

/**
 * Filtros del reporte por sucursal: período + generador + tipo + zona +
 * búsqueda. El generador es el filtro principal (ver las sucursales de un
 * proyecto). Reusa el componente de período y el de multi-select de dimensión.
 */
export function SucursalesFiltros({
  value,
  onChange,
}: {
  value: ReporteSucursalesFiltros;
  onChange: (v: ReporteSucursalesFiltros) => void;
}) {
  const depto = useDepartamentoActivo();
  const { data: generadores } = useGeneradores({ limit: 100, activo: true });
  const { data: tipos } = useTiposGenerador({ limit: 100, activo: true });
  const { data: zonas } = useZonas({
    limit: 100,
    activo: true,
    departamentoId: depto ?? undefined,
  });

  const patch = (p: Partial<ReporteSucursalesFiltros>) =>
    onChange({ ...value, ...p });

  const genOpts: MultiOption[] = (generadores?.data ?? []).map((g) => ({
    value: String(g.id),
    label: g.razon_social,
  }));
  const tipoOpts: MultiOption[] = (tipos?.data ?? []).map((t) => ({
    value: String(t.id),
    label: t.nombre,
  }));
  const zonaOpts: MultiOption[] = (zonas?.data ?? []).map((z) => ({
    value: String(z.id),
    label: z.nombre,
  }));

  return (
    <ReportePeriodoFiltro
      value={value}
      onChange={(p) => onChange({ ...value, ...p })}
    >
      <div className="flex flex-col gap-1">
        <label className="text-muted-foreground text-xs font-medium">Nombre</label>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            value={value.search ?? ""}
            onChange={(e) => patch({ search: e.target.value || undefined })}
            placeholder="Buscar sucursal…"
            className="h-9 w-[170px] pl-7"
          />
        </div>
      </div>
      <ReporteFiltroExtra
        label="Generador"
        options={genOpts}
        value={value.generador_id}
        onChange={(v) => patch({ generador_id: v })}
        noun={{ one: "generador", many: "generadores" }}
        width="w-[200px]"
      />
      <ReporteFiltroExtra
        label="Tipo"
        options={tipoOpts}
        value={value.tipo_generador_id}
        onChange={(v) => patch({ tipo_generador_id: v })}
        noun={{ one: "tipo", many: "tipos" }}
      />
      <ReporteFiltroExtra
        label="Zona"
        options={zonaOpts}
        value={value.zona_id}
        onChange={(v) => patch({ zona_id: v })}
        noun={{ one: "zona", many: "zonas" }}
      />
    </ReportePeriodoFiltro>
  );
}
