'use client';

import { type HoleSectionRecord, holeSectionCreateSchema, SECTION_TYPES } from '@ddr/schemas';
import { toast } from 'sonner';
import { type Draft, EditableTable } from '@/components/EditableTable';
import { Loading, QueryError } from '@/components/QueryState';
import { enumLabel } from '@/lib/labels';
import { useHoleSectionMutations, useHoleSections } from './use-hole-sections';

const num = (v: Draft[string] | undefined) =>
  v === null || v === ''
    ? undefined
    : typeof v === 'number'
      ? v
      : Number(String(v).replace(',', '.'));

/** Wellbore geometry (workbook `WBG`): casing, liner and open-hole rows, up to ten. */
export function HoleSectionsTable({ wellId }: { wellId: string }) {
  const sections = useHoleSections(wellId);
  const m = useHoleSectionMutations(wellId);
  if (sections.isPending) return <Loading what="Loading the wellbore geometry" />;
  if (sections.isError) return <QueryError error={sections.error} />;
  return (
    <EditableTable<HoleSectionRecord>
      idPrefix="hole"
      rows={sections.data}
      rowLabel={(s) => `hole section ${s.sortOrder}`}
      fields={[
        {
          key: 'type',
          label: 'Type',
          kind: 'select',
          options: SECTION_TYPES.map((t) => ({ value: t, label: enumLabel(t) })),
          width: 'w-36',
        },
        { key: 'top', label: 'Top MD', kind: 'quantity', quantity: 'depth' },
        { key: 'bottom', label: 'Bottom MD', kind: 'quantity', quantity: 'depth' },
        { key: 'outerDiameter', label: 'OD', kind: 'quantity', quantity: 'diameter' },
        { key: 'innerDiameter', label: 'ID / bit', kind: 'quantity', quantity: 'diameter' },
        { key: 'sortOrder', label: 'Order', kind: 'int', width: 'w-20' },
      ]}
      blank={{
        type: 'casing',
        top: 0,
        bottom: null,
        outerDiameter: null,
        innerDiameter: null,
        sortOrder: '',
      }}
      toDraft={(s) => ({
        type: s.type,
        top: s.top,
        bottom: s.bottom,
        outerDiameter: s.outerDiameter,
        innerDiameter: s.innerDiameter,
        sortOrder: String(s.sortOrder),
      })}
      toPayload={(d) => ({
        type: d.type,
        top: d.top ?? undefined,
        bottom: d.bottom ?? undefined,
        outerDiameter: d.outerDiameter,
        innerDiameter: d.innerDiameter ?? undefined,
        sortOrder: num(d.sortOrder),
      })}
      schema={holeSectionCreateSchema}
      onCreate={(payload) => m.create.mutateAsync(payload)}
      onUpdate={(id, payload) => m.update.mutateAsync({ id, input: payload })}
      onDelete={async (s) => {
        await m.remove.mutateAsync(s.id);
        toast.success(`Hole section ${s.sortOrder} deleted`);
      }}
    />
  );
}
