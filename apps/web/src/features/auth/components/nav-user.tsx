"use client";

import {
  BadgeCheckIcon,
  BellIcon,
  ChevronsUpDownIcon,
  CreditCardIcon,
  LogOutIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useLogout, useMe } from "../hooks/use-auth";
import { initialsOf } from "../lib/initials";
import type { AuthUser } from "../type";

// Placeholder items from the shadcn block; their pages don't exist yet.
const comingSoon = () => toast.info("Coming soon");

function UserSummary({ user }: { user: AuthUser }) {
  return (
    <>
      <Avatar className="size-8 rounded-lg">
        <AvatarFallback className="rounded-lg">{initialsOf(user.displayName)}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{user.displayName}</span>
        <span className="truncate text-xs text-muted-foreground">{user.email}</span>
      </div>
    </>
  );
}

// The logged-in user at the bottom of the sidebar, with a menu to log out.
export function NavUser() {
  const { isMobile } = useSidebar();
  const { data: user, isPending, isError } = useMe();
  const logout = useLogout();

  if (isPending) {
    return (
      <div className="flex items-center gap-2 p-2">
        <Skeleton className="size-8 rounded-lg" />
        <div className="grid flex-1 gap-1">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    );
  }

  // No session: lib/axios.ts already sends the browser to /login, so there is nothing to show.
  if (isError) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
              />
            }
          >
            <UserSummary user={user} />
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* Base UI needs a GroupLabel inside a Group. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal text-foreground">
                <div className="flex items-center gap-2 px-1 py-1.5">
                  <UserSummary user={user} />
                </div>
                <p className="px-1 pb-1.5 text-xs text-muted-foreground capitalize">{user.role}</p>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={comingSoon}>
                <SparklesIcon />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={comingSoon}>
                <BadgeCheckIcon />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={comingSoon}>
                <CreditCardIcon />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={comingSoon}>
                <BellIcon />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={logout.isPending} onClick={() => logout.mutate()}>
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
