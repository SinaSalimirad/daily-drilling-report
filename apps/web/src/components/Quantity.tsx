'use client';

import type { Quantity as QuantityName } from '@ddr/schemas';
import { formatQuantity } from '@/lib/format';
import { useUnitSystem } from './UnitSystemProvider';

/** Read-only SI value shown in the project's display unit, e.g. `<Quantity quantity="density" si={1201.38} />` → `75 PCF`. */
export function Quantity({
  quantity,
  si,
  withUnit = true,
}: {
  quantity: QuantityName;
  si: number | null | undefined;
  withUnit?: boolean;
}) {
  const system = useUnitSystem();
  return <span className="tabular-nums">{formatQuantity(si, quantity, system, { withUnit })}</span>;
}
