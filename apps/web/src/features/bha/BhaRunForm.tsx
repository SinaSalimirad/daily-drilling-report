'use client';

import {
  type BhaRun,
  bhaRunInputSchema,
  MAX_BHA_COMPONENTS,
  MAX_NOZZLE_GROUPS,
} from '@ddr/schemas';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormField } from '@/components/FormField';
import { QuantityInput } from '@/components/QuantityInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api-error';
import {
  type FieldErrors,
  focusFirstError,
  issuesToFieldErrors,
  serverFieldErrors,
  toastError,
} from '@/lib/form-errors';

type ComponentDraft = {
  key: string;
  name: string;
  length: number | null;
  outerDiameter: number | null;
  innerDiameter: number | null;
};
type NozzleDraft = { key: string; size32: string; quantity: string };

const IN2_TO_M2 = 0.0254 ** 2;
const newKey = () => crypto.randomUUID();

/** One drill-string run: bit, nozzles and components (workbook `BHA`). The drill pipe row has no length. */
export function BhaRunForm({
  run,
  onSubmit,
  onDelete,
  submitLabel,
}: {
  run?: BhaRun;
  onSubmit: (input: unknown) => Promise<unknown>;
  onDelete?: () => Promise<unknown>;
  submitLabel: string;
}) {
  const [bitType, setBitType] = useState(run?.bitType ?? '');
  const [manufacturer, setManufacturer] = useState(run?.manufacturer ?? '');
  const [bitSize, setBitSize] = useState<number | null>(run?.bitSize ?? null);
  const [knownTfa, setKnownTfa] = useState(
    run?.knownTfa ? String(Math.round((run.knownTfa / IN2_TO_M2) * 10000) / 10000) : '',
  );
  const [pressureLoss, setPressureLoss] = useState<number | null>(run?.toolPressureLoss ?? null);
  const [nozzles, setNozzles] = useState<NozzleDraft[]>(
    (run?.nozzles ?? []).map((n) => ({
      key: newKey(),
      size32: String(n.size32),
      quantity: String(n.quantity),
    })),
  );
  const [components, setComponents] = useState<ComponentDraft[]>(
    (run?.components ?? [{ name: 'Drill pipe', length: null }]).map((c) => ({
      key: newKey(),
      name: c.name,
      length: c.length,
      outerDiameter: 'outerDiameter' in c ? c.outerDiameter : null,
      innerDiameter: 'innerDiameter' in c ? c.innerDiameter : null,
    })),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const showErrors = (next: FieldErrors) => {
    setErrors(next);
    focusFirstError(next);
  };

  const submit = async () => {
    const tfa = knownTfa.trim() === '' ? null : Number(knownTfa.replace(',', '.')) * IN2_TO_M2;
    const payload = {
      bitType: bitType.trim() === '' ? null : bitType.trim(),
      manufacturer: manufacturer.trim() === '' ? null : manufacturer.trim(),
      bitSize: bitSize ?? undefined,
      knownTfa: tfa,
      toolPressureLoss: pressureLoss,
      nozzles: nozzles
        .filter((n) => n.size32.trim() !== '' || n.quantity.trim() !== '')
        .map((n) => ({ size32: Number(n.size32), quantity: Number(n.quantity) })),
      components: components.map((c, index) => ({
        name: c.name.trim(),
        length: index === 0 ? null : c.length,
        outerDiameter: c.outerDiameter ?? undefined,
        innerDiameter: c.innerDiameter ?? undefined,
      })),
    };
    const parsed = bhaRunInputSchema.safeParse(payload);
    if (!parsed.success) return showErrors(issuesToFieldErrors(parsed.error.issues));
    setSaving(true);
    try {
      await onSubmit(parsed.data);
      setErrors({});
      toast.success('Run saved');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'BHA_TOOL_PRESSURE_REQUIRED') {
        showErrors({ toolPressureLoss: error.message });
      } else {
        const fieldErrors = serverFieldErrors(error);
        if (fieldErrors) showErrors(fieldErrors);
        else toastError(error);
      }
    } finally {
      setSaving(false);
    }
  };

  const updateComponent = (index: number, patch: Partial<ComponentDraft>) =>
    setComponents((current) => current.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  const updateNozzle = (index: number, patch: Partial<NozzleDraft>) =>
    setNozzles((current) => current.map((n, i) => (i === index ? { ...n, ...patch } : n)));

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="grid max-w-4xl gap-4 md:grid-cols-3">
        <FormField id="bitType" label="Bit type" error={errors.bitType}>
          <Input id="bitType" value={bitType} onChange={(e) => setBitType(e.target.value)} />
        </FormField>
        <FormField id="manufacturer" label="Manufactured by" error={errors.manufacturer}>
          <Input
            id="manufacturer"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
          />
        </FormField>
        <FormField id="bitSize" label="Bit size *" error={errors.bitSize}>
          <QuantityInput
            id="bitSize"
            quantity="diameter"
            aria-invalid={Boolean(errors.bitSize)}
            value={bitSize}
            onChange={setBitSize}
          />
        </FormField>
        <FormField id="knownTfa" label="Known TFA (in²)" error={errors.knownTfa} hint="Optional">
          <Input
            id="knownTfa"
            inputMode="decimal"
            value={knownTfa}
            onChange={(e) => setKnownTfa(e.target.value)}
          />
        </FormField>
        <FormField
          id="toolPressureLoss"
          label="Pressure loss of motor and downhole tools"
          error={errors.toolPressureLoss}
        >
          <QuantityInput
            id="toolPressureLoss"
            quantity="pressure"
            aria-invalid={Boolean(errors.toolPressureLoss)}
            value={pressureLoss}
            onChange={setPressureLoss}
          />
        </FormField>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-medium text-sm">Nozzles (size in 32nds, quantity)</legend>
        {nozzles.map((nozzle, index) => (
          <div key={nozzle.key} className="flex max-w-sm items-start gap-2">
            <Input
              aria-label={`Nozzle size ${index + 1}`}
              inputMode="numeric"
              value={nozzle.size32}
              onChange={(e) => updateNozzle(index, { size32: e.target.value })}
            />
            <Input
              aria-label={`Nozzle quantity ${index + 1}`}
              inputMode="numeric"
              value={nozzle.quantity}
              onChange={(e) => updateNozzle(index, { quantity: e.target.value })}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNozzles((c) => c.filter((_, i) => i !== index))}
            >
              Remove
            </Button>
          </div>
        ))}
        {errors.nozzles ? (
          <p role="alert" className="text-destructive text-xs">
            {errors.nozzles}
          </p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={nozzles.length >= MAX_NOZZLE_GROUPS}
          onClick={() => setNozzles((c) => [...c, { key: newKey(), size32: '', quantity: '' }])}
        >
          Add nozzle group
        </Button>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-medium text-sm">
          Components (the first row is the drill pipe; its length follows from the bit depth)
        </legend>
        {components.map((component, index) => (
          <div key={component.key} className="flex flex-wrap items-start gap-2">
            <Input
              aria-label={`Component ${index + 1} name`}
              className="w-48"
              value={component.name}
              onChange={(e) => updateComponent(index, { name: e.target.value })}
            />
            {index === 0 ? (
              <span className="flex h-8 w-40 items-center text-muted-foreground text-sm">
                length: computed
              </span>
            ) : (
              <QuantityInput
                aria-label={`Component ${index + 1} length`}
                className="w-40"
                quantity="depth"
                value={component.length}
                onChange={(si) => updateComponent(index, { length: si })}
              />
            )}
            <QuantityInput
              aria-label={`Component ${index + 1} OD`}
              className="w-40"
              quantity="diameter"
              value={component.outerDiameter}
              onChange={(si) => updateComponent(index, { outerDiameter: si })}
            />
            <QuantityInput
              aria-label={`Component ${index + 1} ID`}
              className="w-40"
              quantity="diameter"
              value={component.innerDiameter}
              onChange={(si) => updateComponent(index, { innerDiameter: si })}
            />
            {index > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setComponents((c) => c.filter((_, i) => i !== index))}
              >
                Remove
              </Button>
            ) : null}
          </div>
        ))}
        {Object.entries(errors)
          .filter(([key]) => key.startsWith('components'))
          .map(([key, message]) => (
            <p key={key} role="alert" className="text-destructive text-xs">
              {key}: {message}
            </p>
          ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={components.length >= MAX_BHA_COMPONENTS}
          onClick={() =>
            setComponents((c) => [
              ...c,
              { key: newKey(), name: '', length: null, outerDiameter: null, innerDiameter: null },
            ])
          }
        >
          Add component
        </Button>
      </fieldset>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </Button>
        {onDelete ? (
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => void onDelete().catch(toastError)}
          >
            Delete run
          </Button>
        ) : null}
      </div>
    </form>
  );
}
