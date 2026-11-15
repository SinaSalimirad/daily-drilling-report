'use client';

import type { Report, Section } from '@ddr/schemas';
import Link from 'next/link';
import { columnHelper } from '@/components/DataTable';
import { Quantity } from '@/components/Quantity';
import { formatDate } from '@/lib/format';
import { enumLabel } from '@/lib/labels';

const helper = columnHelper<Report>();

export const reportColumns = (sections: Section[]) => {
  const sectionOf = (id: string) => sections.find((s) => s.id === id);
  return helper.columns([
    helper.accessor('reportNo', {
      header: 'No.',
      cell: (info) => (
        <Link
          className="font-medium underline-offset-4 hover:underline"
          href={`/reports/${info.row.original.id}`}
        >
          {info.getValue()}
        </Link>
      ),
    }),
    helper.accessor('reportDate', { header: 'Date', cell: (info) => formatDate(info.getValue()) }),
    helper.accessor('sectionId', {
      header: 'Section',
      cell: (info) => {
        const section = sectionOf(info.getValue());
        return section ? <Quantity quantity="diameter" si={section.holeSize} /> : '—';
      },
    }),
    helper.accessor('status', {
      header: 'Status',
      cell: (info) => enumLabel(info.getValue()),
    }),
  ]);
};
