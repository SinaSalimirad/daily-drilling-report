'use client';

import {
  type Report,
  type ReportActivities,
  reportActivitiesPutSchema,
  reportUpdateSchema,
  type Section,
} from '@ddr/schemas';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormField } from '@/components/FormField';
import { NativeSelect } from '@/components/NativeSelect';
import { Quantity } from '@/components/Quantity';
import { QuantityInput } from '@/components/QuantityInput';
import { useUnitSystem } from '@/components/UnitSystemProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api-error';
import {
  type FieldErrors,
  focusFirstError,
  issuesToFieldErrors,
  serverFieldErrors,
  toastError,
} from '@/lib/form-errors';
import { formatNumber, formatQuantity } from '@/lib/format';
import { useReplaceActivities, useUpdateReport } from './use-reports';

type Lookup = { id: string; name: string };
type ActivityDraft = { key: string; activityId: string; hours: string };

type Draft = {
  sectionId: string;
  bhaRunId: string;
  bitDepth: number | null;
  td: number | null;
  tvd: number | null;
  spp: number | null;
  rop: number | null;
  particleDiameter: number | null;
  particleThickness: number | null;
  fluidNotMud: number | null;
  representatives: [string, string];
  engineers: [string, string];
  formation: string;
  drillingRemarks: string;
  fluidRemarks: string;
  activities: ActivityDraft[];
};

const pair = (values: string[]): [string, string] => [values[0] ?? '', values[1] ?? ''];
const nullIfEmpty = (value: string) => (value.trim() === '' ? null : value.trim());
const names = (values: [string, string]) => values.map((v) => v.trim()).filter((v) => v !== '');

function toDraft(report: Report, activities: ReportActivities): Draft {
  return {
    sectionId: report.sectionId,
    bhaRunId: report.bhaRunId ?? '',
    bitDepth: report.bitDepth,
    td: report.td,
    tvd: report.tvd,
    spp: report.spp,
    rop: report.rop,
    particleDiameter: report.particleDiameter,
    particleThickness: report.particleThickness,
    fluidNotMud: report.fluidNotMud,
    representatives: pair(report.representatives),
    engineers: pair(report.engineers),
    formation: report.formation ?? '',
    drillingRemarks: report.drillingRemarks ?? '',
    fluidRemarks: report.fluidRemarks ?? '',
    activities: activities.activities.map((a) => ({
      key: a.id,
      activityId: a.activityId,
      hours: String(a.hours),
    })),
  };
}

const sameNames = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/** Fields of the header form that differ from the saved report. */
function headerChanges(draft: Draft, report: Report) {
  const changes: Record<string, unknown> = {};
  if (draft.sectionId !== report.sectionId) changes.sectionId = draft.sectionId;
  if (draft.bhaRunId !== (report.bhaRunId ?? '')) {
    changes.bhaRunId = draft.bhaRunId === '' ? null : draft.bhaRunId;
  }
  for (const key of [
    'bitDepth',
    'td',
    'tvd',
    'spp',
    'rop',
    'particleDiameter',
    'particleThickness',
    'fluidNotMud',
  ] as const) {
    if (draft[key] !== report[key]) changes[key] = draft[key];
  }
  if (!sameNames(names(draft.representatives), report.representatives)) {
    changes.representatives = names(draft.representatives);
  }
  if (!sameNames(names(draft.engineers), report.engineers)) {
    changes.engineers = names(draft.engineers);
  }
  for (const key of ['formation', 'drillingRemarks', 'fluidRemarks'] as const) {
    if (nullIfEmpty(draft[key]) !== report[key]) changes[key] = nullIfEmpty(draft[key]);
  }
  return changes;
}

const activityPayload = (rows: ActivityDraft[]) =>
  rows.map((row) => ({ activityId: row.activityId, hours: Number(row.hours.replace(',', '.')) }));

/**
 * The first sections of the daily form: header and depths, activities, remarks. One save
 * bar writes the header (at the revision the form was loaded with) and the activities.
 */
