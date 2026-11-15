'use client';

import type { Project } from '@ddr/schemas';
import Link from 'next/link';
import { columnHelper } from '@/components/DataTable';
import { presetLabel } from './UnitSystemFields';

const helper = columnHelper<Project>();

export const projectColumns = helper.columns([
  helper.accessor('name', {
    header: 'Project',
    cell: (info) => (
      <Link
        className="font-medium underline-offset-4 hover:underline"
        href={`/projects/${info.row.original.id}`}
      >
        {info.getValue()}
      </Link>
    ),
  }),
  helper.accessor('operator', { header: 'Operator' }),
  helper.accessor('contractor', { header: 'Contractor', cell: (info) => info.getValue() ?? '—' }),
  helper.accessor('rigName', { header: 'Rig', cell: (info) => info.getValue() ?? '—' }),
  helper.accessor('currency', { header: 'Currency' }),
  helper.accessor('unitSystem', { header: 'Units', cell: (info) => presetLabel(info.getValue()) }),
]);
