"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DataTableFeatures } from "@/lib/table-feature";
import type { Project } from "../type";
import { ProjectDeleteDialog } from "./project-delete-dialog";
import { ProjectEditSheet } from "./project-edit-sheet";

const columnHelper = createColumnHelper<DataTableFeatures, Project>();

const centeredHeader = (title: string) => () => (
  <div className="text-center tabular-nums">{title}</div>
);

const centeredCell = (value: string) => <div className="text-center tabular-nums">{value}</div>;

const RIG_TYPE_LABELS: Record<Project["rigType"], string> = {
  offshore: "Offshore",
  onshore: "Onshore",
};

// A component (not inline in the column) so it can hold the edit sheet and delete dialog state.
function ProjectActions({ project }: { project: Project }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" />}>
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Project actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit project</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete project
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Outside the menu: the menu content unmounts when it closes. */}
      <ProjectEditSheet project={project} open={editOpen} onOpenChange={setEditOpen} />
      <ProjectDeleteDialog project={project} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
}

export const projectColumns = columnHelper.columns([
  columnHelper.display({
    id: "counter",
    header: () => <div className="text-center">#</div>,
    cell: ({ row }) => (
      <div className="text-center text-muted-foreground tabular-nums">{row.index + 1}</div>
    ),
  }),
  columnHelper.accessor("name", {
    header: () => <div className="text-left">Name</div>,
    cell: ({ getValue }) => <span className="font-medium text-left">{getValue()}</span>,
    filterFn: "includesString", // case-insensitive search from the toolbar
    sortFn: "alphanumeric",
  }),
  columnHelper.accessor("field", {
    header: centeredHeader("Field"),
    cell: ({ getValue }) => centeredCell(getValue()),
  }),
  columnHelper.accessor("rigName", {
    header: centeredHeader("Rig"),
    cell: ({ getValue }) => centeredCell(getValue()),
  }),
  columnHelper.accessor("rigType", {
    header: centeredHeader("Rig Type"),
    cell: ({ getValue }) => centeredCell(RIG_TYPE_LABELS[getValue()]),
  }),
  // The API sends 1 or 2 names; show them on one line, e.g. "NIOC, Total".
  columnHelper.accessor("operators", {
    header: centeredHeader("Operators"),
    cell: ({ getValue }) => centeredCell(getValue().join(", ")),
  }),
  columnHelper.accessor("contractors", {
    header: centeredHeader("Contractors"),
    cell: ({ getValue }) => centeredCell(getValue().join(", ")),
  }),
  columnHelper.accessor("currencyCode", {
    header: centeredHeader("Currency"),
    cell: ({ getValue }) => centeredCell(getValue()),
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Actions</div>,
    cell: ({ row }) => <ProjectActions project={row.original} />,
  }),
]);
