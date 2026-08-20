import type { TrainingAdviceTarget, TrainingCombination, TrainingRecommendation } from "@/types";

const PRODUCT_LABELS: Record<string, string> = {
  trade: "贸易",
  gold: "赤金",
  experience: "作战记录",
  general_manufacturing: "制造",
};

const FACILITY_LABELS: Record<string, string> = {
  trade_station: "贸易站",
  manufacturing_station: "制造站",
  power_station: "发电站",
  control_center: "控制中枢",
  dormitory: "宿舍",
  meeting_room: "会客室",
  office: "办公室",
  training_room: "训练室",
  workshop: "加工站",
};

const STATE_LABELS: Record<string, string> = {
  complete: "已完成",
  needs_training: "需培养",
  missing_core: "缺失核心",
  missing_important: "缺失重要",
};

const MEMBER_PROGRESS_LABELS: Record<string, string> = {
  ready: "就绪",
  missing: "缺失",
  owned_needs_training: "需培养",
};

const MEMBER_ROLE_LABELS: Record<string, string> = {
  core: "核心",
  important: "重要",
  secondary: "次级",
  hanger: "挂件",
};

export function trainingProductLabel(product?: string | null): string {
  return product ? PRODUCT_LABELS[product] ?? product : "综合";
}

export function trainingProductGroup(product?: string | null): string {
  return product === "trade" ? "trading" : "manufacture";
}

export function trainingScaleLabel(scale?: string | null): string {
  if (scale === "system") return "体系组合";
  if (scale === "small") return "小型组合";
  return scale ?? "—";
}

export function trainingFacilityLabel(facility: string): string {
  return FACILITY_LABELS[facility] ?? facility;
}

export function trainingCombinationStateLabel(state?: string): string {
  return state ? STATE_LABELS[state] ?? state : "未知";
}

export function trainingLevelText(target?: TrainingAdviceTarget | null): string {
  if (!target || typeof target.elite !== "number") return "—";
  return target.level ? `精${target.elite} Lv${target.level}` : `精${target.elite}`;
}

export function trainingMemberProgressLabel(progress?: string): string {
  return progress ? MEMBER_PROGRESS_LABELS[progress] ?? progress : "未知";
}

export function trainingMemberRoleLabel(role?: string): string {
  return role ? MEMBER_ROLE_LABELS[role] ?? role : "—";
}

export function trainingPriorityLabel(rank?: number | null): string {
  if (rank == null) return "—";
  if (rank <= 50) return "P1";
  if (rank <= 55) return "P2";
  return "P3";
}

const STATE_SEVERITY: Record<string, number> = {
  missing_core: 0,
  needs_training: 1,
  missing_important: 2,
  complete: 3,
};

export function sortTrainingCombinations(
  combinations: readonly TrainingCombination[],
): TrainingCombination[] {
  return [...combinations].sort((left, right) => {
    const severity = (STATE_SEVERITY[left.state ?? ""] ?? 4) - (STATE_SEVERITY[right.state ?? ""] ?? 4);
    if (severity !== 0) return severity;
    if (left.tier !== right.tier) return left.tier === "high_efficiency" ? -1 : 1;
    return (left.completion_percent ?? 0) - (right.completion_percent ?? 0);
  });
}

export function sortTrainingRecommendations(
  recommendations: readonly TrainingRecommendation[],
): TrainingRecommendation[] {
  return [...recommendations].sort(
    (left, right) => (left.priority_rank ?? 999) - (right.priority_rank ?? 999),
  );
}
