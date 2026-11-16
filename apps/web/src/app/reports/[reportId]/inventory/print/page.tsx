'use client';

import type { Inventory } from '@ddr/schemas';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Loading, QueryError } from '@/components/QueryState';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useProject } from '@/features/projects/use-projects';
import { useReport, useResults } from '@/features/reports/use-reports';
import { useWell } from '@/features/wells/use-wells';
import { usePrintReady } from '@/hooks/use-print-ready';
import { formatDate, formatNumber } from '@/lib/format';
import { enumLabel } from '@/lib/labels';

/** The inventory as it is printed (A4 landscape): the workbook's `Chem Inv.` page, read-only. */
export default function PrintInventoryPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const report = useReport(reportId);
  const well = useWell(report.data?.data.wellId ?? '');
  const project = useProject(well.data?.projectId ?? '');
  const results = useResults(reportId);
  const queries = [report, well, project, results];
  usePrintReady(queries.every((q) => q.isSuccess));

  const failed = queries.find((q) => q.isError)?.error;
  if (failed) return <QueryError error={failed} />;
  if (!report.isSuccess || !well.isSuccess || !project.isSuccess || !results.isSuccess) {
    return <Loading what="Preparing the inventory" />;
  }

  const r = report.data.data;
  const currency = project.data.currency;
  const { rows, costs, stockValue } = (results.data.payload as unknown as { inventory: Inventory })
    .inventory;
  const money = (value: number) => formatNumber(value, 2);
  const qty = (value: number) => formatNumber(value, 3);

  return (
    <>
      <PageHeader
        title={`Inventory — report ${r.reportNo}`}
        actions={
          <>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/reports/${reportId}/print`} />}
            >
              Report
            </Button>
            <Button onClick={() => window.print()}>Print</Button>
          </>
        }
      />
      <main className="print-page print-landscape mx-auto flex max-w-[297mm] flex-col gap-4 p-4 text-sm">
        <header className="flex items-start justify-between border-b pb-2">
          <div>
            <h1 className="font-semibold text-base">Chemical inventory</h1>
            <p>
              {project.data.operator} · {well.data.name} · {project.data.name}
            </p>
          </div>
          <div className="text-right">
            <p>
              Report {r.reportNo} · {formatDate(r.reportDate)}
            </p>
            <p className="text-muted-foreground">
              {results.data.source === 'snapshot' ? 'Submitted' : 'Draft'} · revision {r.revision}
            </p>
          </div>
        </header>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead className="text-right">Price ({currency})</TableHead>
              <TableHead className="text-right">Initial</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Used</TableHead>
              <TableHead className="text-right">Final stock</TableHead>
              <TableHead className="text-right">Cost today ({currency})</TableHead>
              <TableHead className="text-right">Used section</TableHead>
              <TableHead className="text-right">Used month</TableHead>
              <TableHead className="text-right">Used well</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.projectProductId}>
                <TableCell className="font-medium">
                  {row.name}
                  {row.keyStock ? ' *' : ''}
                </TableCell>
                <TableCell>
                  {qty(row.packageSize)} {row.packageUnit}
                </TableCell>
                <TableCell>{enumLabel(row.origin)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(row.unitPrice)}</TableCell>
                <TableCell className="text-right tabular-nums">{qty(row.initial)}</TableCell>
                <TableCell className="text-right tabular-nums">{qty(row.received)}</TableCell>
                <TableCell className="text-right tabular-nums">{qty(row.used)}</TableCell>
                <TableCell
                  className={`text-right tabular-nums ${row.finalStock < 0 ? 'font-medium text-destructive' : ''}`}
                >
                  {qty(row.finalStock)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(row.dailyCost)}</TableCell>
                <TableCell className="text-right tabular-nums">{qty(row.usedSection)}</TableCell>
                <TableCell className="text-right tabular-nums">{qty(row.usedMonthly)}</TableCell>
                <TableCell className="text-right tabular-nums">{qty(row.usedCumulative)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={8}>Stock value (final stock × current price)</TableCell>
              <TableCell className="text-right tabular-nums">{money(stockValue)}</TableCell>
              <TableCell colSpan={3} />
            </TableRow>
          </TableFooter>
        </Table>

        <section className="break-inside-avoid">
          <h2 className="mb-1 border-b font-semibold text-xs uppercase tracking-wide">Cost</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead className="text-right">Today</TableHead>
                <TableHead className="text-right">Section</TableHead>
                <TableHead className="text-right">Month</TableHead>
                <TableHead className="text-right">Well</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(
                [
                  ['Total', 'total'],
                  ['Local', 'local'],
                ] as const
              ).map(([label, key]) => (
                <TableRow key={key}>
                  <TableCell>
                    {label} ({currency})
                  </TableCell>
                  {([costs.daily, costs.section, costs.monthly, costs.cumulative] as const).map(
                    (cost, index) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: four fixed columns
                      <TableCell key={index} className="text-right tabular-nums">
                        {money(cost[key])}
                      </TableCell>
                    ),
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-1 text-muted-foreground text-xs">* key stock</p>
        </section>
      </main>
    </>
  );
}
