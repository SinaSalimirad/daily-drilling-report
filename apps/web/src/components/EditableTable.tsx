'use client';

import type { Quantity } from '@ddr/schemas';
import { type ReactNode, useState } from 'react';
import type { z } from 'zod';
import { NativeSelect } from '@/components/NativeSelect';
import { QuantityInput } from '@/components/QuantityInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  type FieldErrors,
  issuesToFieldErrors,
  serverFieldErrors,
  toastError,
} from '@/lib/form-errors';
import { cn } from '@/lib/utils';

// An editable grid for small fixed collections (pits, pumps, SCE units): every row is
// edited in place and saved on its own; an empty row at the bottom adds a new entry.
// Values are validated with the shared create schema before they are sent, and server
// errors land on their cell (docs/05).

export type FieldDef =
  | { key: string; label: string; kind: 'text'; required?: boolean; width?: string }
  | { key: string; label: string; kind: 'int'; width?: string }
  | { key: string; label: string; kind: 'number'; suffix?: string; width?: string }
  | { key: string; label: string; kind: 'quantity'; quantity: Quantity; width?: string }
  | {
      key: string;
      label: string;
      kind: 'select';
      options: readonly { value: string; label: string }[];
      width?: string;
    };

/** Draft values: text and numbers as typed text, quantities as SI numbers (or null). */
export type Draft = Record<string, string | number | null>;

type Props<Row extends { id: string }> = {
  fields: FieldDef[];
  rows: Row[];
  /** Empty draft for the "add" row. */
  blank: Draft;
  toDraft: (row: Row) => Draft;
  /** Draft → request body (empty text → null, typed numbers → numbers). */
  toPayload: (draft: Draft) => Record<string, unknown>;
  schema: z.ZodType;
  conflicts?: Record<string, { field: string; message: string }>;
  onCreate: (payload: never) => Promise<unknown>;
  onUpdate: (id: string, payload: never) => Promise<unknown>;
  onDelete: (row: Row) => Promise<unknown>;
  /** Extra read-only cell after the fields, e.g. a calculated pump output. */
  extra?: { label: string; cell: (row: Row) => ReactNode };
  rowLabel: (row: Row) => string;
  idPrefix: string;
};

export function EditableTable<Row extends { id: string }>(props: Props<Row>) {
  const { fields, rows, extra } = props;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {fields.map((f) => (
            <TableHead key={f.key} className={f.width}>
              {f.label}
            </TableHead>
          ))}
          {extra ? <TableHead>{extra.label}</TableHead> : null}
          <TableHead className="w-40" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          // The key includes the server values, so a saved (and refetched) row starts clean.
          <EditableRow
            key={`${row.id}:${JSON.stringify(props.toDraft(row))}`}
            {...props}
            row={row}
          />
        ))}
        <EditableRow {...props} row={undefined} />
      </TableBody>
    </Table>
  );
}

function EditableRow<Row extends { id: string }>({
  fields,
  row,
  blank,
  toDraft,
  toPayload,
  schema,
  conflicts,
  onCreate,
  onUpdate,
  onDelete,
  extra,
  rowLabel,
  idPrefix,
}: Props<Row> & { row: Row | undefined }) {
  const initial = row ? toDraft(row) : blank;
  const [draft, setDraft] = useState<Draft>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const dirty = fields.some((f) => draft[f.key] !== initial[f.key]);
  const rowId = row ? row.id : 'new';

  const set = (key: string, value: string | number | null) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors(({ [key]: _gone, ...rest }) => rest);
  };

  const save = async () => {
    const payload = toPayload(draft);
    const parsed = schema.safeParse(payload);
    if (!parsed.success) return setErrors(issuesToFieldErrors(parsed.error.issues));
    setBusy(true);
    try {
      if (row) await onUpdate(row.id, parsed.data as never);
      else {
        await onCreate(parsed.data as never);
        setDraft(blank);
      }
      setErrors({});
    } catch (error) {
      const fieldErrors = serverFieldErrors(error, conflicts);
      if (fieldErrors) setErrors(fieldErrors);
      else toastError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <TableRow className={cn(!row && 'bg-muted/30')}>
      {fields.map((f) => {
        const id = `${idPrefix}-${rowId}-${f.key}`;
        const error = errors[f.key];
        const value = draft[f.key];
        return (
          <TableCell key={f.key} className={cn('align-top', f.width)}>
            {f.kind === 'quantity' ? (
              <QuantityInput
                id={id}
                aria-label={f.label}
                aria-invalid={Boolean(error)}
                quantity={f.quantity}
                value={(value as number | null) ?? null}
                onChange={(si) => set(f.key, si)}
              />
            ) : f.kind === 'select' ? (
              <NativeSelect
                id={id}
                aria-label={f.label}
                aria-invalid={Boolean(error)}
                value={String(value ?? '')}
                onChange={(e) => set(f.key, e.target.value)}
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  id={id}
                  aria-label={f.label}
                  aria-invalid={Boolean(error)}
                  inputMode={f.kind === 'text' ? undefined : 'decimal'}
                  value={String(value ?? '')}
                  onChange={(e) => set(f.key, e.target.value)}
                />
                {f.kind === 'number' && f.suffix ? (
                  <span className="text-muted-foreground text-sm">{f.suffix}</span>
                ) : null}
              </div>
            )}
            {error ? (
              <p role="alert" className="mt-1 text-destructive text-xs">
                {error}
              </p>
            ) : null}
          </TableCell>
        );
      })}
      {extra ? (
        <TableCell className="align-top text-sm tabular-nums">
          {row ? extra.cell(row) : null}
        </TableCell>
      ) : null}
      <TableCell className="align-top">
        <div className="flex gap-2">
          <Button size="sm" disabled={busy || (row !== undefined && !dirty)} onClick={save}>
            {row ? 'Save' : 'Add'}
          </Button>
          {row ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              aria-label={`Delete ${rowLabel(row)}`}
              onClick={async () => {
                setBusy(true);
                try {
                  await onDelete(row);
                } catch (error) {
                  toastError(error);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete
            </Button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}
