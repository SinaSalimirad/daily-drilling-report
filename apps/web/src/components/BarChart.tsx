import { formatNumber } from '@/lib/format';

/** Horizontal bars drawn with CSS: the charts of the recap need no chart library. */
export function BarChart({
  title,
  rows,
  unit,
  decimals = 1,
}: {
  title: string;
  rows: { label: string; value: number }[];
  unit?: string;
  decimals?: number;
}) {
  const max = Math.max(0, ...rows.map((row) => row.value));
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="font-medium text-sm">{title}</figcaption>
      {rows.length === 0 || max === 0 ? (
        <p className="text-muted-foreground text-sm">Nothing to show yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((row) => (
            <li
              key={row.label}
              className="grid grid-cols-[10rem_1fr_6rem] items-center gap-2 text-xs"
            >
              <span className="truncate" title={row.label}>
                {row.label}
              </span>
              <span className="h-3 rounded-sm bg-muted">
                <span
                  className="block h-3 rounded-sm bg-primary"
                  style={{ width: `${(row.value / max) * 100}%` }}
                />
              </span>
              <span className="text-right tabular-nums">
                {formatNumber(row.value, decimals)} {unit}
              </span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
