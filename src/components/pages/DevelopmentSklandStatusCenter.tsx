"use client";

import { LogIn, UserRound } from "lucide-react";

import { SklandStatus, type SklandStatusProps } from "@/components/pages/SklandStatus";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SklandBindingSummary } from "@/types";

interface DevelopmentSklandStatusCenterProps {
  websiteAuthenticated: boolean;
  websiteSessionPending: boolean;
  bindingSummary: SklandBindingSummary;
  onOpenAccount: () => void;
  skland: Omit<SklandStatusProps, "bindingSummary">;
}

function WebsiteLoginRequired({ onOpenAccount }: { onOpenAccount: () => void }) {
  return (
    <div className="grid gap-6 pb-2 pt-5 sm:pb-5" data-skland-page data-skland-login-required>
      <header className="max-w-2xl">
        <p className="text-xs font-medium tracking-wide text-primary">森空岛状态中心</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">先登录网站账号</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          森空岛绑定属于当前网站账号。登录后即可扫码绑定、查看当前基建状态，并在七天授权到期后重新续期。
        </p>
      </header>
      <div className="grid min-h-64 place-items-center border-y border-border/70 py-10 text-center">
        <div className="max-w-md">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-muted">
            <LogIn className="size-5" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">网站账号尚未登录</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            账号管理与森空岛状态已经分开。请先前往账号管理登录，再回到这里完成森空岛授权。
          </p>
          <Button type="button" className="mt-5 min-h-11" onClick={onOpenAccount}>
            <UserRound />前往账号管理
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DevelopmentSklandStatusCenter({
  websiteAuthenticated,
  websiteSessionPending,
  bindingSummary,
  onOpenAccount,
  skland,
}: DevelopmentSklandStatusCenterProps) {
  if (websiteSessionPending) {
    return (
      <div className="grid gap-4 pb-2 pt-5 sm:pb-5" role="status" aria-label="正在恢复网站账号" data-skland-page>
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!websiteAuthenticated) return <WebsiteLoginRequired onOpenAccount={onOpenAccount} />;

  return <SklandStatus {...skland} bindingSummary={bindingSummary} />;
}
