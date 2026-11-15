'use client';

import { PIT_TYPES, type Pit, type PitReadings, pitReadingsPutSchema } from '@ddr/schemas';
import { useState } from 'react';
import { toast } from 'sonner';
import { NativeSelect } from '@/components/NativeSelect';
import { Quantity } from '@/components/Quantity';
import { QuantityInput } from '@/components/QuantityInput';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError } from '@/lib/api-error';
import { type FieldErrors, issuesToFieldErrors, toastError } from '@/lib/form-errors';
import { enumLabel } from '@/lib/labels';
import { totalsOf } from './pit-totals';
import { useReplacePitReadings } from './use-reports';

type Lookup = { id: string; name: string };
type RowDraft = {
  pitType: string;
  volume: number | null;
  mudWeight: number | null;
  mudTypeId: string;
};

const blank = (): RowDraft => ({ pitType: 'active', volume: null, mudWeight: null, mudTypeId: '' });

/**
 * Daily status of every pit of the project: a row with a volume is a reading, an empty
 * row is not sent. A new report starts with the previous day's values (carry-over, API).
 */
export function PitReadingsSection({
  reportId,
  pits,
  readings,
  mudTypes,
}: {
  reportId: string;
  pits: Pit[];
  readings: PitReadings;
  mudTypes: Lookup[];
}) {
  const replace = useReplacePitReadings(reportId);
  const initial = () =>
    Object.fromEntries(
      pits.map((pit) => {
        const reading = readings.readings.find((r) => r.pitId === pit.id);
        const row: RowDraft = reading
          ? {
              pitType: reading.pitType,
              volume: reading.volume,
              mudWeight: reading.mudWeight,
              mudTypeId: reading.mudTypeId ?? '',
            }
          : blank();
        return [pit.id, row];
      }),
    );
  const [rows, setRows] = useState<Record<string, RowDraft>>(initial);
  const [errors, setErrors] = useState<Record<string, FieldErrors>>({});
  const [saving, setSaving] = useState(false);

  const change = (pitId: string, patch: Partial<RowDraft>) => {
    setRows((current) => ({ ...current, [pitId]: { ...(current[pitId] ?? blank()), ...patch } }));
    setErrors(({ [pitId]: _gone, ...rest }) => rest);
  };

  const payload = () => ({
    readings: pits.flatMap((pit) => {
      const row = rows[pit.id];
      if (!row || row.volume === null) return [];
      return [
        {
          pitId: pit.id,
          pitType: row.pitType,
          volume: row.volume,
          mudWeight: row.mudWeight,
          mudTypeId: row.mudTypeId === '' ? null : row.mudTypeId,
        },
      ];
    }),
  });

  const save = async () => {
    const parsed = pitReadingsPutSchema.safeParse(payload());
    if (!parsed.success) {
      // Zod paths point at the nth reading; map them back to the pit of that reading.
      const sent = payload().readings;
      const next: Record<string, FieldErrors> = {};
      for (const [path, message] of Object.entries(issuesToFieldErrors(parsed.error.issues))) {
        const [, index, field] = path.split('.');
        const pitId = sent[Number(index)]?.pitId;
        if (pitId) next[pitId] = { ...next[pitId], [field ?? 'volume']: message };
      }
      return setErrors(next);
    }
    setSaving(true);
    try {
      await replace.mutateAsync(parsed.data);
      setErrors({});
      toast.success('Pit readings saved');
    } catch (error) {
      const details = error instanceof ApiError ? (error.details as { pitId?: string }) : undefined;
      if (error instanceof ApiError && details?.pitId) {
        const field = error.code === 'MUD_WEIGHT_OUT_OF_RANGE' ? 'mudWeight' : 'volume';
        setErrors({ [details.pitId]: { [field]: error.message } });
      } else if (error instanceof ApiError && error.fieldIssues.length > 0) {
        const sent = payload().readings;
        const next: Record<string, FieldErrors> = {};
        for (const issue of error.fieldIssues) {
          const [, , index, field] = issue.path.split('.');
          const pitId = sent[Number(index)]?.pitId;
          if (pitId) next[pitId] = { ...next[pitId], [field ?? 'pitId']: issue.message };
        }
        setErrors(next);
      } else toastError(error);
    } finally {
      setSaving(false);
    }
  };

  const totals = totalsOf(Object.values(rows));

  return (
    <section aria-labelledby="pits-heading" className="flex flex-col gap-3">
      <h2 id="pits-heading" className="font-semibold text-sm">
        Pit readings
      </h2>
      {pits.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          The project has no pits yet. Add them on the rig equipment page.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pit</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Volume</TableHead>
              <TableHead>Mud weight</TableHead>
              <TableHead>Mud type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pits.map((pit) => {
              const row = rows[pit.id] ?? blank();
              const rowErrors = errors[pit.id] ?? {};
              return (
                <TableRow key={pit.id}>
                  <TableCell className="align-top font-medium">{pit.name}</TableCell>
                  <TableCell className="align-top">
                    <Quantity quantity="volume" si={pit.capacity} />
                  </TableCell>
                  <TableCell className="align-top">
                    <NativeSelect
                      aria-label={`Type of ${pit.name}`}
                      value={row.pitType}
                      onChange={(e) => change(pit.id, { pitType: e.target.value })}
                    >
                      {PIT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {enumLabel(t)}
                        </option>
                      ))}
                    </NativeSelect>
                  </TableCell>
                  <TableCell className="align-top">
                    <QuantityInput
                      aria-label={`Volume of ${pit.name}`}
                      aria-invalid={Boolean(rowErrors.volume)}
                      quantity="volume"
                      value={row.volume}
                      onChange={(si) => change(pit.id, { volume: si })}
                    />
                    {rowErrors.volume ? (
                      <p role="alert" className="mt-1 text-destructive text-xs">
                        {rowErrors.volume}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top">
                    <QuantityInput
                      aria-label={`Mud weight of ${pit.name}`}
                      aria-invalid={Boolean(rowErrors.mudWeight)}
                      quantity="density"
                      value={row.mudWeight}
                      onChange={(si) => change(pit.id, { mudWeight: si })}
                    />
                    {rowErrors.mudWeight ? (
                      <p role="alert" className="mt-1 text-destructive text-xs">
                        {rowErrors.mudWeight}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top">
                    <NativeSelect
                      aria-label={`Mud type of ${pit.name}`}
                      aria-invalid={Boolean(rowErrors.mudTypeId)}
                      value={row.mudTypeId}
                      onChange={(e) => change(pit.id, { mudTypeId: e.target.value })}
                    >
                      <option value="">—</option>
                      {mudTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm" aria-label="Totals by pit type">
        {PIT_TYPES.map((type) => (
          <div key={type} className="flex gap-1.5">
            <dt className="text-muted-foreground">{enumLabel(type)}:</dt>
            <dd>
              <Quantity quantity="volume" si={totals[type]} />
            </dd>
          </div>
        ))}
      </dl>
      <Button
        type="button"
        className="self-start"
        disabled={saving || pits.length === 0}
        onClick={save}
      >
        {saving ? 'Saving…' : 'Save pit readings'}
      </Button>
    </section>
  );
}
