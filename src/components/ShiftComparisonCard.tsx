"use client";

import { CheckCircle2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import { MOTION_DURATION, MOTION_EASE_OUT } from "@/motion";
import type { ShiftAdjustment, ShiftAdjustmentIssue, ShiftComparison } from "@/types";

const ROOM_LABELS: Record<string, string> = { control: "控制中枢", trading: "贸易站", manufacture: "制造站", power: "发电站", dormitory: "宿舍", meeting: "会客室", hire: "办公室", processing: "加工站" };
const ISSUE_LABELS: Record<ShiftAdjustmentIssue, string> = { missing: "需换入", unexpected: "需换出", misplaced: "位置调整", tired: "疲劳" };

export function roomKeyLabel(key: string | null) {
  if (!key) return "未进驻";
  const [group, indexText] = key.split(":");
  const groupLabel = ROOM_LABELS[group] ?? "未知设施";
  const index = Number(indexText);
  return group === "control" ? groupLabel : `${groupLabel} ${Number.isFinite(index) ? index + 1 : indexText}`;
}

function issueTone(issue: ShiftAdjustmentIssue) {
  if (issue === "tired") return "bg-red-100 text-red-800";
  if (issue === "missing") return "bg-sky-100 text-sky-800";
  if (issue === "unexpected") return "bg-amber-100 text-amber-800";
  return "bg-zinc-200 text-zinc-800";
}

function StatusBadges({ adjustment }: { adjustment: ShiftAdjustment }) {
  return <div className="flex flex-wrap gap-1">{adjustment.issues.map((issue) => <span key={issue} className={cn("px-1.5 py-0.5 text-[11px] font-medium", issueTone(issue))}>{ISSUE_LABELS[issue]}</span>)}</div>;
}

const ACTION_ISSUES = ["unexpected", "missing", "misplaced"] as const;

function actionDescription(adjustment: ShiftAdjustment, issue: typeof ACTION_ISSUES[number]) {
  if (issue === "unexpected") return `从 ${roomKeyLabel(adjustment.currentRoomKey)} 换出`;
  if (issue === "missing") return `换入 ${roomKeyLabel(adjustment.targetRoomKey)}`;
  return `${roomKeyLabel(adjustment.currentRoomKey)} → ${roomKeyLabel(adjustment.targetRoomKey)}`;
}

function MobileAdjustmentGroups({ adjustments, reduceMotion }: { adjustments: ShiftAdjustment[]; reduceMotion: boolean }) {
  const tiredOnly = adjustments.filter((adjustment) => adjustment.issues.includes("tired") && !ACTION_ISSUES.some((issue) => adjustment.issues.includes(issue)));

  return (
    <div className="mt-5 grid gap-5 sm:hidden" aria-label="换班动作摘要" data-mobile-adjustment-groups>
      {ACTION_ISSUES.map((issue) => {
        const items = adjustments.filter((adjustment) => adjustment.issues.includes(issue));
        return (
          <section key={issue} aria-labelledby={`mobile-adjustment-${issue}`} data-adjustment-group={issue}>
            <div className="flex items-center justify-between gap-3">
              <h4 id={`mobile-adjustment-${issue}`} className="text-sm font-semibold">{ISSUE_LABELS[issue]}</h4>
              <span className="font-number text-xs text-muted-foreground">{items.length} 人</span>
            </div>
            {items.length ? (
              <ul className="mt-2 grid gap-2">
                {items.map((adjustment, index) => (
                  <motion.li
                    key={adjustment.operator}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-muted/45 px-3 py-3"
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: reduceMotion ? 0 : MOTION_DURATION.content, delay: reduceMotion ? 0 : index * 0.035, ease: MOTION_EASE_OUT }}
                  >
                    <div className="min-w-0">
                      <strong className="block truncate">{adjustment.operator}</strong>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{actionDescription(adjustment, issue)}</span>
                    </div>
                    {adjustment.issues.includes("tired") ? <span className={cn("px-1.5 py-0.5 text-[11px] font-medium", issueTone("tired"))}>疲劳</span> : null}
                  </motion.li>
                ))}
              </ul>
            ) : <p className="mt-2 bg-muted/25 px-3 py-2.5 text-xs text-muted-foreground">无</p>}
          </section>
        );
      })}
      {tiredOnly.length ? (
        <section aria-labelledby="mobile-adjustment-tired" data-adjustment-group="tired">
          <div className="flex items-center justify-between gap-3">
            <h4 id="mobile-adjustment-tired" className="text-sm font-semibold">疲劳提醒</h4>
            <span className="font-number text-xs text-muted-foreground">{tiredOnly.length} 人</span>
          </div>
          <p className="mt-2 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-800">{tiredOnly.map((adjustment) => adjustment.operator).join("、")}</p>
        </section>
      ) : null}
    </div>
  );
}

