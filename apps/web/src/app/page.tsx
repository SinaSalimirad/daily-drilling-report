'use client';

import { PageHeader } from '@/components/PageHeader';
import { ConsumptionDashboard } from '@/features/dashboard/ConsumptionDashboard';
import { HealthStatus } from '@/features/health/HealthStatus';

export default function HomePage() {
  return (
    <>
      <PageHeader title="Home" />
      <main className="flex flex-col gap-6 p-4">
        <div>
          <h2 className="font-semibold text-lg">Chemical consumption</h2>
          <p className="text-muted-foreground text-sm">
            Cost per well by month and by section. Open a row for its products.
          </p>
        </div>
        <ConsumptionDashboard />
        <HealthStatus />
      </main>
    </>
  );
}
