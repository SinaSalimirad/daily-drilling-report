'use client';

import type { Inventory } from '@ddr/schemas';
import { useState } from 'react';
import { toast } from 'sonner';
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
import { ApiError } from '@/lib/api-error';
import { toastError } from '@/lib/form-errors';
import { formatNumber } from '@/lib/format';
import { type MoveDraft, movesOf, previewStock, toDraft } from './inventory-moves';
import { useReplaceInventory } from './use-reports';

const money = (value: number, currency: string) => `${formatNumber(value, 2)} ${currency}`;

/**
 * Chemical inventory of the day (workbook `Chem Inv.`): received and used packages per
 * product, final stock, cost of the day, section, month and well, the products used in
 * the last 24 h and the key-stock box.
 */
export function InventorySection({
  reportId,
  inventory,
  currency,
}: {
  reportId: string;
  inventory: Inventory;
  currency: string;
}) {
  const replace = useReplaceInventory(reportId);
  const [drafts, setDrafts] = useState<Record<string, MoveDraft>>(() =>
    Object.fromEntries(inventory.rows.map((row) => [row.projectProductId, toDraft(row)])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const change = (id: string, patch: Partial<MoveDraft>) => {
    setDrafts((current) => ({
      ...current,
      [id]: { received: '', used: '', ...current[id], ...patch },
    }));
    setErrors(({ [id]: _gone, ...rest }) => rest);
  };

  const save = async () => {
    const moves = movesOf(drafts);
    const bad = moves.find((m) => Number.isNaN(m.received) || Number.isNaN(m.used));
    if (bad) return setErrors({ [bad.projectProductId]: 'Enter a number' });
    const negativeUse = moves.find((m) => m.used < 0);
    if (negativeUse)
      return setErrors({ [negativeUse.projectProductId]: 'Used cannot be negative' });
    setSaving(true);
    try {
      await replace.mutateAsync({ moves });
      setErrors({});
      toast.success('Inventory saved');
    } catch (error) {
      if (error instanceof ApiError && error.fieldIssues.length > 0) {
        const next: Record<string, string> = {};
        for (const issue of error.fieldIssues) {
          const index = Number(issue.path.split('.')[2]);
          const id = moves[index]?.projectProductId;
          if (id) next[id] = issue.message;
        }
        setErrors(next);
      } else toastError(error);
    } finally {
      setSaving(false);
    }
  };

  const { rows, costs } = inventory;
  const used = rows.filter((row) => row.used > 0);
  const keyStock = rows.filter((row) => row.keyStock);

  return (
    <section aria-labelledby="inventory-heading" className="flex flex-col gap-4">
      <h2 id="inventory-heading" className="font-semibold text-sm">
        Chemical inventory
      </h2>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          The price list of the project is empty. Add products on the price list page.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Package</TableHead>
              <TableHead className="text-right">Initial</TableHead>
              <TableHead className="w-28">Received</TableHead>
              <TableHead className="w-28">Used</TableHead>
              <TableHead className="text-right">Final stock</TableHead>
              <TableHead className="text-right">Cost today</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const draft = drafts[row.projectProductId] ?? { received: '', used: '' };
              const stock = previewStock(row, draft);
              const error = errors[row.projectProductId];
              return (
                <TableRow key={row.projectProductId}>
                  <TableCell className="align-top font-medium">{row.name}</TableCell>
                  <TableCell className="align-top">
                    {formatNumber(row.packageSize, 3)} {row.packageUnit}
                  </TableCell>
                  <TableCell className="text-right align-top tabular-nums">
                    {formatNumber(row.initial, 3)}
                  </TableCell>
                  <TableCell className="align-top">
                    <Input
                      aria-label={`Received ${row.name}`}
                      inputMode="decimal"
                      aria-invalid={Boolean(error)}
                      value={draft.received}
                      onChange={(e) => change(row.projectProductId, { received: e.target.value })}
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <Input
                      aria-label={`Used ${row.name}`}
                      inputMode="decimal"
                      aria-invalid={Boolean(error)}
                      value={draft.used}
                      onChange={(e) => change(row.projectProductId, { used: e.target.value })}
                    />
                    {error ? (
                      <p role="alert" className="mt-1 text-destructive text-xs">
                        {error}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell
                    className={`text-right align-top tabular-nums ${stock < 0 ? 'font-medium text-destructive' : ''}`}
                  >
                    {formatNumber(stock, 3)}
                  </TableCell>
                  <TableCell className="text-right align-top tabular-nums">
                    {money(row.dailyCost, currency)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <Button
        type="button"
        className="self-start"
        disabled={saving || rows.length === 0}
        onClick={save}
      >
        {saving ? 'Saving…' : 'Save inventory'}
      </Button>

      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <h3 className="mb-2 font-medium text-sm">Cost</h3>
          <dl className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-1 text-sm">
            <dt />
            <dd className="text-right text-muted-foreground">Total</dd>
            <dd className="text-right text-muted-foreground">Local</dd>
            {(
              [
                ['Today', costs.daily],
                ['Section', costs.section],
                ['Month', costs.monthly],
                ['Well', costs.cumulative],
              ] as const
            ).map(([label, cost]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right tabular-nums">{money(cost.total, currency)}</dd>
                <dd className="text-right tabular-nums">{money(cost.local, currency)}</dd>
              </div>
            ))}
            <dt className="text-muted-foreground">Stock value</dt>
            <dd className="col-span-2 text-right tabular-nums">
              {money(inventory.stockValue, currency)}
            </dd>
          </dl>
        </div>
        <div>
          <h3 className="mb-2 font-medium text-sm">Products used last 24 h</h3>
          {used.length === 0 ? (
            <p className="text-muted-foreground text-sm">None.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {used.map((row) => (
                <li key={row.projectProductId} className="flex justify-between gap-4">
                  <span>{row.name}</span>
                  <span className="tabular-nums">
                    {formatNumber(row.used, 3)} · stock {formatNumber(row.finalStock, 3)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-2 font-medium text-sm">Key stock</h3>
          {keyStock.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Mark up to five products as key stock on the price list.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {keyStock.map((row) => (
                <li key={row.projectProductId} className="flex justify-between gap-4">
                  <span>{row.name}</span>
                  <span className="tabular-nums">{formatNumber(row.finalStock, 3)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
