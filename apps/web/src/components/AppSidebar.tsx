'use client';

import { FolderKanbanIcon, HomeIcon, type LucideIcon, PackageIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

type NavItem = { title: string; href: string; icon: LucideIcon };

/** Features add their entry here as they arrive (projects and wells in v0.2.0). */
const NAV_ITEMS: NavItem[] = [
  { title: 'Home', href: '/', icon: HomeIcon },
  { title: 'Projects', href: '/projects', icon: FolderKanbanIcon },
  { title: 'Products', href: '/products', icon: PackageIcon },
];

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <span className="px-2 py-1 font-semibold text-sm group-data-[collapsible=icon]:hidden">
          DMR Online
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)}
                    tooltip={item.title}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
