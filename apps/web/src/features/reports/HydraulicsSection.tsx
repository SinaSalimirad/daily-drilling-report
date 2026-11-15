'use client';

import type { Hydraulics } from '@ddr/schemas';
import { Quantity } from '@/components/Quantity';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatNumber } from '@/lib/format';

/** Hydraulics and hole cleaning of the report: per-segment tables, bit, totals, ECD. */
export function HydraulicsSection({
  hydraulics,
  mode,
  onMode,
}: {
  hydraulics: Hydraulics;
  mode: 'virtual' | 'actual';
  onMode: (mode: 'virtual' | 'actual') => void;
}) {
  const { totals, bit } = hydraulics;
  return (
    <section aria-labelledby="hyd-heading" className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 id="hyd-heading" className="font-semibold text-sm">
          Hydraulics and hole cleaning
        </h2>
        <fieldset className="flex gap-1">
          <legend className="sr-only">Mode</legend>
          {(['virtual', 'actual'] as const).map((m) => (
            <Button
              key={m}
              type="button"
              size="sm"
              variant={mode === m ? 'default' : 'outline'}
              aria-pressed={mode === m}
              onClick={() => onMode(m)}
            >
              {m === 'virtual' ? 'Virtual' : 'Actual (scaled to SPP)'}
            </Button>
          ))}
        </fieldset>
      </div>

      {hydraulics.missing.length > 0 ? (
        <div className="rounded-lg border p-3 text-sm">
          <p className="mb-1 font-medium">Not enough data yet. Still needed:</p>
          <ul className="list-disc pl-5">
            {hydraulics.missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Interval</TableHead>
                <TableHead className="text-right">Length</TableHead>
                <TableHead className="text-right">Velocity (m/s)</TableHead>
                <TableHead className="text-right">Pressure loss</TableHead>
                <TableHead>Regime</TableHead>
                <TableHead>Hole cleaning</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hydraulics.pipe.map((p) => (
                <TableRow key={`pipe-${p.name}`}>
                  <TableCell>{p.name} (inside)</TableCell>
                  <TableCell className="text-right">
                    <Quantity quantity="depth" si={p.length} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(p.velocity, 2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Quantity quantity="pressure" si={p.pressureLoss} />
                  </TableCell>
                  <TableCell>{p.regime}</TableCell>
                  <TableCell>—</TableCell>
                </TableRow>
              ))}
              {hydraulics.annulus.map((a) => (
                <TableRow key={`ann-${a.name}-${a.length}`}>
                  <TableCell>{a.name}</TableCell>
                  <TableCell className="text-right">
                    <Quantity quantity="depth" si={a.length} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(a.velocity, 2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Quantity quantity="pressure" si={a.pressureLoss} />
                  </TableCell>
                  <TableCell>{a.regime}</TableCell>
                  <TableCell>
                    {a.cleaning
                      ? `${a.cleaning.verdict} (${formatNumber(a.cleaning.index, 2)})`
                      : 'needs ROP and particle size'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <dl className="grid max-w-md grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Pipe</dt>
            <dd className="text-right">
              <Quantity quantity="pressure" si={totals.pipe} />
            </dd>
            <dt className="text-muted-foreground">Annulus</dt>
            <dd className="text-right">
              <Quantity quantity="pressure" si={totals.annulus} />
            </dd>
            <dt className="text-muted-foreground">Bit</dt>
            <dd className="text-right">
              <Quantity quantity="pressure" si={totals.bit} />
            </dd>
            <dt className="text-muted-foreground">Motor and tools</dt>
            <dd className="text-right">
              <Quantity quantity="pressure" si={totals.tools} />
            </dd>
            <dt className="font-medium">Total</dt>
            <dd className="text-right font-medium">
              <Quantity quantity="pressure" si={totals.total} />
            </dd>
            <dt className="text-muted-foreground">Measured SPP</dt>
            <dd className="text-right">
              <Quantity quantity="pressure" si={totals.measured} />
            </dd>
            <dt className="text-muted-foreground">ECD at TD</dt>
            <dd className="text-right">
              <Quantity quantity="density" si={hydraulics.ecd} />
            </dd>
            <dt className="text-muted-foreground">Bit HHP / HSI</dt>
            <dd className="text-right tabular-nums">
              {formatNumber(bit?.hhp, 1)} / {formatNumber(bit?.hsi, 2)}
            </dd>
            <dt className="text-muted-foreground">Jet velocity, impact force</dt>
            <dd className="text-right tabular-nums">
              {formatNumber(bit?.jetVelocity, 1)} m/s, {formatNumber(bit?.impactForce, 0)} lbf
            </dd>
            <dt className="text-muted-foreground">System horsepower</dt>
            <dd className="text-right tabular-nums">
              {formatNumber(hydraulics.systemHorsepower, 1)}
            </dd>
          </dl>
        </>
      )}
    </section>
  );
}
