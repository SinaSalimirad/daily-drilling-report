'use client';

import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
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
import { type Group, type Labels, summarize, type WellSummary } from './consumption';
import { useConsumption } from './use-dashboard';

const labels: Labels = {
  monthOf: monthKey,
  monthLabel: formatMonth,
  sectionLabel: (n, holeSize, system) =>
    `Section ${n} · ${formatQuantity(holeSize, 'diameter', system)}`,
};

const money = (value: number) => formatNumber(value, 2);

/** One table of groups (months or sections); a row opens the products behind its total. */
function GroupTable({
  title,
  groups,
  currency,
}: {
  title: string;
  groups: Group[];
  currency: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{title}</TableHead>
          <TableHead className="text-right">Cost ({currency})</TableHead>
          <TableHead className="text-right">Local ({currency})</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((g) => {
          const isOpen = open === g.key;
          return (
            <Fragment key={g.key}>
              <TableRow>
                <TableCell>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-left hover:underline"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : g.key)}
                  >
                    {isOpen ? (
                      <ChevronDownIcon className="size-4" />
                    ) : (
                      <ChevronRightIcon className="size-4" />
                    )}
                    {g.label}
                  </button>
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(g.total)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(g.local)}</TableCell>
              </TableRow>
              {isOpen ? (
                <TableRow>
                  <TableCell colSpan={3} className="bg-muted/40 p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-8">Product</TableHead>
                          <TableHead>Package</TableHead>
                          <TableHead className="text-right">Used</TableHead>
                          <TableHead className="text-right">Cost ({currency})</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {g.products.map((p) => (
                          <TableRow key={p.projectProductId}>
                            <TableCell className="pl-8">{p.name}</TableCell>
                            <TableCell>
                              {formatNumber(p.packageSize, 3)} {p.packageUnit}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatNumber(p.used, 3)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {money(p.cost)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

function WellBlock({ well, currency }: { well: WellSummary; currency: string }) {
  return (
    <section aria-labelledby={`well-${well.id}`} className="flex flex-col gap-2">
      <h3
        id={`well-${well.id}`}
        className="flex flex-wrap items-baseline gap-x-3 font-medium text-sm"
      >
        <Link href={`/wells/${well.id}/reports`} className="hover:underline">
          {well.name}
        </Link>
        <span className="text-muted-foreground tabular-nums">
          {money(well.total)} {currency} (local {money(well.local)})
        </span>
      </h3>
      {well.months.length === 0 ? (
        <p className="text-muted-foreground text-sm">No chemicals used yet.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <GroupTable title="Month" groups={well.months} currency={currency} />
          <GroupTable title="Section" groups={well.sections} currency={currency} />
        </div>
      )}
    </section>
  );
}

/** Home page: chemical cost per project and well, by month and by section (#217). */
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
          <h2
            id={`project-${project.id}`}
            className="flex flex-wrap items-baseline gap-x-3 font-semibold text-base"
          >
            <Link href={`/projects/${project.id}`} className="hover:underline">
              {project.name}
            </Link>
            <span className="font-normal text-muted-foreground text-sm tabular-nums">
              {money(project.total)} {project.currency} (local {money(project.local)})
            </span>
          </h2>
          {project.wells.map((well) => (
            <WellBlock key={well.id} well={well} currency={project.currency} />
          ))}
        </section>
      ))}
    </div>
  );
}
