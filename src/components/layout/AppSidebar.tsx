"use client";

import { Calculator, Cloud, GraduationCap, LogIn } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import type { SklandSnapshot } from "@/types";

export type AppPage = "calculator" | "training" | "skland";

interface AppSidebarProps {
  page: AppPage;
  snapshot: SklandSnapshot | null;
  onPageChange: (page: AppPage) => void;
}

export function AppSidebar({ page, snapshot, onPageChange }: AppSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();

  function handlePageChange(nextPage: AppPage) {
    onPageChange(nextPage);
    if (isMobile) setOpenMobile(false);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-[65px] flex-row items-center justify-end border-b border-sidebar-border px-2 group-data-[collapsible=icon]:justify-center">
        <SidebarTrigger className="h-9 w-9" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={page === "calculator"}
                onClick={() => handlePageChange("calculator")}
                tooltip="基建计算器"
              >
                <Calculator className="size-5" />
                <span>基建计算器</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={page === "training"}
                onClick={() => handlePageChange("training")}
                tooltip="练卡建议"
              >
                <GraduationCap className="size-5" />
                <span>练卡建议</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={page === "skland"}
                onClick={() => handlePageChange("skland")}
                tooltip="森空岛状态"
              >
                <Cloud className="size-5" />
                <span>森空岛状态</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border group-data-[collapsible=icon]:p-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              isActive={page === "skland"}
              className="h-14 gap-2 p-2 group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-0!"
              onClick={() => handlePageChange("skland")}
              tooltip={snapshot ? `${snapshot.player.nickname} · 森空岛` : "登录森空岛"}
              aria-label={snapshot ? `${snapshot.player.nickname}，进入森空岛状态` : "登录森空岛"}
              data-skland-sidebar-account
            >
              {snapshot ? (
                <>
                  <span
                    className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary text-sm font-semibold text-primary-foreground ring-1 ring-foreground/12"
                    role="img"
                    aria-label={`${snapshot.player.nickname}的森空岛头像`}
                    data-skland-sidebar-avatar
                  >
                    {snapshot.player.avatarUrl ? (
                      <img
                        src={snapshot.player.avatarUrl}
                        alt=""
                        width={36}
                        height={36}
                        referrerPolicy="no-referrer"
                        className="size-full object-cover"
                      />
                    ) : snapshot.player.nickname.slice(0, 1)}
                  </span>
                  <span className="grid min-w-0 flex-1 gap-0.5 group-data-[collapsible=icon]:hidden">
                    <strong className="truncate text-sm font-medium">{snapshot.player.nickname}</strong>
                    <span className="truncate text-[11px] text-sidebar-foreground/58">
                      森空岛 · {snapshot.player.channelName}
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-sidebar-accent text-sidebar-accent-foreground"
                    aria-hidden="true"
                    data-skland-sidebar-login-icon
                  >
                    <LogIn className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium group-data-[collapsible=icon]:hidden">
                    登录森空岛
                  </span>
                </>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
