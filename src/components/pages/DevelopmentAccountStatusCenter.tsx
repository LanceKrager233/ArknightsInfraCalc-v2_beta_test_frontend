"use client";

import { Building2, Cloud, LogIn, RefreshCw, ShieldCheck, UserRound } from "lucide-react";

import { WebsiteAccountPanel } from "@/components/auth/WebsiteAccountPanel";
import { AccountCenterHeader } from "@/components/pages/AccountStatusCenter";
import { SklandStatus, type SklandStatusProps } from "@/components/pages/SklandStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SklandBindingSummary } from "@/types";

export type AccountCenterView = "account" | "skland-overview" | "skland-infrastructure";

interface DevelopmentAccountStatusCenterProps {
  view: AccountCenterView;
  onViewChange: (view: AccountCenterView) => void;
  websiteAuthenticated: boolean;
  websiteSessionPending: boolean;
  bindingSummary: SklandBindingSummary;
  onWebsiteSessionChanged?: (authenticated: boolean) => void | Promise<void>;
  skland: Omit<SklandStatusProps, "bindingSummary" | "view">;
}

function formatExpiry(timestamp: number | null): string | null {
  if (!timestamp || !Number.isFinite(timestamp)) return null;
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp));
}

function SklandBindingStrip({
  summary,
}: {
  summary: SklandBindingSummary;
}) {
  const nextExpiry = formatExpiry(summary.nextExpiresAt);
  return (
    <section className="border-y border-border/70 py-5" aria-labelledby="skland-binding-title" data-skland-binding-summary>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 id="skland-binding-title" className="font-semibold">森空岛绑定</h3>
          {summary.activeCount > 0 ? <Badge variant="secondary" className="font-number"><ShieldCheck />有效 {summary.activeCount}</Badge> : null}
          {summary.renewalDueCount > 0 ? <Badge variant="outline"><RefreshCw />待续期 {summary.renewalDueCount}</Badge> : null}
          {summary.totalCount === 0 ? <Badge variant="outline">未绑定</Badge> : null}
        </div>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground" data-ui-number-font>
          {summary.activeCount > 0
            ? `网站账号已关联 ${summary.totalCount} 个森空岛账号${nextExpiry ? `，最近一次授权将在 ${nextExpiry} 到期` : ""}。`
            : summary.renewalDueCount > 0
              ? `已保留 ${summary.renewalDueCount} 个绑定记录，七天授权期已结束，需要重新扫码。`
              : "尚未关联森空岛账号。扫码后，绑定状态会显示在这里。"}
        </p>
      </div>
    </section>
  );
}

function WebsiteLoginRequired({ onOpenAccount }: { onOpenAccount: () => void }) {
  return (
    <div className="grid min-h-72 place-items-center border-y border-border/70 py-10 text-center" data-skland-login-required>
      <div className="max-w-md">
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-muted"><LogIn className="size-5" /></div>
        <h3 className="mt-4 text-xl font-semibold">先登录网站账号</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">森空岛绑定属于当前网站账号。登录完成后，如需扫码，页面会自动带你继续。</p>
        <Button type="button" className="mt-5 min-h-11" onClick={onOpenAccount}><UserRound />前往账号登录</Button>
      </div>
    </div>
  );
}

export function DevelopmentAccountStatusCenter({
  view,
  onViewChange,
  websiteAuthenticated,
  websiteSessionPending,
  bindingSummary,
  onWebsiteSessionChanged,
  skland,
}: DevelopmentAccountStatusCenterProps) {
  return (
    <div className="grid gap-6 pb-3 pt-5 sm:pb-6" data-account-status-center>
      <AccountCenterHeader />

      <Tabs value={view} onValueChange={(value) => onViewChange(value as AccountCenterView)}>
        <div className="-mx-3 min-w-0 overflow-x-auto overflow-y-hidden px-3 pb-1">
          <TabsList variant="line" className="min-w-max" aria-label="账号状态中心内容" data-skland-view-tabs>
            <TabsTrigger value="skland-overview"><Cloud />森空岛概览</TabsTrigger>
            <TabsTrigger value="skland-infrastructure"><Building2 />基建</TabsTrigger>
            <TabsTrigger value="account"><UserRound />账号</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="account" className="pt-5">
          <WebsiteAccountPanel onSessionChanged={onWebsiteSessionChanged} />
        </TabsContent>

        {(["skland-overview", "skland-infrastructure"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="pt-1">
            {websiteSessionPending ? (
              <div className="grid gap-4 pt-5" role="status" aria-label="正在恢复网站账号">
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-64 rounded-xl" />
              </div>
            ) : !websiteAuthenticated ? (
              <WebsiteLoginRequired onOpenAccount={() => onViewChange("account")} />
            ) : (
              <>
                {tab === "skland-overview" ? <SklandBindingStrip summary={bindingSummary} /> : null}
                {bindingSummary.renewalDueCount > 0 && skland.accounts.length === 0 ? (
                  <Alert className="mt-5">
                    <AlertDescription>森空岛授权已满七天。下方扫码完成后，绑定记录会恢复为有效状态。</AlertDescription>
                  </Alert>
                ) : null}
                <SklandStatus
                  {...skland}
                  bindingSummary={bindingSummary}
                  view={tab === "skland-overview" ? "overview" : "infrastructure"}
                />
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
