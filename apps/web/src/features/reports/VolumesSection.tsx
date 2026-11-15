'use client';

import {
  type Pump,
  type PumpReadings,
  VOLUME_ITEMS,
  VOLUME_LOSS_ITEMS,
  type VolumeItem,
  type VolumesResult,
} from '@ddr/schemas';
import { useState } from 'react';
import { toast } from 'sonner';
import { Quantity } from '@/components/Quantity';
import { QuantityInput } from '@/components/QuantityInput';
import { useUnitSystem } from '@/components/UnitSystemProvider';
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
import { toastError } from '@/lib/form-errors';
import { formatNumber, formatQuantity } from '@/lib/format';
import { useReplacePumpReadings, useReplaceVolumes } from './use-reports';

const ITEM_LABELS: Record<VolumeItem, string> = {
  water: 'Water added',
  diesel: 'Diesel added',
  received: 'Received',
  return: 'Return',
  dumped: 'Dumped',
  shakers: 'Shakers',
  evaporation: 'Evaporation',
  super_clone: 'Super Clone',
  trip_loss: 'Trip loss',
  desander_desilter: 'Desander & desilter',
  pit_cleaning: 'Pit cleaning',
  other: 'Other',
  formation: 'Formation',
  left_in_hole: 'Left in hole',
};

/** Pump readings, volume entries, the mud-volume block and the accounting table of the day. */
export function VolumesSection({
  reportId,
  volumes,
  pumps,
  pumpReadings,
}: {
  reportId: string;
  volumes: VolumesResult;
  pumps: Pump[];
  pumpReadings: PumpReadings;
}) {
  const system = useUnitSystem();
  const replaceEntries = useReplaceVolumes(reportId);
  const replacePumps = useReplacePumpReadings(reportId);
  const [entries, setEntries] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(VOLUME_ITEMS.map((item) => [item, volumes.entries[item] || null])),
  );
  const [spm, setSpm] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      pumps.map((pump) => [
        pump.id,
        String(pumpReadings.readings.find((r) => r.pumpId === pump.id)?.spm ?? ''),
      ]),
    ),
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await replacePumps.mutateAsync({
        readings: pumps.flatMap((pump) => {
          const value = Number((spm[pump.id] ?? '').replace(',', '.'));
          return spm[pump.id]?.trim() && !Number.isNaN(value)
            ? [{ pumpId: pump.id, spm: value }]
            : [];
        }),
      });
      await replaceEntries.mutateAsync({
        entries: Object.fromEntries(
          VOLUME_ITEMS.flatMap((item) => {
            const value = entries[item];
            return value ? [[item, value]] : [];
          }),
        ),
      });
      toast.success('Volumes saved');
    } catch (error) {
      toastError(error);
    } finally {
      setSaving(false);
    }
  };

  const { block, accounting } = volumes;
  const blockRows: [string, number | null][] = [
    ['Hole', block.hole],
    ['String', block.string],
    ['Annulus', block.annulus],
    ['Below bit', block.belowBit],
    ['Active', block.active],
    ['Reserve', block.reserve],
    ['Total circulating', block.totalCirculating],
  ];
  const columns = [
    ['Daily', accounting.daily],
    ['Section', accounting.section],
    ['Well', accounting.well],
  ] as const;
  const lines: [string, (c: typeof accounting.daily) => number][] = [
    ['Start volume', (c) => c.start],
    ['Water added', (c) => c.water],
    ['Chemical vol.', (c) => c.chemical],
    ['Diesel added', (c) => c.diesel],
    ['Received', (c) => c.received],
    ['Return', (c) => c.returned],
    ['Built', (c) => c.built],
    ...VOLUME_LOSS_ITEMS.map((item): [string, (c: typeof accounting.daily) => number] => [
      ITEM_LABELS[item],
      (c) => c.losses[item],
    ]),
    ['Total losses', (c) => c.totalLosses],
    ['End volume', (c) => c.end],
  ];

  return (
    <section aria-labelledby="volumes-heading" className="flex flex-col gap-6">
      <h2 id="volumes-heading" className="font-semibold text-sm">
        Volumes
      </h2>

      <div className="flex flex-col gap-3">
        <h3 className="font-medium text-sm">Pumps (strokes per minute)</h3>
        {pumps.length === 0 ? (
          <p className="text-muted-foreground text-sm">The project has no pumps yet.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {pumps.map((pump) => (
              <div key={pump.id} className="flex flex-col gap-1 text-sm">
                <span>
                  {pump.model} ({formatQuantity(pump.outputPerStroke, 'volume', system)}/stroke)
                </span>
                <Input
                  className="w-28"
                  inputMode="decimal"
                  aria-label={`SPM of ${pump.model}`}
                  value={spm[pump.id] ?? ''}
                  onChange={(e) => setSpm((c) => ({ ...c, [pump.id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-medium text-sm">Volume entries of the day</h3>
        <div className="grid max-w-4xl gap-3 sm:grid-cols-2 md:grid-cols-3">
          {VOLUME_ITEMS.map((item) => (
            <div key={item} className="flex flex-col gap-1 text-sm">
              <span>{ITEM_LABELS[item]}</span>
              <QuantityInput
                aria-label={ITEM_LABELS[item]}
                quantity="volume"
                value={entries[item] ?? null}
                onChange={(si) => setEntries((c) => ({ ...c, [item]: si }))}
              />
            </div>
          ))}
        </div>
        <Button type="button" className="self-start" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save volumes'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="font-medium text-sm">Mud volume</h3>
          <dl className="grid max-w-sm grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {blockRows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right">
                  <Quantity quantity="volume" si={value} />
                </dd>
              </div>
            ))}
            <dt className="text-muted-foreground">Flow rate</dt>
            <dd className="text-right">
              <Quantity quantity="flowRate" si={block.flowRate} />
            </dd>
            <dt className="text-muted-foreground">Bottoms-up</dt>
            <dd className="text-right tabular-nums">
              {block.bottomsUpMinutes === null
                ? '—'
                : `${formatNumber(block.bottomsUpMinutes, 0)} min / ${formatNumber(block.bottomsUpStrokes, 0)} strokes`}
            </dd>
            <dt className="text-muted-foreground">Total circulation</dt>
            <dd className="text-right tabular-nums">
              {block.circulationMinutes === null
                ? '—'
                : `${formatNumber(block.circulationMinutes, 0)} min`}
            </dd>
            <dt className="text-muted-foreground">Drilled today</dt>
            <dd className="text-right tabular-nums">
              <Quantity quantity="depth" si={block.dailyDrilled} /> ·{' '}
              <Quantity quantity="volume" si={block.drilledVolume} />
            </dd>
            <dt className="text-muted-foreground">Books vs hole</dt>
            <dd
              className={`text-right ${Math.abs(volumes.balance) > 1e-9 ? 'font-medium text-destructive' : ''}`}
            >
              <Quantity quantity="volume" si={volumes.balance} />
            </dd>
          </dl>
        </div>

        <div>
          <h3 className="mb-2 font-medium text-sm">Mud volume accounting</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                {columns.map(([label]) => (
                  <TableHead key={label} className="text-right">
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map(([label, pick]) => (
                <TableRow key={label}>
                  <TableCell>{label}</TableCell>
                  {columns.map(([name, column]) => (
                    <TableCell key={name} className="text-right">
                      <Quantity quantity="volume" si={pick(column)} withUnit={false} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}
