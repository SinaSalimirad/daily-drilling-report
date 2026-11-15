'use client';

import { MAX_SAMPLES, type SamplesResult, type Section, samplesPutSchema } from '@ddr/schemas';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormField } from '@/components/FormField';
import { NativeSelect } from '@/components/NativeSelect';
import { Quantity } from '@/components/Quantity';
import { QuantityInput } from '@/components/QuantityInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toastError } from '@/lib/form-errors';
import { formatNumber } from '@/lib/format';
import {
  blankSample,
  draftOf,
  PLAIN_FIELDS,
  type PlainField,
  payloadOf,
  QUANTITY_FIELDS,
  type QuantityField,
  type SampleDraft,
  WBM_EXTRAS,
} from './sample-draft';
import { useReplaceSamples } from './use-reports';

const PLAIN_LABELS: Record<PlainField, string> = {
  funnelViscosity: 'Funnel viscosity (s/qt)',
  r600: 'R600',
  r300: 'R300',
  r200: 'R200',
  r100: 'R100',
  r6: 'R6',
  r3: 'R3',
  apiFluidLoss: 'API fluid loss (mL/30 min)',
  oil: 'Oil (%vol)',
  water: 'Water (%vol)',
  solids: 'Solids (%vol)',
  sand: 'Sand (%vol)',
};

const QUANTITY_META: Record<
  QuantityField,
  { label: string; quantity: Parameters<typeof QuantityInput>[0]['quantity'] }
> = {
  mudWeight: { label: 'Mud weight', quantity: 'density' },
  gel10s: { label: 'Gel 10 s', quantity: 'yieldStress' },
  gel10m: { label: 'Gel 10 min', quantity: 'yieldStress' },
  gel30m: { label: 'Gel 30 min', quantity: 'yieldStress' },
  mbt: { label: 'MBT', quantity: 'concentration' },
  chlorides: { label: 'Chlorides', quantity: 'chlorides' },
};

