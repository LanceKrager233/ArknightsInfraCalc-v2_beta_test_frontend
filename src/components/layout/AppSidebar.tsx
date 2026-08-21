"use client";

import { Calculator, Cloud, GraduationCap, Search, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useLinkStatus } from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { workbenchHref, type AppPage } from "@/workbench-routes";

const CLIENT_SKLAND_ENABLED = process.env.APP_CLIENT_SKLAND_ENABLED === "1";

interface AppSidebarProps {
  page: AppPage;
  betaRequested: boolean;
  onPageChange: (page: AppPage) => boolean;
}

interface AppNavigationItemProps extends AppSidebarProps {
  target: AppPage;
  label: string;
  icon: LucideIcon;
}

function NavigationPendingIndicator() {
  const { pending } = useLinkStatus();

  return (
    <span
      className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary opacity-0 motion-reduce:transition-none group-data-[collapsible=icon]:right-0.5 group-data-[collapsible=icon]:top-0.5 data-[pending=true]:animate-pulse data-[pending=true]:opacity-100"
      data-pending={pending ? "true" : "false"}
      data-navigation-pending
      aria-hidden="true"
    />
  );
}

function AppNavigationItem({
  page,
  target,
  label,
  icon: Icon,
  betaRequested,
  onPageChange,
}: AppNavigationItemProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const href = workbenchHref(target, betaRequested);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className="relative"
        render={(
          <Link
            href={href}
            role="button"
            aria-current={page === target ? "page" : undefined}
            onClick={(event) => {
              if (!onPageChange(target)) event.preventDefault();
              if (isMobile) setOpenMobile(false);
            }}
          />
        )}
        isActive={page === target}
        tooltip={label}
      >
        <Icon className="size-5" />
        <span>{label}</span>
        <NavigationPendingIndicator />
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar({ page, betaRequested, onPageChange }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" data-primary-navigation-prefetch="eager">
      <SidebarHeader className="h-[65px] flex-row items-center justify-end border-b border-sidebar-border px-2 group-data-[collapsible=icon]:justify-center">
        <SidebarTrigger className="h-9 w-9" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <AppNavigationItem page={page} target="calculator" label="基建计算器" icon={Calculator} betaRequested={betaRequested} onPageChange={onPageChange} />
            <AppNavigationItem page={page} target="training" label="练卡建议" icon={GraduationCap} betaRequested={betaRequested} onPageChange={onPageChange} />
            <AppNavigationItem page={page} target="skill-query" label="技能查询" icon={Search} betaRequested={betaRequested} onPageChange={onPageChange} />
            {CLIENT_SKLAND_ENABLED ? (
              <AppNavigationItem page={page} target="skland" label="森空岛状态中心" icon={Cloud} betaRequested={betaRequested} onPageChange={onPageChange} />
            ) : null}
            <AppNavigationItem page={page} target="account" label="账号管理" icon={UserRound} betaRequested={betaRequested} onPageChange={onPageChange} />
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
