import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_ROWS = Array.from({ length: 8 }, (_, i) => `skeleton-row-${i}`);

export function ProductsSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true">
      {SKELETON_ROWS.map((key) => (
        <Skeleton key={key} className="h-10 w-full" />
      ))}
    </div>
  );
}
