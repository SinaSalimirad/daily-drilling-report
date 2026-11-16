'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Loading, QueryError } from '@/components/QueryState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatMonth, formatNumber, formatQuantity, monthKey } from '@/lib/format';
import { type Labels, type ProductRow, summarize, type WellSummary } from './consumption';

import { useConsumption } from './use-dashboard';

const labels: Labels = {
  monthOf: monthKey,
  monthLabel: formatMonth,
  sectionLabel: (n, holeSize, system) =>
    `Section ${n} · ${formatQuantity(holeSize, 'diameter', system)}`,
};

/** Packages; an empty cell for nothing, so the matrix reads at a glance. */
const qty = (value: number | undefined) => (value ? formatNumber(value, 3) : '');

const num = 'text-right tabular-nums';
const divider = 'border-l';

function ProductCell({ row }: { row: ProductRow }) {
  return (
    <TableCell className="whitespace-nowrap">
      <span className="font-medium">{row.name}</span>{' '}
      <span className="text-muted-foreground text-xs">
        {formatNumber(row.packageSize, 3)} {row.packageUnit}
      </span>
    </TableCell>
  );
}

/** Product × month (used, received) and the well total (used, received, returned). */
function MonthMatrix({ well }: { well: WellSummary }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead rowSpan={2}>Product</TableHead>
          {well.months.map((m) => (
            <TableHead key={m.key} colSpan={2} className={`text-center ${divider}`}>
              {m.label}
            </TableHead>
          ))}
          <TableHead colSpan={3} className={`text-center ${divider}`}>
            Total
          </TableHead>
        </TableRow>
        <TableRow>
          {well.months.map((m) => (
            <MonthHeads key={m.key} />
          ))}
          <TableHead className={`${num} ${divider}`}>Used</TableHead>
          <TableHead className={num}>Received</TableHead>
          <TableHead className={num}>Return</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {well.products.map((row) => (
          <TableRow key={row.projectProductId}>
            <ProductCell row={row} />
            {well.months.map((m) => (
              <MonthCells key={m.key} moves={row.byMonth[m.key]} />
            ))}
            <TableCell className={`${num} ${divider} font-medium`}>{qty(row.total.used)}</TableCell>
            <TableCell className={`${num} font-medium`}>{qty(row.total.received)}</TableCell>
            <TableCell className={`${num} font-medium`}>{qty(row.total.returned)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const MonthHeads = () => (
  <>
    <TableHead className={`${num} ${divider}`}>Used</TableHead>
    <TableHead className={num}>Received</TableHead>
  </>
);

const MonthCells = ({ moves }: { moves: ProductRow['byMonth'][string] | undefined }) => (
  <>
    <TableCell className={`${num} ${divider}`}>{qty(moves?.used)}</TableCell>
    <TableCell className={num}>{qty(moves?.received)}</TableCell>
  </>
);

/** Product × section: packages used. */
function SectionMatrix({ well }: { well: WellSummary }) {
  const rows = well.products.filter((row) => Object.values(row.bySection).some((v) => v !== 0));
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          {well.sections.map((s) => (
            <TableHead key={s.key} className={`${num} ${divider}`}>
              {s.label} — used
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.projectProductId}>
            <ProductCell row={row} />
            {well.sections.map((s) => (
              <TableCell key={s.key} className={`${num} ${divider}`}>
                {qty(row.bySection[s.key])}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function WellBlock({ well }: { well: WellSummary }) {
  return (
    <section aria-labelledby={`well-${well.id}`} className="flex flex-col gap-3">
      <h3 id={`well-${well.id}`} className="font-medium text-sm">
        <Link href={`/wells/${well.id}/reports`} className="hover:underline">
          {well.name}
        </Link>
      </h3>
      {well.products.length === 0 ? (
        <p className="text-muted-foreground text-sm">No chemical moves yet.</p>
      ) : (
        <>
          <MonthMatrix well={well} />
          {well.sections.length > 0 ? <SectionMatrix well={well} /> : null}
        </>
      )}
    </section>
  );
}

/** Home page: packages used, received and returned per project and well (#217, #220). */
export function ConsumptionDashboard() {
  const query = useConsumption();
  const projects = useMemo(() => (query.data ? summarize(query.data, labels) : []), [query.data]);
  if (query.isPending) return <Loading what="Loading the consumption" />;
  if (query.isError) return <QueryError error={query.error} />;
  if (projects.length === 0) {
    return <p className="text-muted-foreground text-sm">No wells to show yet.</p>;
  }
  return (
    <div className="flex flex-col gap-8">
      {projects.map((project) => (
        <section
          key={project.id}
          aria-labelledby={`project-${project.id}`}
          className="flex flex-col gap-4 rounded-lg border p-4"
        >
          <h2 id={`project-${project.id}`} className="font-semibold text-base">
            <Link href={`/projects/${project.id}`} className="hover:underline">
              {project.name}
            </Link>
          </h2>
          {project.wells.map((well) => (
            <WellBlock key={well.id} well={well} />
          ))}
        </section>
      ))}
    </div>
  );
}
