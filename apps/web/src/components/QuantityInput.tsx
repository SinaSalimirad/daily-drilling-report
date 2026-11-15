'use client';

import type { Quantity } from '@ddr/schemas';
import { type ComponentProps, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { editableText, fromDisplay, quantityLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useUnitSystem } from './UnitSystemProvider';

type Props = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  quantity: Quantity;
  /** Stored value in SI, or null when empty. */
  value: number | null;
  /** Receives the SI value (unrounded), or null when the field is empty or not a number. */
  onChange: (si: number | null) => void;
};

/**
 * Number input in the project's display unit, e.g. `<QuantityInput quantity="density" … />`
 * shows "PCF" for the workbook preset. The user types display units; `onChange` gets SI.
 * The typed text is kept while editing (so "75." or "-" work), and replaced only when the
 * value changes from outside (e.g. after a reload) or the unit system changes.
 */
export function QuantityInput({ quantity, value, onChange, className, onBlur, ...props }: Props) {
  const system = useUnitSystem();
  const [text, setText] = useState(() => editableText(value, quantity, system));
  const lastEmitted = useRef<number | null>(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setText(editableText(value, quantity, system));
    }
  }, [value, quantity, system]);

  useEffect(() => {
    setText(editableText(lastEmitted.current, quantity, system));
  }, [quantity, system]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Input
        {...props}
        inputMode="decimal"
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          const parsed = next.trim() === '' ? null : Number(next.replace(',', '.'));
          const si =
            parsed === null || Number.isNaN(parsed) ? null : fromDisplay(parsed, quantity, system);
          lastEmitted.current = si;
          onChange(si);
        }}
        onBlur={(event) => {
          setText(editableText(lastEmitted.current, quantity, system));
          onBlur?.(event);
        }}
      />
      <span className="min-w-12 text-muted-foreground text-sm">
        {quantityLabel(system, quantity)}
      </span>
    </div>
  );
}
