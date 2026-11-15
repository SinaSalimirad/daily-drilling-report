import { TriangleAlertIcon } from 'lucide-react';

export type ReportWarning = { code: string; message: string; details?: Record<string, unknown> };

/** Warnings open on the report (docs/05): the engineer may continue, and acknowledges them at submit. */
export function WarningsPanel({ warnings }: { warnings: ReportWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <section
      aria-labelledby="warnings-heading"
      className="flex flex-col gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm"
    >
      <h2 id="warnings-heading" className="flex items-center gap-2 font-semibold">
        <TriangleAlertIcon className="size-4" aria-hidden />
        {warnings.length === 1 ? '1 warning' : `${warnings.length} warnings`}
      </h2>
      <ul className="list-disc pl-5">
        {warnings.map((warning) => (
          <li key={`${warning.code}:${warning.message}`}>{warning.message}</li>
        ))}
      </ul>
    </section>
  );
}
