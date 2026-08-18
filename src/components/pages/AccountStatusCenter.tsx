"use client";

import { WebsiteAccountPanel } from "@/components/auth/WebsiteAccountPanel";

interface AccountStatusCenterProps {
  onSessionChanged?: (authenticated: boolean) => void | Promise<void>;
}

export function AccountStatusCenter({ onSessionChanged }: AccountStatusCenterProps) {
  return (
    <div className="grid gap-6 pb-2 pt-5 sm:pb-5" data-account-management>
      <WebsiteAccountPanel onSessionChanged={onSessionChanged} />
    </div>
  );
}
