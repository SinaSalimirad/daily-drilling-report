'use client';

import { FLUID_TYPES, type Section, sectionCreateSchema } from '@ddr/schemas';
import { toast } from 'sonner';
import { type Draft, EditableTable } from '@/components/EditableTable';
import { Loading, QueryError } from '@/components/QueryState';
import { useLookups } from '@/features/lookups/use-lookups';
import { useSectionMutations, useSections } from './use-sections';

const num = (v: Draft[string] | undefined) =>
  v === null || v === ''
    ? undefined
    : typeof v === 'number'
      ? v
      : Number(String(v).replace(',', '.'));

/** Drilling sections of a well (replaces the New Section macro). Planned values in the project's units. */
export function SectionsTable({ wellId }: { wellId: string }) {
  const sections = useSections(wellId);
  const lookups = useLookups();
  const m = useSectionMutations(wellId);
  if (sections.isPending || lookups.isPending) return <Loading what="Loading sections" />;
  if (sections.isError) return <QueryError error={sections.error} />;
  if (lookups.isError) return <QueryError error={lookups.error} />;

  const systems = [
    { value: '', label: '—' },
    ...lookups.data.fluidSystems.map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <EditableTable<Section>
      idPrefix="section"
      rows={sections.data}
      rowLabel={(s) => `section ${s.sortOrder}`}
      fields={[
        { key: 'holeSize', label: 'Hole size', kind: 'quantity', quantity: 'diameter' },
        {
          key: 'fluidType',
          label: 'Fluid type',
          kind: 'select',
          options: FLUID_TYPES.map((t) => ({ value: t, label: t.toUpperCase() })),
          width: 'w-28',
        },
        { key: 'fluidSystemId', label: 'Fluid system', kind: 'select', options: systems },
        { key: 'planMudWeight', label: 'Planned MW', kind: 'quantity', quantity: 'density' },
        { key: 'planYieldPoint', label: 'Planned YP', kind: 'quantity', quantity: 'yieldStress' },
        {
          key: 'planFluidLoss',
          label: 'Planned fluid loss',
          kind: 'number',
          suffix: 'mL/30 min',
          width: 'w-40',
        },
        { key: 'sortOrder', label: 'Order', kind: 'int', width: 'w-20' },
      ]}
      blank={{
        holeSize: null,
        fluidType: 'wbm',
        fluidSystemId: '',
        planMudWeight: null,
        planYieldPoint: null,
        planFluidLoss: '',
        sortOrder: '',
      }}
      toDraft={(s) => ({
        holeSize: s.holeSize,
        fluidType: s.fluidType,
        fluidSystemId: s.fluidSystemId ?? '',
        planMudWeight: s.planMudWeight,
        planYieldPoint: s.planYieldPoint,
        planFluidLoss: s.planFluidLoss === null ? '' : String(s.planFluidLoss),
        sortOrder: String(s.sortOrder),
      })}
      toPayload={(d) => ({
        holeSize: d.holeSize ?? undefined,
        fluidType: d.fluidType,
        fluidSystemId: d.fluidSystemId === '' ? null : d.fluidSystemId,
        planMudWeight: d.planMudWeight,
        planYieldPoint: d.planYieldPoint,
        planFluidLoss: num(d.planFluidLoss) ?? null,
        sortOrder: num(d.sortOrder),
      })}
      schema={sectionCreateSchema}
      onCreate={(payload) => m.create.mutateAsync(payload)}
      onUpdate={(id, payload) => m.update.mutateAsync({ id, input: payload })}
      onDelete={async (s) => {
        await m.remove.mutateAsync(s.id);
        toast.success(`Section ${s.sortOrder} deleted`);
      }}
    />
  );
}
