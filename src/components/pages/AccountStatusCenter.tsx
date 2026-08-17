"use client";

import { WebsiteAccountPanel } from "@/components/auth/WebsiteAccountPanel";

export function AccountCenterHeader() {
  return (
    <header className="max-w-2xl">
      <h2 className="text-xs font-medium tracking-wide text-primary">账号状态中心</h2>
    </header>
  );
}

interface AccountStatusCenterProps {
  onSessionChanged?: (authenticated: boolean) => void | Promise<void>;
}

export function AccountStatusCenter({ onSessionChanged }: AccountStatusCenterProps) {
  return (
    <div className="grid gap-7 pb-3 pt-5 sm:pb-6" data-account-status-center>
      <AccountCenterHeader />
      <WebsiteAccountPanel onSessionChanged={onSessionChanged} />
    </div>
  );
}