function DesktopAdjustmentTable({ adjustments, reduceMotion }: { adjustments: ShiftAdjustment[]; reduceMotion: boolean }) {
  return (
    <table className="mt-5 hidden w-full table-fixed border-collapse sm:table" aria-label="干员房间调整" data-desktop-adjustment-table>
      <colgroup>
        <col style={{ width: "22%" }} />
        <col style={{ width: "20%" }} />
        <col style={{ width: "29%" }} />
        <col style={{ width: "29%" }} />
      </colgroup>
      <thead className="border-y border-border/70 bg-muted/45 text-xs font-medium text-muted-foreground">
        <tr>
          <th className="px-3 py-2 text-left font-medium">操作</th>
          <th className="px-3 py-2 text-left font-medium">干员</th>
          <th className="px-3 py-2 text-left font-medium">当前房间</th>
          <th className="px-3 py-2 text-left font-medium">目标房间</th>
        </tr>
      </thead>
      <tbody>
        {adjustments.map((adjustment, index) => (
          <motion.tr
            key={adjustment.operator}
            className="border-b border-border/60 align-middle"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : MOTION_DURATION.content, delay: reduceMotion ? 0 : index * 0.035, ease: MOTION_EASE_OUT }}
          >
            <td className="px-3 py-3"><StatusBadges adjustment={adjustment} /></td>
            <td className="px-3 py-3 font-semibold">{adjustment.operator}</td>
            <td className="px-3 py-3 text-sm">{roomKeyLabel(adjustment.currentRoomKey)}</td>
            <td className="px-3 py-3 text-sm">{roomKeyLabel(adjustment.targetRoomKey)}</td>
          </motion.tr>
        ))}
      </tbody>
    </table>
  );
}

export function ShiftComparisonDetails({ comparison }: { comparison: ShiftComparison | null }) {
  const reduceMotion = useReducedMotion();
  if (!comparison) return null;
  const exactMatch = comparison.adjustments.length === 0;
  return (
    <section className="pt-4 text-sm" aria-labelledby="closest-shift-title" data-shift-comparison-details>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2"><div><span className="text-xs font-medium text-muted-foreground">当前状态匹配</span><h3 id="closest-shift-title" className="mt-0.5 text-base font-semibold">当前最接近第 <span className="font-number">{comparison.planIndex + 1}</span> 班</h3></div><div className="text-right"><span className="text-xs text-muted-foreground">房间匹配</span><strong className="ml-2 text-lg tabular-nums">{comparison.score}%</strong></div></div>
      <div className="mt-3 h-1.5 overflow-hidden bg-border/70" role="progressbar" aria-label="房间匹配百分比" aria-valuemin={0} aria-valuemax={100} aria-valuenow={comparison.score}><div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, comparison.score))}%` }} /></div>
      {exactMatch ? (
        <div className="mt-5 flex gap-3 border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-900" role="status"><CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><div><strong className="block">当前进驻与排班完全一致</strong><span className="mt-1 block text-xs text-emerald-800/75">无需换入、换出或调整房间。</span></div></div>
      ) : (
        <>
          <MobileAdjustmentGroups adjustments={comparison.adjustments} reduceMotion={Boolean(reduceMotion)} />
          <DesktopAdjustmentTable adjustments={comparison.adjustments} reduceMotion={Boolean(reduceMotion)} />
        </>
      )}
    </section>
  );
}
