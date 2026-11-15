'use client';

import { UNIT_SYSTEM_PRESETS, type UnitSystemPreset, unitLabel } from '@ddr/calc/units';
import { QUANTITIES, QUANTITY_UNITS, type UnitSystem } from '@ddr/schemas';
import { FormField } from '@/components/FormField';
import { NativeSelect } from '@/components/NativeSelect';
import { QUANTITY_LABELS } from '@/lib/labels';

const PRESET_NAMES: Record<UnitSystemPreset, string> = { si: 'SI', workbook: 'Workbook' };

export function presetOf(system: UnitSystem): UnitSystemPreset | 'custom' {
  for (const [name, preset] of Object.entries(UNIT_SYSTEM_PRESETS)) {
    if (QUANTITIES.every((q) => preset[q] === system[q])) return name as UnitSystemPreset;
  }
  return 'custom';
}

export function presetLabel(system: UnitSystem): string {
  const preset = presetOf(system);
  return preset === 'custom' ? 'Custom' : PRESET_NAMES[preset];
}

/** Display unit system of a project: a preset, then one unit per quantity. */
export function UnitSystemFields({
  value,
  onChange,
  errors,
}: {
  value: UnitSystem;
  onChange: (next: UnitSystem) => void;
  errors: Record<string, string>;
}) {
  const preset = presetOf(value);
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 font-medium text-sm">Display units</legend>
      <FormField id="unitSystemPreset" label="Unit system" hint="Values are always stored in SI.">
        <NativeSelect
          id="unitSystemPreset"
          value={preset}
          onChange={(e) => {
            const next = e.target.value;
            if (next in UNIT_SYSTEM_PRESETS) {
              onChange({ ...UNIT_SYSTEM_PRESETS[next as UnitSystemPreset] });
            }
          }}
        >
          {Object.entries(PRESET_NAMES).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
          {preset === 'custom' ? <option value="custom">Custom</option> : null}
        </NativeSelect>
      </FormField>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {QUANTITIES.map((quantity) => {
          const id = `unitSystem.${quantity}`;
          return (
            <FormField key={quantity} id={id} label={QUANTITY_LABELS[quantity]} error={errors[id]}>
              <NativeSelect
                id={id}
                aria-invalid={Boolean(errors[id])}
                value={value[quantity]}
                onChange={(e) => onChange({ ...value, [quantity]: e.target.value } as UnitSystem)}
              >
                {QUANTITY_UNITS[quantity].map((unit) => (
                  <option key={unit} value={unit}>
                    {unitLabel(unit)}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          );
        })}
      </div>
    </fieldset>
  );
}
