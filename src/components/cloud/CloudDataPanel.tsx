"use client";

import { Cloud } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

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
import { HoldToConfirm } from "@/components/ui/hold-to-confirm";
import { InfraTechnicalCard, InfraTechnicalHeading } from "@/components/InfraTechnicalCard";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/legal-policy";
import type { AccountDataConsentData, CloudWorkspaceData, PublicPlanData, SavedPlanData } from "@/types";

const CLOUD_PRIMARY_BUTTON_CLASS = "w-full bg-white text-[#272a2b] hover:bg-white/90 sm:w-auto";
const CLOUD_INLINE_BUTTON_CLASS = "min-w-0 bg-white text-[#272a2b] hover:bg-white/90 max-sm:min-w-0 sm:min-w-32";

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
  const panelId = useId();

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
    <InfraTechnicalCard group="control" className="min-h-64" dataSlot="cloud-workspace-card">
      <section className="flex h-full flex-col" aria-labelledby={`${panelId}-title`} data-cloud-data-panel>
        <InfraTechnicalHeading
          icon={<Cloud className="size-4" aria-hidden="true" />}
          titleId={`${panelId}-title`}
        >
          账号云端工作区
        </InfraTechnicalHeading>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/64">
          {consent?.current ? `已同步至修订 ${workspace?.revision ?? "—"}，最近同步 ${formatDate(workspace?.syncedAt ?? null)}` : "当前保持纯本地模式，不会上传已有数据。"}
        </p>
        <div className="mt-5 grid gap-5">
          {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
          {!consent?.current ? (
            <div className="flex flex-col items-start gap-4 border-t border-white/14 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-white/64">确认新版政策后才会开始自动同步。</p>
              <Button type="button" size="dialog" className={CLOUD_PRIMARY_BUTTON_CLASS} onClick={reopenConsent}>查看同步说明</Button>
            </div>
          ) : (
            <>
            <section className="grid gap-3" aria-labelledby={`${panelId}-revisions-title`}>
              <div className="flex items-center justify-between gap-3">
                <h3 id={`${panelId}-revisions-title`} className="text-xs font-medium tracking-wide text-white/66">可恢复版本</h3>
                <Badge variant="ghost" className="bg-white/10 text-white/72">最多 10 版 · 30 天</Badge>
              </div>
              {workspace?.revisions.length ? (
                <div className="grid gap-2 xl:grid-cols-2">
                  {workspace.revisions.map((revision) => (
                    <div key={revision.id} className="grid gap-3 border border-white/16 bg-black/12 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <span className="text-sm leading-6 text-white/64">修订 {revision.revision}<br />{formatDate(revision.createdAt)}</span>
                      <Button type="button" size="dialog" className={CLOUD_PRIMARY_BUTTON_CLASS} disabled={busy !== null} onClick={() => void run(`revision:${revision.id}`, async () => {
                        const restored = await putCloudWorkspace({ restoreRevisionId: revision.id });
                        onRestoreWorkspace?.(restored);
                        onCloudDataChanged?.();
                      })}>{busy === `revision:${revision.id}` ? "恢复中…" : "恢复"}</Button>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm leading-6 text-white/64">覆盖一次工作区后，这里会保留上一版本。</p>}
            </section>

            <section className="grid gap-3 border-t border-white/14 pt-5" aria-labelledby={`${panelId}-plans-title`}>
              <div className="flex items-center justify-between gap-3">
                <h3 id={`${panelId}-plans-title`} className="text-xs font-medium tracking-wide text-white/66">排班历史</h3>
                <Badge variant="ghost" className="bg-white/10 text-white/72">最近 5 条 · 固定 5 条</Badge>
              </div>
              {plans.length ? plans.map((plan) => (
                <div key={plan.id} className="grid gap-3 border border-white/16 bg-black/12 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <button type="button" className="min-h-11 min-w-0 text-left" onClick={() => onRestorePlan?.(plan.result)}>
                    <span className="block truncate text-sm font-medium text-white">{plan.title}</span>
                    <span className="block text-xs leading-5 text-white/64">{formatDate(plan.updatedAt)} · 点击恢复此排班</span>
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" size="dialog" className={CLOUD_INLINE_BUTTON_CLASS} disabled={busy !== null} onClick={() => void run(`pin:${plan.id}`, async () => {
                      await updateSavedPlan(plan.id, !plan.pinned); await reload();
                    })}>{plan.pinned ? "取消固定排班" : "固定排班"}</Button>
                    <Button type="button" size="dialog" variant="destructive" className="min-w-0 max-sm:min-w-0 sm:min-w-32" disabled={busy !== null} onClick={() => void run(`delete:${plan.id}`, async () => {
                      await deleteSavedPlan(plan.id); await reload();
                    })}>删除排班</Button>
                  </div>
                </div>
              )) : <p className="text-sm leading-6 text-white/64">生成排班后会自动出现在这里。</p>}
            </section>

            <section className="flex flex-col items-start gap-4 border-t border-white/14 pt-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-xs font-medium tracking-wide text-white/66">撤销同步授权</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/64">按住确认后删除工作区、Box 密文、排班历史与缓存引用，并回到纯本地模式。</p>
              </div>
              <HoldToConfirm className="w-full rounded-[22px] border-transparent bg-destructive/10 px-4 text-[13px] font-semibold text-destructive shadow-none hover:bg-destructive/20 sm:min-h-[46px] sm:w-auto sm:min-w-[196px]" disabled={busy !== null} onConfirm={() => void run("revoke", async () => {
                await revokeAccountDataConsent();
                window.localStorage.removeItem(cloudSyncMetadataKey(userId));
                window.localStorage.setItem(`cloud-consent-dismissed:${userId}:${TERMS_VERSION}:${PRIVACY_VERSION}`, "1");
                setConsent((current) => current ? { ...current, current: false, revokedAt: new Date().toISOString() } : current);
                setPlans([]);
                onCloudDataChanged?.();
              })}>按住撤销并删除</HoldToConfirm>
            </section>
            </>
          )}
        </div>
      </section>
    </InfraTechnicalCard>
  );
}
