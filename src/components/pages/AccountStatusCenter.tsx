"use client";

import { CircleUserRound, ShieldCheck } from "lucide-react";

import { WebsiteAccountPanel } from "@/components/auth/WebsiteAccountPanel";

interface AccountCenterHeaderProps {
  description: string;
}

export function AccountCenterHeader({ description }: AccountCenterHeaderProps) {
  return (
    <header className="grid gap-5 border-b border-border/70 pb-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div className="max-w-2xl">
        <p className="text-xs font-medium tracking-[0.16em] text-primary">ACCOUNT TERMINAL</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">账号状态中心</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground" data-ui-number-font>
        <span className="grid size-9 place-items-center rounded-lg border bg-muted/40"><CircleUserRound className="size-4" /></span>
        <span><ShieldCheck className="mr-1 inline size-3.5 text-emerald-600" />数据库 Session</span>
      </div>
    </header>
  );
}

interface AccountStatusCenterProps {
  onSessionChanged?: (authenticated: boolean) => void | Promise<void>;
}

export function AccountStatusCenter({ onSessionChanged }: AccountStatusCenterProps) {
  return (
    <div className="grid gap-7 pb-3 pt-5 sm:pb-6" data-account-status-center>
      <AccountCenterHeader description="在这里完成登录、邮箱验证和设备管理。账号只用于保护需要登录的数据与操作。" />
      <WebsiteAccountPanel onSessionChanged={onSessionChanged} />
    </div>
  );
}