export function ReportEditor({
  report,
  activities,
  sections,
  runs,
  lookups,
  onConflict,
}: {
  report: Report;
  activities: ReportActivities;
  sections: Section[];
  /** Drill string runs of the well; the report points at the one in the hole. */
  runs: { id: string; runNo: number; bitType: string | null }[];
  lookups: Lookup[];
  /** Called on REVISION_MISMATCH; the page shows the conflict dialog. */
  onConflict: () => void;
}) {
  const system = useUnitSystem();
  const updateReport = useUpdateReport(report.id);
  const replaceActivities = useReplaceActivities(report.id);
  const [draft, setDraft] = useState<Draft>(() => toDraft(report, activities));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const saved = toDraft(report, activities);
  const header = headerChanges(draft, report);
  const activitiesChanged =
    JSON.stringify(activityPayload(draft.activities)) !==
    JSON.stringify(activityPayload(saved.activities));
  const dirty = Object.keys(header).length > 0 || activitiesChanged;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors(({ [key]: _gone, ...rest }) => rest);
  };
  const setPair = (key: 'representatives' | 'engineers', index: 0 | 1, value: string) => {
    const next: [string, string] = [...draft[key]];
    next[index] = value;
    set(key, next);
  };

  const total = draft.activities.reduce((sum, row) => sum + (Number(row.hours) || 0), 0);

  const save = async () => {
    const failures: FieldErrors = {};
    const headerParsed =
      Object.keys(header).length > 0
        ? reportUpdateSchema.safeParse({ revision: report.revision, ...header })
        : undefined;
    if (headerParsed && !headerParsed.success) {
      Object.assign(failures, issuesToFieldErrors(headerParsed.error.issues));
    }
    const activitiesParsed = activitiesChanged
      ? reportActivitiesPutSchema.safeParse({ activities: activityPayload(draft.activities) })
      : undefined;
    if (activitiesParsed && !activitiesParsed.success) {
      Object.assign(failures, issuesToFieldErrors(activitiesParsed.error.issues));
    }
    if (Object.keys(failures).length > 0) {
      setErrors(failures);
      return focusFirstError(failures);
    }

    setSaving(true);
    try {
      // The header goes first: it raises the revision, and a conflict stops the save here.
      if (headerParsed?.success) await updateReport.mutateAsync(headerParsed.data);
      if (activitiesParsed?.success) await replaceActivities.mutateAsync(activitiesParsed.data);
      setErrors({});
      toast.success('Report saved');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'REVISION_MISMATCH') return onConflict();
      const fieldErrors = serverFieldErrors(error);
      if (fieldErrors) {
        setErrors(fieldErrors);
        focusFirstError(fieldErrors);
      } else toastError(error);
    } finally {
      setSaving(false);
    }
  };

  const depthField = (key: 'bitDepth' | 'td' | 'tvd', label: string) => (
    <FormField id={key} label={label} error={errors[key]}>
      <QuantityInput
        id={key}
        quantity="depth"
        aria-invalid={Boolean(errors[key])}
        value={draft[key]}
        onChange={(si) => set(key, si)}
      />
    </FormField>
  );

  const quantityField = (
    key: 'spp' | 'fluidNotMud' | 'rop' | 'particleDiameter' | 'particleThickness',
    label: string,
    quantity: 'pressure' | 'volume' | 'rop' | 'diameter',
  ) => (
    <FormField id={key} label={label} error={errors[key]}>
      <QuantityInput
        id={key}
        quantity={quantity}
        aria-invalid={Boolean(errors[key])}
        value={draft[key]}
        onChange={(si) => set(key, si)}
      />
    </FormField>
  );

  const textField = (key: 'formation', label: string) => (
    <FormField id={key} label={label} error={errors[key]}>
      <Input
        id={key}
        aria-invalid={Boolean(errors[key])}
        value={draft[key]}
        onChange={(e) => set(key, e.target.value)}
      />
    </FormField>
  );

  const updateActivity = (index: number, patch: Partial<ActivityDraft>) =>
    set(
      'activities',
      draft.activities.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  const moveActivity = (index: number, by: -1 | 1) => {
    const next = [...draft.activities];
    const [row] = next.splice(index, 1);
    if (row) next.splice(index + by, 0, row);
    set('activities', next);
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-8 pb-24"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <section aria-labelledby="header-heading" className="flex flex-col gap-4">
        <h2 id="header-heading" className="font-semibold text-sm">
          Header and depths
        </h2>
        <div className="grid max-w-4xl gap-4 md:grid-cols-3">
          <FormField id="sectionId" label="Section" error={errors.sectionId}>
            <NativeSelect
              id="sectionId"
              value={draft.sectionId}
              onChange={(e) => set('sectionId', e.target.value)}
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sortOrder}. {formatQuantity(s.holeSize, 'diameter', system)} hole
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField id="bhaRunId" label="Drill string (BHA run)" error={errors.bhaRunId}>
            <NativeSelect
              id="bhaRunId"
              value={draft.bhaRunId}
              onChange={(e) => set('bhaRunId', e.target.value)}
            >
              <option value="">— none —</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  Run {r.runNo}
                  {r.bitType ? ` · ${r.bitType}` : ''}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          {depthField('bitDepth', 'Bit depth')}
          {depthField('td', 'Total depth (TD)')}
          {depthField('tvd', 'TVD')}
          {quantityField('spp', 'Standpipe pressure', 'pressure')}
          {quantityField('rop', 'Rate of penetration', 'rop')}
          {quantityField('particleDiameter', 'Cutting diameter', 'diameter')}
          {quantityField('particleThickness', 'Cutting thickness', 'diameter')}
          {quantityField('fluidNotMud', 'Fluid in hole that is not mud', 'volume')}
          <div className="flex flex-col gap-1.5">
            <span className="font-medium text-sm">Drilled today</span>
            <span className="flex h-8 items-center">
              <Quantity quantity="depth" si={report.dailyDrilled} />
            </span>
            <span className="text-muted-foreground text-xs">
              TD minus TD of the previous report; shown after saving.
            </span>
          </div>
          {textField('formation', 'Formation')}
          {([0, 1] as const).map((i) => (
            <FormField
              key={`rep${i}`}
              id={`representatives.${i}`}
              label={`Representative ${i + 1}`}
              error={errors[`representatives.${i}`]}
            >
              <Input
                id={`representatives.${i}`}
                value={draft.representatives[i]}
                onChange={(e) => setPair('representatives', i, e.target.value)}
              />
            </FormField>
          ))}
          {([0, 1] as const).map((i) => (
            <FormField
              key={`eng${i}`}
              id={`engineers.${i}`}
              label={`Fluids engineer ${i + 1}`}
              error={errors[`engineers.${i}`]}
            >
              <Input
                id={`engineers.${i}`}
                value={draft.engineers[i]}
                onChange={(e) => setPair('engineers', i, e.target.value)}
              />
            </FormField>
          ))}
        </div>
      </section>

      <section aria-labelledby="activities-heading" className="flex max-w-3xl flex-col gap-3">
        <h2 id="activities-heading" className="font-semibold text-sm">
          Activities
        </h2>
        {draft.activities.length === 0 ? (
          <p className="text-muted-foreground text-sm">No activities yet.</p>
        ) : null}
        {draft.activities.map((row, index) => (
          <div key={row.key} className="flex items-start gap-2">
            <div className="flex-1">
              <NativeSelect
                aria-label={`Activity ${index + 1}`}
                id={`activities.${index}.activityId`}
                aria-invalid={Boolean(errors[`activities.${index}.activityId`])}
                value={row.activityId}
                onChange={(e) => updateActivity(index, { activityId: e.target.value })}
              >
                {lookups.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </NativeSelect>
              {errors[`activities.${index}.activityId`] ? (
                <p role="alert" className="mt-1 text-destructive text-xs">
                  {errors[`activities.${index}.activityId`]}
                </p>
              ) : null}
            </div>
            <div className="w-32">
              <Input
                aria-label={`Hours of activity ${index + 1}`}
                id={`activities.${index}.hours`}
                inputMode="decimal"
                aria-invalid={Boolean(errors[`activities.${index}.hours`])}
                value={row.hours}
                onChange={(e) => updateActivity(index, { hours: e.target.value })}
              />
              {errors[`activities.${index}.hours`] ? (
                <p role="alert" className="mt-1 text-destructive text-xs">
                  {errors[`activities.${index}.hours`]}
                </p>
              ) : null}
            </div>
            <span className="flex h-8 items-center text-muted-foreground text-sm">h</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Move activity ${index + 1} up`}
              disabled={index === 0}
              onClick={() => moveActivity(index, -1)}
            >
              ↑
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Move activity ${index + 1} down`}
              disabled={index === draft.activities.length - 1}
              onClick={() => moveActivity(index, 1)}
            >
              ↓
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Remove activity ${index + 1}`}
              onClick={() =>
                set(
                  'activities',
                  draft.activities.filter((_, i) => i !== index),
                )
              }
            >
              Remove
            </Button>
          </div>
        ))}
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={lookups.length === 0}
            onClick={() =>
              set('activities', [
                ...draft.activities,
                { key: crypto.randomUUID(), activityId: lookups[0]?.id ?? '', hours: '' },
              ])
            }
          >
            Add activity
          </Button>
          <p className="text-sm" aria-live="polite">
            Total: <span className="font-medium tabular-nums">{formatNumber(total, 2)} h</span>
            {Math.abs(total - 24) > 1e-9 ? (
              <span className="ml-2 text-muted-foreground">(a day has 24 h)</span>
            ) : null}
          </p>
        </div>
      </section>

      <section aria-labelledby="remarks-heading" className="flex max-w-3xl flex-col gap-4">
        <h2 id="remarks-heading" className="font-semibold text-sm">
          Remarks
        </h2>
        <FormField id="drillingRemarks" label="Drilling remarks" error={errors.drillingRemarks}>
          <Textarea
            id="drillingRemarks"
            value={draft.drillingRemarks}
            onChange={(e) => set('drillingRemarks', e.target.value)}
          />
        </FormField>
        <FormField id="fluidRemarks" label="Fluid remarks" error={errors.fluidRemarks}>
          <Textarea
            id="fluidRemarks"
            value={draft.fluidRemarks}
            onChange={(e) => set('fluidRemarks', e.target.value)}
          />
        </FormField>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-10 flex items-center gap-3 border-t bg-background px-4 py-3">
        <Button type="submit" disabled={!dirty || saving}>
          {saving ? 'Saving…' : 'Save report'}
        </Button>
        <span className="text-muted-foreground text-sm">
          {dirty ? 'Unsaved changes' : 'All changes saved'}
        </span>
      </div>
    </form>
  );
}
