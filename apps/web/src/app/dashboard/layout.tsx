import type { ReactNode } from "react";
import { MenuSidebar } from "@/shared/components/app-shell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <MenuSidebar>{children}</MenuSidebar>;
}
