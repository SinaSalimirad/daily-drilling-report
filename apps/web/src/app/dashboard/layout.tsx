import type { ReactNode } from "react";
import { MenuSidebar } from "@/shared/components/menu-sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <MenuSidebar>{children}</MenuSidebar>;
}
