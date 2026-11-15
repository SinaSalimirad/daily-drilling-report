'use client';

import {
  FolderKanbanIcon,
  HomeIcon,
  LogOutIcon,
  type LucideIcon,
  PackageIcon,
  UsersIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { useCan, useCurrentUser } from '@/features/auth/use-session';
import { authClient } from '@/lib/auth-client';

type NavItem = { title: string; href: string; icon: LucideIcon };

/** Features add their entry here as they arrive (projects and wells in v0.2.0). */
const NAV_ITEMS: NavItem[] = [
  { title: 'Home', href: '/', icon: HomeIcon },
  { title: 'Projects', href: '/projects', icon: FolderKanbanIcon },
  { title: 'Products', href: '/products', icon: PackageIcon },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useCurrentUser();
  const canManageUsers = useCan('user:manage');
  const items = canManageUsers
    ? [...NAV_ITEMS, { title: 'Users', href: '/users', icon: UsersIcon }]
    : NAV_ITEMS;
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
              {items.map((item) => (
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
      <SidebarFooter>
        <div className="flex flex-col gap-1 px-2 text-xs group-data-[collapsible=icon]:hidden">
          <span className="font-medium">{user?.name}</span>
          <span className="text-muted-foreground">{user?.role}</span>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign out"
              onClick={async () => {
                await authClient.signOut();
                router.replace('/sign-in');
              }}
            >
              <LogOutIcon />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
