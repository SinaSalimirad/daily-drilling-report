'use client';

import { PageHeader } from '@/components/page-header';

export default function HomePage() {
  return (
    <>
      <PageHeader title="Home" />
      <main className="p-4">
        <p className="text-muted-foreground text-sm">Daily drilling fluids (mud) report.</p>
      </main>
    </>
  );
}
