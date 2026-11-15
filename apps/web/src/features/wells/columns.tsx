'use client';

import type { Well } from '@ddr/schemas';
import Link from 'next/link';
import { columnHelper } from '@/components/DataTable';
import { Quantity } from '@/components/Quantity';
import { formatDate } from '@/lib/format';
import { enumLabel } from '@/lib/labels';

const helper = columnHelper<Well>();

export const wellColumns = helper.columns([
  helper.accessor('name', {
    header: 'Well',
    cell: (info) => (
      <Link
        className="font-medium underline-offset-4 hover:underline"
        href={`/wells/${info.row.original.id}`}
      >
        {info.getValue()}
      </Link>
    ),
  }),
  helper.accessor('designation', {
    header: 'Designation',
    cell: (info) => {
      const value = info.getValue();
      return value ? enumLabel(value) : '—';
    },
  }),
  helper.accessor('wellType', { header: 'Type', cell: (info) => enumLabel(info.getValue()) }),
  helper.accessor('rigType', { header: 'Rig', cell: (info) => enumLabel(info.getValue()) }),
  helper.accessor('spudDate', { header: 'Spud date', cell: (info) => formatDate(info.getValue()) }),
  helper.accessor('waterDepth', {
    header: 'Water depth',
    cell: (info) => <Quantity quantity="depth" si={info.getValue()} />,
  }),
]);
