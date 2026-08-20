"use client";

import { motion, useReducedMotion } from "motion/react";

import { OperatorSlot } from "@/components";
import { InfraTechnicalCard } from "@/components/InfraTechnicalCard";
import { MOTION_DURATION, MOTION_EASE_OUT } from "@/motion";
import { operatorPortraitFor } from "@/operatorPortraits";
import type { OperBoxEntry, TrainingAdviceTarget } from "@/types";

import {
  trainingLevelText,
  trainingPriorityLabel,
  trainingProductGroup,
  trainingProductLabel,
} from "./presentation";

const ACTION_LABELS: Record<string, string> = { acquire: "获取", train: "培养" };
const REASON_LABELS: Record<string, string> = {
  combination_core: "组合核心",
  combination_important: "组合重要",
};

type ActionCardItem = {
  action?: string;
  operator: string;
  product?: string | null;
  priority_rank?: number | null;
  reason?: string | null;
  target?: TrainingAdviceTarget | null;
  current?: { elite: number; level?: number } | null;
  combination_name?: string | null;
};

export function TrainingAdviceActionCard({
  action,
  entry,
  index,
}: {
  action: ActionCardItem;
  entry?: OperBoxEntry;
  index: number;
}) {
  const reduceMotion = useReducedMotion();
  const actionLabel = ACTION_LABELS[action.action ?? ""] ?? "建议";
  const currentText = action.current ? `当前 ${trainingLevelText(action.current)} → ` : "";
  const targetText = trainingLevelText(action.target);

  return (
    <motion.div
      initial={{ opacity: 0, y: reduceMotion ? 0 : 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : MOTION_DURATION.content,
        delay: reduceMotion ? 0 : Math.min(index, 5) * 0.035,
        ease: MOTION_EASE_OUT,
      }}
    >
      <InfraTechnicalCard
        group={trainingProductGroup(action.product)}
        dataSlot="training-advice-card"
        showEmblem={false}
      >
        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
          <OperatorSlot
            slot={{
              name: action.operator,
              label: action.operator,
              portrait: operatorPortraitFor(action.operator, entry?.id),
            }}
            portraitSize={80}
          />
          <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/55">
                <span className="font-medium text-[var(--room-accent)]">
                  {trainingProductLabel(action.product)}
                </span>
                {action.combination_name ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{action.combination_name}</span>
                  </>
                ) : null}
              </div>
              <p className="mt-2 max-w-[72ch] text-pretty text-sm leading-6 text-white/82">
                {actionLabel}「{action.operator}」{currentText}目标 {targetText}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
              <span className="font-number border border-[var(--room-accent)] bg-[var(--room-accent)] px-2.5 py-1 text-xs font-semibold text-[#202223]">
                {trainingPriorityLabel(action.priority_rank)}
              </span>
              <span className="border border-white/15 bg-white/7 px-2.5 py-1 text-xs text-white/70">
                {REASON_LABELS[action.reason ?? ""] ?? actionLabel}
              </span>
            </div>
          </div>
        </div>
      </InfraTechnicalCard>
    </motion.div>
  );
}
