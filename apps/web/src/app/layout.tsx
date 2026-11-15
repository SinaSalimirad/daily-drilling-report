import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { Providers } from '@/components/providers';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'DMR Online',
  description: 'Daily drilling fluids (mud) report',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)}>
      <body>
        <Providers>
          <TooltipProvider>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>{children}</SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
        </Providers>
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
