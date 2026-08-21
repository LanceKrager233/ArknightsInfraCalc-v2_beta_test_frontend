"use client";

import { AccountStatusCenter } from "@/components/pages/AccountStatusCenter";
import { useWorkbench } from "@/workbench-context";

export function AccountRoute() {
  const { account } = useWorkbench();
  if (!account.authenticated) {
    return (
      <div className="grid min-h-64 place-items-center" role="status" aria-live="polite">
        <span className="text-sm text-muted-foreground">
          {account.pending ? "正在确认网站账号…" : "正在打开账号登录…"}
        </span>
      </div>
    );
  }
  return <AccountStatusCenter {...account} />;
}
