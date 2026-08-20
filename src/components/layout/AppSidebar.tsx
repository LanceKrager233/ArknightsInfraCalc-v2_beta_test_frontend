"use client";

import { Calculator, Cloud, GraduationCap, Search, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

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

function AppNavigationItem({
  page,
  target,
  label,
  icon: Icon,
  betaRequested,
  onPageChange,
}: AppNavigationItemProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const [prefetchOnIntent, setPrefetchOnIntent] = useState(false);
  const href = workbenchHref(target, betaRequested);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={(
          <Link
            href={href}
            role="button"
            prefetch={prefetchOnIntent ? null : false}
            aria-current={page === target ? "page" : undefined}
            onMouseEnter={() => setPrefetchOnIntent(true)}
            onFocus={() => setPrefetchOnIntent(true)}
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
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar({ page, betaRequested, onPageChange }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
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
