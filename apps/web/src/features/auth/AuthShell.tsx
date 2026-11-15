'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useCurrentUser } from './use-session';

const PUBLIC_PATHS = ['/sign-in'];

/**
 * Route protection of the web app: without a session every page but the sign-in page sends
 * the user to sign in and brings them back afterwards. The API enforces the same rule.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, pending } = useCurrentUser();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (!pending && !user && !isPublic) {
      router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
    }
  }, [pending, user, isPublic, pathname, router]);

  if (isPublic) return <>{children}</>;
  if (pending || !user) return <p className="p-4 text-muted-foreground text-sm">Loading…</p>;
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
