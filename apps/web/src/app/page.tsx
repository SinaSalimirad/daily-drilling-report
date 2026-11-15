'use client';

import { PageHeader } from '@/components/page-header';
import { HealthStatus } from '@/features/health/HealthStatus';

export default function HomePage() {
  return (
    <>
      <PageHeader title="Home" />
      <main className="flex flex-col gap-3 p-4">
        <p className="text-muted-foreground text-sm">Daily drilling fluids (mud) report.</p>
        <HealthStatus />
      </main>
    </>
  );
}
