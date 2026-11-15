import type { ReactNode } from 'react';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

/** Top bar of every page: sidebar toggle, title and optional actions. */
export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="font-semibold text-base">{title}</h1>
      {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
