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
        <div className="mt-5" role="table" aria-label="干员房间调整"><div className="hidden grid-cols-[minmax(7rem,.8fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_minmax(8rem,1.1fr)] border-y border-border/70 bg-muted/45 px-3 py-2 text-xs font-medium text-muted-foreground sm:grid" role="row"><span role="columnheader">干员</span><span role="columnheader">当前</span><span role="columnheader">目标</span><span role="columnheader">状态</span></div><div role="rowgroup">{comparison.adjustments.map((adjustment, index) => <motion.div key={adjustment.operator} className="grid gap-2 border-b border-border/60 py-3 sm:grid-cols-[minmax(7rem,.8fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_minmax(8rem,1.1fr)] sm:items-center sm:px-3" role="row" initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : MOTION_DURATION.content, delay: reduceMotion ? 0 : index * 0.035, ease: MOTION_EASE_OUT }}><strong role="cell">{adjustment.operator}</strong><div className="grid grid-cols-[3.5rem_1fr] text-xs sm:block sm:text-sm" role="cell"><span className="text-muted-foreground sm:hidden">当前</span><span>{roomKeyLabel(adjustment.currentRoomKey)}</span></div><div className="grid grid-cols-[3.5rem_1fr] text-xs sm:block sm:text-sm" role="cell"><span className="text-muted-foreground sm:hidden">目标</span><span>{roomKeyLabel(adjustment.targetRoomKey)}</span></div><div className="grid grid-cols-[3.5rem_1fr] items-start sm:block" role="cell"><span className="text-xs text-muted-foreground sm:hidden">状态</span><StatusBadges adjustment={adjustment} /></div></motion.div>)}</div></div>
      )}
    </section>
  );
}
