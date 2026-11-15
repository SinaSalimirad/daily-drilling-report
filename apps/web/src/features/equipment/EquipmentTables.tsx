'use client';

import {
  type Pit,
  PUMP_TYPES,
  type Pump,
  pitCreateSchema,
  pumpCreateSchema,
  type SceUnit,
  sceUnitCreateSchema,
} from '@ddr/schemas';
import { toast } from 'sonner';
import { type Draft, EditableTable } from '@/components/EditableTable';
import { Loading, QueryError } from '@/components/QueryState';
import { useUnitSystem } from '@/components/UnitSystemProvider';
import { formatNumber, quantityLabel, toDisplay } from '@/lib/format';
import { enumLabel } from '@/lib/labels';
import {
  usePitMutations,
  usePits,
  usePumpMutations,
  usePumps,
  useSceMutations,
  useSceUnits,
  wasArchived,
} from './use-equipment';

const text = (v: Draft[string] | undefined) =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
const num = (v: Draft[string] | undefined) =>
  v === null || v === ''
    ? undefined
    : typeof v === 'number'
      ? v
      : Number(String(v).replace(',', '.'));

const notifyDelete = (what: string, result: unknown) =>
  toast.success(
    wasArchived(result) ? `${what} archived — readings refer to it` : `${what} deleted`,
  );

// --- pits ---
export function PitsTable({ projectId }: { projectId: string }) {
  const pits = usePits(projectId);
  const m = usePitMutations(projectId);
  if (pits.isPending) return <Loading what="Loading pits" />;
  if (pits.isError) return <QueryError error={pits.error} />;
  return (
    <EditableTable<Pit>
      idPrefix="pit"
      rows={pits.data}
      rowLabel={(p) => p.name}
      fields={[
        { key: 'name', label: 'Pit', kind: 'text', required: true },
        { key: 'capacity', label: 'Capacity', kind: 'quantity', quantity: 'volume' },
        { key: 'sortOrder', label: 'Order', kind: 'int', width: 'w-24' },
      ]}
      blank={{ name: '', capacity: null, sortOrder: '' }}
      toDraft={(p) => ({ name: p.name, capacity: p.capacity, sortOrder: String(p.sortOrder) })}
      toPayload={(d) => ({
        name: text(d.name) ?? '',
        capacity: d.capacity ?? undefined,
        sortOrder: num(d.sortOrder),
      })}
      schema={pitCreateSchema}
      conflicts={{
        pits_project_id_name_unique: { field: 'name', message: 'This pit name is already used' },
      }}
      onCreate={(payload) => m.create.mutateAsync(payload)}
      onUpdate={(id, payload) => m.update.mutateAsync({ id, input: payload })}
      onDelete={async (p) => notifyDelete(`Pit ${p.name}`, await m.remove.mutateAsync(p.id))}
    />
  );
}

// --- pumps ---
export function PumpsTable({ projectId }: { projectId: string }) {
  const pumps = usePumps(projectId);
  const m = usePumpMutations(projectId);
  const system = useUnitSystem();
  if (pumps.isPending) return <Loading what="Loading pumps" />;
  if (pumps.isError) return <QueryError error={pumps.error} />;
  return (
    <EditableTable<Pump>
      idPrefix="pump"
      rows={pumps.data}
      rowLabel={(p) => `pump ${p.sortOrder} (${p.model})`}
      fields={[
        { key: 'model', label: 'Model', kind: 'text', required: true },
        {
          key: 'type',
          label: 'Type',
          kind: 'select',
          options: PUMP_TYPES.map((t) => ({ value: t, label: enumLabel(t) })),
          width: 'w-32',
        },
        { key: 'linerDiameter', label: 'Liner', kind: 'quantity', quantity: 'diameter' },
        { key: 'strokeLength', label: 'Stroke', kind: 'quantity', quantity: 'diameter' },
        { key: 'efficiency', label: 'Efficiency', kind: 'number', suffix: '%', width: 'w-32' },
      ]}
      blank={{
        model: '',
        type: 'triplex',
        linerDiameter: null,
        strokeLength: null,
        efficiency: '95',
      }}
      toDraft={(p) => ({
        model: p.model,
        type: p.type,
        linerDiameter: p.linerDiameter,
        strokeLength: p.strokeLength,
        efficiency: String(p.efficiency),
      })}
      toPayload={(d) => ({
        model: text(d.model) ?? '',
        type: d.type,
        linerDiameter: d.linerDiameter ?? undefined,
        strokeLength: d.strokeLength ?? undefined,
        efficiency: num(d.efficiency),
      })}
      schema={pumpCreateSchema}
      onCreate={(payload) => m.create.mutateAsync(payload)}
      onUpdate={(id, payload) => m.update.mutateAsync({ id, input: payload })}
      onDelete={async (p) => notifyDelete(`Pump ${p.sortOrder}`, await m.remove.mutateAsync(p.id))}
      extra={{
        label: 'Output per stroke',
        // Volume per stroke is small; 4 decimals keep the workbook's 4.19 gal = 0.0998 bbl readable.
        cell: (p) =>
          `${formatNumber(toDisplay(p.outputPerStroke, 'volume', system), 4)} ${quantityLabel(system, 'volume')}/stk`,
      }}
    />
  );
}

// --- solids-control equipment ---
export function SceTable({ projectId }: { projectId: string }) {
  const units = useSceUnits(projectId);
  const m = useSceMutations(projectId);
  if (units.isPending) return <Loading what="Loading solids-control equipment" />;
  if (units.isError) return <QueryError error={units.error} />;
  return (
    <EditableTable<SceUnit>
      idPrefix="sce"
      rows={units.data}
      rowLabel={(u) => `${u.type}${u.unitNumber ? ` #${u.unitNumber}` : ''}`}
      fields={[
        { key: 'type', label: 'Type', kind: 'text', required: true },
        { key: 'unitNumber', label: 'No.', kind: 'int', width: 'w-20' },
        { key: 'manufacturer', label: 'Manufacturer', kind: 'text' },
        { key: 'screenSize', label: 'Screen', kind: 'text', width: 'w-28' },
        { key: 'model', label: 'Model', kind: 'text' },
      ]}
      blank={{ type: '', unitNumber: '', manufacturer: '', screenSize: '', model: '' }}
      toDraft={(u) => ({
        type: u.type,
        unitNumber: u.unitNumber === null ? '' : String(u.unitNumber),
        manufacturer: u.manufacturer ?? '',
        screenSize: u.screenSize ?? '',
        model: u.model ?? '',
      })}
      toPayload={(d) => ({
        type: text(d.type) ?? '',
        unitNumber: num(d.unitNumber) ?? null,
        manufacturer: text(d.manufacturer),
        screenSize: text(d.screenSize),
        model: text(d.model),
      })}
      schema={sceUnitCreateSchema}
      onCreate={(payload) => m.create.mutateAsync(payload)}
      onUpdate={(id, payload) => m.update.mutateAsync({ id, input: payload })}
      onDelete={async (u) =>
        notifyDelete(
          `${u.type}${u.unitNumber ? ` #${u.unitNumber}` : ''}`,
          await m.remove.mutateAsync(u.id),
        )
      }
    />
  );
}
