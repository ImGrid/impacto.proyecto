"use client";

import { createContext, useContext } from "react";

/**
 * Departamento activo de la sesión del admin (campo `departamento_activo`
 * del JWT). Lo provee el layout del dashboard a partir del DAL. Es `null`
 * solo en sesiones sin departamento (no debería ocurrir para un admin).
 *
 * Se usa para acotar los selectores que dependen de la geografía — por
 * ejemplo el dropdown de zonas en los formularios de eventos y de
 * notificaciones — de modo que un admin de La Paz solo vea zonas de La Paz.
 */
const DepartamentoActivoContext = createContext<number | null>(null);

export function DepartamentoProvider({
  value,
  children,
}: {
  value: number | null;
  children: React.ReactNode;
}) {
  return (
    <DepartamentoActivoContext.Provider value={value}>
      {children}
    </DepartamentoActivoContext.Provider>
  );
}

/** Devuelve el departamento activo de la sesión, o `null` si no hay. */
export function useDepartamentoActivo(): number | null {
  return useContext(DepartamentoActivoContext);
}
