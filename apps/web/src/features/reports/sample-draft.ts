import type { MudSample, MudSampleInput } from '@ddr/schemas';

// Typed text of one sample column → request body, and back. Pure, so it is tested.

/** Plain numbers shown as typed (dial readings, percentages, seconds, mL). */
export const PLAIN_FIELDS = [
  'funnelViscosity',
  'r600',
  'r300',
  'r200',
  'r100',
  'r6',
  'r3',
  'apiFluidLoss',
  'oil',
  'water',
  'solids',
  'sand',
] as const;
export type PlainField = (typeof PLAIN_FIELDS)[number];

/** Quantities kept in SI and edited through `QuantityInput`. */
export const QUANTITY_FIELDS = [
  'mudWeight',
  'gel10s',
  'gel10m',
  'gel30m',
  'mbt',
  'chlorides',
] as const;
export type QuantityField = (typeof QUANTITY_FIELDS)[number];

/** Properties of the template of the water-based / brine report (analysis §5.4). */
export const WBM_EXTRAS = ['pH', 'Pm', 'Pf', 'Mf', 'Hardness', 'Calcium', 'KCl', 'Glycol'] as const;

export type SampleDraft = {
  key: string;
  sampleSourceId: string;
  sampleTime: string;
  plain: Record<PlainField, string>;
  quantities: Record<QuantityField, number | null>;
  extras: Record<string, string>;
};

const blankPlain = () =>
  Object.fromEntries(PLAIN_FIELDS.map((f) => [f, ''])) as Record<PlainField, string>;
const blankQuantities = () =>
  Object.fromEntries(QUANTITY_FIELDS.map((f) => [f, null])) as Record<QuantityField, number | null>;

export const blankSample = (key: string): SampleDraft => ({
  key,
  sampleSourceId: '',
  sampleTime: '',
  plain: blankPlain(),
  quantities: blankQuantities(),
  extras: {},
});

export function draftOf(sample: MudSample): SampleDraft {
  const draft = blankSample(sample.id);
  draft.sampleSourceId = sample.sampleSourceId ?? '';
  draft.sampleTime = sample.sampleTime ?? '';
  for (const field of PLAIN_FIELDS)
    draft.plain[field] = sample[field] === null ? '' : String(sample[field]);
  for (const field of QUANTITY_FIELDS) draft.quantities[field] = sample[field];
  draft.extras = Object.fromEntries(
    Object.entries(sample.otherProperties).map(([key, value]) => [key, String(value)]),
  );
  return draft;
}

const toNumber = (text: string): number | null => {
  const trimmed = text.trim();
  return trimmed === '' ? null : Number(trimmed.replace(',', '.'));
};

/** A number or a text: `9.6` stays a number so the API can store it as one. */
const toExtra = (text: string): number | string => {
  const value = toNumber(text);
  return value === null || Number.isNaN(value) ? text.trim() : value;
};

export function payloadOf(draft: SampleDraft): MudSampleInput {
  return {
    sampleSourceId: draft.sampleSourceId === '' ? null : draft.sampleSourceId,
    sampleTime: draft.sampleTime === '' ? null : draft.sampleTime,
    ...Object.fromEntries(PLAIN_FIELDS.map((f) => [f, toNumber(draft.plain[f])])),
    ...draft.quantities,
    otherProperties: Object.fromEntries(
      Object.entries(draft.extras)
        .filter(([, text]) => text.trim() !== '')
        .map(([key, text]) => [key, toExtra(text)]),
    ),
  } as MudSampleInput;
}
