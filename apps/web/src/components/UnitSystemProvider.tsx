'use client';

import { UNIT_SYSTEM_PRESETS } from '@ddr/calc/units';
import type { UnitSystem } from '@ddr/schemas';
import { createContext, type ReactNode, useContext } from 'react';

// Passes the current project's display unit system to <Quantity> and <QuantityInput>.
// It holds no state: the value comes from the project query (TanStack Query owns server
// data, docs/02). Outside a project the SI preset applies.

const UnitSystemContext = createContext<UnitSystem>(UNIT_SYSTEM_PRESETS.si);

export function UnitSystemProvider({
  system,
  children,
}: {
  system: UnitSystem;
  children: ReactNode;
}) {
  return <UnitSystemContext.Provider value={system}>{children}</UnitSystemContext.Provider>;
}

export function useUnitSystem(): UnitSystem {
  return useContext(UnitSystemContext);
}
