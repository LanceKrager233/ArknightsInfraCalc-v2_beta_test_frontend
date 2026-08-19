"use client";

import { WebsiteAccountPanel } from "@/components/auth/WebsiteAccountPanel";
import { StatusCenterPage } from "@/components/pages/StatusCenterShell";

export interface AccountStatusCenterProps {
  onSessionChanged?: (authenticated: boolean) => void | Promise<void>;
}

export function AccountStatusCenter({ onSessionChanged }: AccountStatusCenterProps) {
  return (
    <StatusCenterPage data-account-management>
      <WebsiteAccountPanel onSessionChanged={onSessionChanged} />
    </StatusCenterPage>
  );
}
