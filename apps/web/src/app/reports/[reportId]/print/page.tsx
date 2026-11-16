'use client';

import type { Hydraulics, Inventory, SamplesResult, VolumesResult } from '@ddr/schemas';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Quantity } from '@/components/Quantity';
import { Loading, QueryError } from '@/components/QueryState';
import { UnitSystemProvider } from '@/components/UnitSystemProvider';
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
import { PdfButton } from '@/features/reports/PdfButton';
import { useReport, useReportActivities, useResults } from '@/features/reports/use-reports';
import { useWell } from '@/features/wells/use-wells';
import { usePrintReady } from '@/hooks/use-print-ready';
import { formatDate, formatNumber } from '@/lib/format';

type Payload = {
  inventory: Inventory;
  volumes: VolumesResult;
  samples: SamplesResult;
  hydraulics: Hydraulics;
};

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="break-inside-avoid">
    <h2 className="mb-1 border-b font-semibold text-xs uppercase tracking-wide">{title}</h2>
    {children}
  </section>
);

/** The report as it is printed (A4): the blocks of the workbook's DMR page, read-only. */
export default function PrintReportPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const report = useReport(reportId);
  const wellId = report.data?.data.wellId ?? '';
  const well = useWell(wellId);
  const project = useProject(well.data?.projectId ?? '');
  const activities = useReportActivities(reportId);
  const results = useResults(reportId);
  usePrintReady([report, well, project, activities, results].every((q) => q.isSuccess));

  if (report.isError) return <QueryError error={report.error} />;
  if (well.isError) return <QueryError error={well.error} />;
  if (project.isError) return <QueryError error={project.error} />;
  if (activities.isError) return <QueryError error={activities.error} />;
  if (results.isError) return <QueryError error={results.error} />;
  if (
    report.isPending ||
    well.isPending ||
    project.isPending ||
    activities.isPending ||
    results.isPending
  ) {
    return <Loading what="Preparing the report" />;
  }

  const r = report.data.data;
  const p = results.data.payload as unknown as Payload;
  const used = p.inventory.rows.filter((row) => row.used > 0);
  const block = p.volumes.block;
  const columns = [
    ['Daily', p.volumes.accounting.daily],
    ['Section', p.volumes.accounting.section],
    ['Well', p.volumes.accounting.well],
  ] as const;

  return (
    <UnitSystemProvider system={project.data.unitSystem}>
      <PageHeader
        title={`Report ${r.reportNo}`}
        actions={
          <>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/reports/${reportId}`} />}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/reports/${reportId}/inventory/print`} />}
            >
              Inventory
            </Button>
            <PdfButton reportId={reportId} page="report" />
            <Button onClick={() => window.print()}>Print</Button>
          </>
        }
      />
      <main className="print-page mx-auto flex max-w-[210mm] flex-col gap-4 p-4 text-sm">
        <header className="flex items-start justify-between border-b pb-2">
          <div>
            <h1 className="font-semibold text-base">Daily drilling fluids report</h1>
            <p>
              {project.data.operator} · {well.data.name} · {project.data.name}
            </p>
          </div>
          <div className="text-right">
            <p>
              Report {r.reportNo} · {formatDate(r.reportDate)}
            </p>
            <p className="text-muted-foreground">
              {results.data.source === 'snapshot' ? 'Submitted' : 'Draft'} · revision {r.revision} ·
              engine {results.data.engineVersion}
            </p>
          </div>
        </header>

        <Block title="Depths">
          <p>
            Bit depth <Quantity quantity="depth" si={r.bitDepth} /> · TD{' '}
            <Quantity quantity="depth" si={r.td} /> · TVD <Quantity quantity="depth" si={r.tvd} /> ·
            drilled today <Quantity quantity="depth" si={r.dailyDrilled} /> · formation{' '}
            {r.formation ?? '—'}
          </p>
        </Block>

        <Block title="Mud volume">
          <p>
            Hole <Quantity quantity="volume" si={block.hole} /> · string{' '}
            <Quantity quantity="volume" si={block.string} /> · annulus{' '}
            <Quantity quantity="volume" si={block.annulus} /> · below bit{' '}
            <Quantity quantity="volume" si={block.belowBit} /> · active{' '}
            <Quantity quantity="volume" si={block.active} /> · reserve{' '}
            <Quantity quantity="volume" si={block.reserve} /> · total circulating{' '}
            <Quantity quantity="volume" si={block.totalCirculating} />
          </p>
        </Block>

        <Block title="Mud properties">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sample</TableHead>
                <TableHead className="text-right">Mud weight</TableHead>
                <TableHead className="text-right">Funnel (s/qt)</TableHead>
                <TableHead className="text-right">PV</TableHead>
                <TableHead className="text-right">YP</TableHead>
                <TableHead className="text-right">API FL</TableHead>
                <TableHead className="text-right">Chlorides</TableHead>
                <TableHead className="text-right">Solids %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {p.samples.samples.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.seq}</TableCell>
                  <TableCell className="text-right">
                    <Quantity quantity="density" si={s.mudWeight} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(s.funnelViscosity, 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Quantity quantity="plasticViscosity" si={s.plasticViscosity} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Quantity quantity="yieldStress" si={s.yieldPoint} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(s.apiFluidLoss, 1)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Quantity quantity="chlorides" si={s.chlorides} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(s.solids, 1)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Block>

        <Block title="Products used last 24 h">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Package</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead className="text-right">Final stock</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {used.map((row) => (
                <TableRow key={row.projectProductId}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    {formatNumber(row.packageSize, 3)} {row.packageUnit}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.used, 3)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.finalStock, 3)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.dailyCost, 2)} {project.data.currency}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-1">
            Cost: today {formatNumber(p.inventory.costs.daily.total, 2)} · section{' '}
            {formatNumber(p.inventory.costs.section.total, 2)} · month{' '}
            {formatNumber(p.inventory.costs.monthly.total, 2)} · well{' '}
            {formatNumber(p.inventory.costs.cumulative.total, 2)} {project.data.currency}
          </p>
        </Block>

        <Block title="Mud volume accounting">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                {columns.map(([name]) => (
                  <TableHead key={name} className="text-right">
                    {name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(
                [
                  ['Start volume', (c) => c.start],
                  ['Built', (c) => c.built],
                  ['Received', (c) => c.received],
                  ['Return', (c) => c.returned],
                  ['Total losses', (c) => c.totalLosses],
                  ['End volume', (c) => c.end],
                ] as [string, (c: (typeof columns)[number][1]) => number][]
              ).map(([label, pick]) => (
                <TableRow key={label}>
                  <TableCell>{label}</TableCell>
                  {columns.map(([name, c]) => (
                    <TableCell key={name} className="text-right">
                      <Quantity quantity="volume" si={pick(c)} withUnit={false} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Block>

        <Block title="Activities">
          <ul>
            {activities.data.data.activities.map((a) => (
              <li key={a.id}>
                {a.name} — {formatNumber(a.hours, 2)} h
              </li>
            ))}
          </ul>
        </Block>

        <Block title="Remarks">
          <p>{r.drillingRemarks ?? '—'}</p>
          <p>{r.fluidRemarks ?? ''}</p>
          <p className="mt-2 text-muted-foreground">
            Representatives: {r.representatives.join(', ') || '—'} · Fluids engineers:{' '}
            {r.engineers.join(', ') || '—'}
          </p>
        </Block>
      </main>
    </UnitSystemProvider>
  );
}