/** Mud samples of the day with the derived PV / YP, the results of the latest sample and the plan. */
export function SamplesSection({
  reportId,
  result,
  section,
  sources,
}: {
  reportId: string;
  result: SamplesResult;
  section: Section;
  sources: { id: string; name: string }[];
}) {
  const replace = useReplaceSamples(reportId);
  const [drafts, setDrafts] = useState<SampleDraft[]>(() => result.samples.map(draftOf));
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const update = (index: number, change: (d: SampleDraft) => SampleDraft) =>
    setDrafts((current) => current.map((d, i) => (i === index ? change(d) : d)));

  const save = async () => {
    const parsed = samplesPutSchema.safeParse({ samples: drafts.map(payloadOf) });
    if (!parsed.success) {
      return setErrors(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
    }
    setSaving(true);
    try {
      await replace.mutateAsync(parsed.data);
      setErrors([]);
      toast.success('Samples saved');
    } catch (error) {
      toastError(error);
    } finally {
      setSaving(false);
    }
  };

  const { latest, plan } = result;
  const extras = section.fluidType === 'obm' ? [] : WBM_EXTRAS;

  return (
    <section aria-labelledby="samples-heading" className="flex flex-col gap-4">
      <h2 id="samples-heading" className="font-semibold text-sm">
        Mud samples
      </h2>
      <div className="grid gap-4 lg:grid-cols-3">
        {drafts.map((draft, index) => {
          const sample = result.samples[index];
          return (
            <fieldset key={draft.key} className="flex flex-col gap-2 rounded-lg border p-3">
              <legend className="px-1 font-medium text-sm">Sample {index + 1}</legend>
              <FormField id={`s${index}-time`} label="Time (HH:MM)">
                <Input
                  id={`s${index}-time`}
                  value={draft.sampleTime}
                  onChange={(e) => update(index, (d) => ({ ...d, sampleTime: e.target.value }))}
                />
              </FormField>
              <FormField id={`s${index}-source`} label="Sample from">
                <NativeSelect
                  id={`s${index}-source`}
                  value={draft.sampleSourceId}
                  onChange={(e) => update(index, (d) => ({ ...d, sampleSourceId: e.target.value }))}
                >
                  <option value="">—</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
              {QUANTITY_FIELDS.map((field) => (
                <FormField key={field} id={`s${index}-${field}`} label={QUANTITY_META[field].label}>
                  <QuantityInput
                    id={`s${index}-${field}`}
                    quantity={QUANTITY_META[field].quantity}
                    value={draft.quantities[field]}
                    onChange={(si) =>
                      update(index, (d) => ({ ...d, quantities: { ...d.quantities, [field]: si } }))
                    }
                  />
                </FormField>
              ))}
              {PLAIN_FIELDS.map((field) => (
                <FormField key={field} id={`s${index}-${field}`} label={PLAIN_LABELS[field]}>
                  <Input
                    id={`s${index}-${field}`}
                    inputMode="decimal"
                    value={draft.plain[field]}
                    onChange={(e) =>
                      update(index, (d) => ({
                        ...d,
                        plain: { ...d.plain, [field]: e.target.value },
                      }))
                    }
                  />
                </FormField>
              ))}
              {extras.map((name) => (
                <FormField key={name} id={`s${index}-x-${name}`} label={name}>
                  <Input
                    id={`s${index}-x-${name}`}
                    value={draft.extras[name] ?? ''}
                    onChange={(e) =>
                      update(index, (d) => ({
                        ...d,
                        extras: { ...d.extras, [name]: e.target.value },
                      }))
                    }
                  />
                </FormField>
              ))}
              <p className="text-sm">
                PV <Quantity quantity="plasticViscosity" si={sample?.plasticViscosity} /> · YP{' '}
                <Quantity quantity="yieldStress" si={sample?.yieldPoint} />
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDrafts((c) => c.filter((_, i) => i !== index))}
              >
                Remove sample
              </Button>
            </fieldset>
          );
        })}
      </div>
      {errors.map((message) => (
        <p key={message} role="alert" className="text-destructive text-xs">
          {message}
        </p>
      ))}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={drafts.length >= MAX_SAMPLES}
          onClick={() => setDrafts((c) => [...c, blankSample(crypto.randomUUID())])}
        >
          Add sample
        </Button>
        <Button type="button" disabled={saving} onClick={save}>
          {saving ? 'Saving…' : 'Save samples'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 font-medium text-sm">
            Results of the latest sample{latest ? ` (${latest.seq})` : ''}
          </h3>
          <dl className="grid max-w-sm grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">n, K (pipe)</dt>
            <dd className="text-right tabular-nums">
              {latest?.pipe
                ? `${formatNumber(latest.pipe.n, 3)}, ${formatNumber(latest.pipe.k, 3)}`
                : '—'}
            </dd>
            <dt className="text-muted-foreground">n, K (annulus)</dt>
            <dd className="text-right tabular-nums">
              {latest?.annulus
                ? `${formatNumber(latest.annulus.n, 3)}, ${formatNumber(latest.annulus.k, 3)}`
                : '—'}
            </dd>
            <dt className="text-muted-foreground">Brine S.G.</dt>
            <dd className="text-right tabular-nums">{formatNumber(latest?.brineDensity, 3)}</dd>
            <dt className="text-muted-foreground">NaCl (%wt)</dt>
            <dd className="text-right tabular-nums">{formatNumber(latest?.naclPercent, 2)}</dd>
          </dl>
        </div>
        <div>
          <h3 className="mb-2 font-medium text-sm">Plan against actual</h3>
          <dl className="grid max-w-sm grid-cols-3 gap-x-4 gap-y-1 text-sm">
            <dt />
            <dd className="text-right text-muted-foreground">Planned</dd>
            <dd className="text-right text-muted-foreground">Actual</dd>
            <dt className="text-muted-foreground">Mud weight</dt>
            <dd className="text-right">
              <Quantity quantity="density" si={plan.planned.mudWeight} />
            </dd>
            <dd className="text-right">
              <Quantity quantity="density" si={plan.actual.mudWeight} />
            </dd>
            <dt className="text-muted-foreground">Yield point</dt>
            <dd className="text-right">
              <Quantity quantity="yieldStress" si={plan.planned.yieldPoint} />
            </dd>
            <dd className="text-right">
              <Quantity quantity="yieldStress" si={plan.actual.yieldPoint} />
            </dd>
            <dt className="text-muted-foreground">Fluid loss</dt>
            <dd className="text-right tabular-nums">{formatNumber(plan.planned.fluidLoss, 1)}</dd>
            <dd className="text-right tabular-nums">{formatNumber(plan.actual.fluidLoss, 1)}</dd>
          </dl>
        </div>
      </div>
    </section>
  );
}
