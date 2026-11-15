'use client';

import { VOLUME_LOSS_ITEMS } from '@ddr/schemas';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { BarChart } from '@/components/BarChart';
import { PageHeader } from '@/components/PageHeader';
import { Quantity } from '@/components/Quantity';
import { Loading, QueryError } from '@/components/QueryState';
import { UnitSystemProvider, useUnitSystem } from '@/components/UnitSystemProvider';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useProject } from '@/features/projects/use-projects';
import { useRecap } from '@/features/recap/use-recap';
import { useWell } from '@/features/wells/use-wells';
import { formatNumber, toDisplay } from '@/lib/format';
import { enumLabel } from '@/lib/labels';

function RecapBody({ wellId, currency }: { wellId: string; currency: string }) {
  const [scope, setScope] = useState<'section' | 'well'>('section');
  const recap = useRecap(wellId, scope);
  const system = useUnitSystem();
  if (recap.isPending) return <Loading what="Loading the recap" />;
  if (recap.isError) return <QueryError error={recap.error} />;
  const r = recap.data;
  const volume = (si: number) => toDisplay(si, 'volume', system);
  return (
    <main className="print-page flex flex-col gap-8 p-4">
      <fieldset className="print-hide flex gap-2">
        <legend className="sr-only">Scope</legend>
        {(['section', 'well'] as const).map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            variant={scope === s ? 'default' : 'outline'}
            aria-pressed={scope === s}
            onClick={() => setScope(s)}
          >
            {s === 'section' ? 'Section' : 'Well'}
          </Button>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => window.print()}>
          Print
        </Button>
      </fieldset>

      <p className="text-sm">
        Reports {r.reports.first}–{r.reports.last} ({r.reports.count}) · cost{' '}
        <span className="font-medium tabular-nums">
          {formatNumber(r.cost.total, 2)} {currency}
        </span>{' '}
        (local {formatNumber(r.cost.local, 2)}) · average ROP{' '}
        <Quantity quantity="rop" si={r.averageRop} />
      </p>

      <section aria-labelledby="chem-heading" className="flex flex-col gap-3">
        <h2 id="chem-heading" className="font-semibold text-sm">
          Chemicals consumption
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Package</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Used</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Concentration</TableHead>
              <TableHead className="text-right">Cost %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {r.products.map((p) => (
              <TableRow key={p.projectProductId}>
                <TableCell>{p.name}</TableCell>
                <TableCell>
                  {formatNumber(p.packageSize, 3)} {p.packageUnit}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(p.unitPrice, 2)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(p.used, 3)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(p.cost, 2)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.concentration !== null ? (
                    <Quantity quantity="concentration" si={p.concentration} />
                  ) : p.volumePercent !== null ? (
                    `${formatNumber(p.volumePercent, 2)} %vol`
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(p.costShare, 2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <BarChart
          title={`Cost by product (${currency})`}
          rows={r.products.map((p) => ({ label: p.name, value: p.cost }))}
          decimals={2}
        />
        <BarChart
          title="Mud losses"
          rows={VOLUME_LOSS_ITEMS.map((item) => ({
            label: enumLabel(item),
            value: volume(r.accounting.losses[item]),
          }))}
          decimals={1}
        />
      </div>

      <section aria-labelledby="hours-heading" className="flex flex-col gap-2">
        <h2 id="hours-heading" className="font-semibold text-sm">
          Operation hours
        </h2>
        <BarChart
          title="Hours by activity"
          rows={r.operationHours.map((o) => ({ label: o.activity, value: o.hours }))}
          unit="h"
        />
      </section>
    </main>
  );
}

export default function RecapPage() {
  const { wellId } = useParams<{ wellId: string }>();
  const well = useWell(wellId);
  const project = useProject(well.data?.projectId ?? '');
  if (well.isError) return <QueryError error={well.error} />;
  if (project.isError) return <QueryError error={project.error} />;
  if (well.isPending || project.isPending) return <Loading what="Loading" />;
  return (
    <UnitSystemProvider system={project.data.unitSystem}>
      <PageHeader
        title={`${well.data.name} — recap`}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/wells/${wellId}/reports`} />}
          >
            Reports
          </Button>
        }
      />
      <RecapBody wellId={wellId} currency={project.data.currency} />
    </UnitSystemProvider>
  );
}
