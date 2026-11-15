import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** A native <select> styled like the inputs: accessible, keyboard-friendly, no portal. */
export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      {...props}
      className={cn(
        'h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30',
        className,
      )}
    />
  );
}
