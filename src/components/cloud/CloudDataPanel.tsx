"use client";

import { Cloud, History, Pin, PinOff, RotateCcw, ShieldX, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  deleteSavedPlan,
  getAccountDataConsent,
  getSavedPlans,
  putCloudWorkspace,
  revokeAccountDataConsent,
  updateSavedPlan,
} from "@/api";
import { cloudSyncMetadataKey } from "@/cloud-sync";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HoldToConfirm } from "@/components/ui/hold-to-confirm";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/legal-policy";
import type { AccountDataConsentData, CloudWorkspaceData, PublicPlanData, SavedPlanData } from "@/types";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date)
    : "—";
}

export function CloudDataPanel({
  userId,
  workspace,
  onRestoreWorkspace,
  onRestorePlan,
  onCloudDataChanged,
}: {
  userId: string;
  workspace?: CloudWorkspaceData | null;
  onRestoreWorkspace?: (workspace: CloudWorkspaceData) => void;
  onRestorePlan?: (plan: PublicPlanData) => void;
  onCloudDataChanged?: () => void;
}) {
  const [consent, setConsent] = useState<AccountDataConsentData | null>(null);
  const [plans, setPlans] = useState<SavedPlanData[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const next = await getAccountDataConsent();
    setConsent(next);
    setPlans(next.current ? (await getSavedPlans()).plans : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void reload().catch((cause) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "云端数据状态加载失败。");
    });
    return () => { cancelled = true; };
  }, [reload, workspace?.revision]);

  if (consent && !consent.cloudSyncEnabled) return null;

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : "云端数据操作失败。"); }
    finally { setBusy(null); }
  }

  function reopenConsent() {
    window.localStorage.removeItem(`cloud-consent-dismissed:${userId}:${TERMS_VERSION}:${PRIVACY_VERSION}`);
    onCloudDataChanged?.();
  }

  return (
    <Card data-cloud-data-panel>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Cloud className="size-4" />账号云端工作区</CardTitle>
        <CardDescription>
          {consent?.current ? `已同步至修订 ${workspace?.revision ?? "—"}，最近同步 ${formatDate(workspace?.syncedAt ?? null)}` : "当前保持纯本地模式，不会上传已有数据。"}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
        {!consent?.current ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-sm text-muted-foreground">确认新版政策后才会开始自动同步。</p>
            <Button type="button" variant="outline" onClick={reopenConsent}>查看同步说明</Button>
          </div>
        ) : (
          <>
            <section className="grid gap-3" aria-labelledby="cloud-revisions-title">
              <div className="flex items-center justify-between gap-3">
                <h3 id="cloud-revisions-title" className="flex items-center gap-2 font-medium"><History className="size-4" />可恢复版本</h3>
                <Badge variant="secondary">最多 10 版 · 30 天</Badge>
              </div>
              {workspace?.revisions.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {workspace.revisions.map((revision) => (
                    <div key={revision.id} className="flex min-h-14 items-center justify-between gap-3 border px-3 py-2">
                      <span className="text-xs text-muted-foreground">修订 {revision.revision}<br />{formatDate(revision.createdAt)}</span>
                      <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => void run(`revision:${revision.id}`, async () => {
                        const restored = await putCloudWorkspace({ restoreRevisionId: revision.id });
                        onRestoreWorkspace?.(restored);
                        onCloudDataChanged?.();
                      })}><RotateCcw />{busy === `revision:${revision.id}` ? "恢复中…" : "恢复"}</Button>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">覆盖一次工作区后，这里会保留上一版本。</p>}
            </section>

            <section className="grid gap-3 border-t pt-4" aria-labelledby="cloud-plans-title">
              <div className="flex items-center justify-between gap-3">
                <h3 id="cloud-plans-title" className="font-medium">排班历史</h3>
                <Badge variant="secondary">最近 5 条 · 固定 5 条</Badge>
              </div>
              {plans.length ? plans.map((plan) => (
                <div key={plan.id} className="flex flex-wrap items-center gap-2 border px-3 py-3">
                  <button type="button" className="min-h-11 min-w-0 flex-1 text-left" onClick={() => onRestorePlan?.(plan.result)}>
                    <span className="block truncate text-sm font-medium">{plan.title}</span>
                    <span className="block text-xs text-muted-foreground">{formatDate(plan.updatedAt)}</span>
                  </button>
                  <Button type="button" size="sm" variant="ghost" disabled={busy !== null} aria-label={plan.pinned ? "取消固定排班" : "固定排班"} onClick={() => void run(`pin:${plan.id}`, async () => {
                    await updateSavedPlan(plan.id, !plan.pinned); await reload();
                  })}>{plan.pinned ? <PinOff /> : <Pin />}</Button>
                  <Button type="button" size="sm" variant="ghost" disabled={busy !== null} aria-label="删除排班" onClick={() => void run(`delete:${plan.id}`, async () => {
                    await deleteSavedPlan(plan.id); await reload();
                  })}><Trash2 /></Button>
                </div>
              )) : <p className="text-sm text-muted-foreground">生成排班后会自动出现在这里。</p>}
            </section>

            <section className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div>
                <h3 className="font-medium">撤销同步授权</h3>
                <p className="mt-1 text-xs text-muted-foreground">按住确认后删除工作区、Box 密文、排班历史与缓存引用，并回到纯本地模式。</p>
              </div>
              <HoldToConfirm disabled={busy !== null} onConfirm={() => void run("revoke", async () => {
                await revokeAccountDataConsent();
                window.localStorage.removeItem(cloudSyncMetadataKey(userId));
                window.localStorage.setItem(`cloud-consent-dismissed:${userId}:${TERMS_VERSION}:${PRIVACY_VERSION}`, "1");
                setConsent((current) => current ? { ...current, current: false, revokedAt: new Date().toISOString() } : current);
                setPlans([]);
                onCloudDataChanged?.();
              })}><ShieldX />按住撤销并删除</HoldToConfirm>
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}
