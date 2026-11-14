"use client";

import { GalleryVerticalEndIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { NavUser } from "@/features/auth/components/nav-user";

const data = {
  navMain: [
    {
      title: "WORKSPACE",
      url: "#",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
        },
        {
          title: "Daily Reports",
          url: "#",
        },
        {
          title: "Operations",
          url: "#",
        },
      ],
    },
    {
      title: "MANAGEMENT",
      url: "#",
      items: [
        { title: "Projects", url: "/dashboard/projects" },
        { title: "Wells", url: "/dashboard/wells" },
        { title: "Sections", url: "/dashboard/sections" },
        { title: "Reports", url: "/dashboard/reports" },
        {
          title: "Inventories",
          url: "/dashboard/inventories",
        },
        {
          title: "Products",
          url: "/dashboard/products",
        },
      ],
    },
    {
      title: "CONFIGURATION",
      url: "#",
      items: [
        {
          title: "Reports & Analytics",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
  ],
};

// "/dashboard" is only active on the dashboard itself; every other entry is also active on
// its sub-routes (e.g. /dashboard/wells/123). Placeholder links ("#") are never active.
function isActiveLink(pathname: string, url: string) {
  if (url === "#") return false;
  if (url === "/dashboard") return pathname === url;

  return pathname === url || pathname.startsWith(`${url}/`);
}

export function MenuSidebar({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" render={<Link href="#" />}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GalleryVerticalEndIcon className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">Documentation</span>
                  <span className="">v1.0.0</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {data.navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton render={<Link href={item.url} className="font-medium" />}>
                    {item.title}
                  </SidebarMenuButton>
                  {item.items?.length ? (
                    <SidebarMenuSub>
                      {item.items.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            isActive={isActiveLink(pathname, item.url)}
                            render={<Link href={item.url} />}
                          >
                            {item.title}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </div>
        </header>
        <main className="p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
