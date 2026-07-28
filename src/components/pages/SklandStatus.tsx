import { Database } from "lucide-react";

import { Panel } from "@/components";
import { Button } from "@/components/ui/button";
import { InfrastructureSnapshot } from "@/skland-components";
import type { SklandSnapshot } from "@/types";

interface SklandStatusProps {
  snapshot: SklandSnapshot | null;
  layoutMatches: boolean;
  configured: boolean;
  disabledReason: string | null;
  onOpenAccount: () => void;
  onApplyLayout: () => void;
}

export function SklandStatus({
  snapshot,
  layoutMatches,
  configured,
  disabledReason,
  onOpenAccount,
  onApplyLayout,
}: SklandStatusProps) {
  if (!snapshot) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="max-w-lg text-center">
          <h1 className="text-lg font-semibold">尚未同步森空岛状态</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {configured ? "登录后可查看当前基建状态。" : disabledReason ?? "当前未开放森空岛登录，可使用 MAA 导入。"}
          </p>
          <Button type="button" className="mt-4 min-h-11" disabled={!configured} onClick={onOpenAccount}>
            登录森空岛
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Panel title="当前状态 · 森空岛基建" icon={<Database className="size-4" />}>
      <InfrastructureSnapshot
        snapshot={snapshot}
        layoutMatches={layoutMatches ?? false}
        onApplyLayout={onApplyLayout}
      />
    </Panel>
  );
}
