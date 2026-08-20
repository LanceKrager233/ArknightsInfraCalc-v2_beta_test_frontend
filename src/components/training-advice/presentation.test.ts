import assert from "node:assert/strict";
import test from "node:test";

import {
  sortTrainingCombinations,
  sortTrainingRecommendations,
  trainingCombinationStateLabel,
  trainingLevelText,
  trainingPriorityLabel,
  trainingProductLabel,
  trainingMemberRoleLabel,
  trainingScaleLabel,
} from "./presentation.ts";
import type { TrainingCombination, TrainingRecommendation } from "@/types";

test("labels map product, state, level and priority", () => {
  assert.equal(trainingProductLabel("trade"), "贸易");
  assert.equal(trainingProductLabel("general_manufacturing"), "制造");
  assert.equal(trainingProductLabel(null), "综合");
  assert.equal(trainingScaleLabel("system"), "体系组合");
  assert.equal(trainingScaleLabel("small"), "小型组合");
  assert.equal(trainingMemberRoleLabel("core"), "核心");
  assert.equal(trainingMemberRoleLabel("important"), "重要");
  assert.equal(trainingMemberRoleLabel("secondary"), "次级");
  assert.equal(trainingMemberRoleLabel("hanger"), "挂件");
  assert.equal(trainingCombinationStateLabel("missing_core"), "缺失核心");
  assert.equal(trainingLevelText({ elite: 2 }), "精2");
  assert.equal(trainingLevelText({ elite: 0, level: 30 }), "精0 Lv30");
  assert.equal(trainingPriorityLabel(50), "P1");
  assert.equal(trainingPriorityLabel(55), "P2");
  assert.equal(trainingPriorityLabel(70), "P3");
  assert.equal(trainingPriorityLabel(null), "—");
});

test("sorts combinations by severity, tier and completion", () => {
  const combinations: TrainingCombination[] = [
    { id: "a", name: "完成", state: "complete", tier: "high_efficiency", completion_percent: 100 },
    { id: "b", name: "缺核", state: "missing_core", tier: "high_efficiency", completion_percent: 0 },
    { id: "c", name: "需培养", state: "needs_training", tier: "high_efficiency", completion_percent: 50 },
    { id: "d", name: "低效完成", state: "complete", tier: "low_efficiency", completion_percent: 100 },
  ];
  assert.deepEqual(
    sortTrainingCombinations(combinations).map((item) => item.id),
    ["b", "c", "a", "d"],
  );
});

test("sorts recommendations by priority rank ascending", () => {
  const recommendations: TrainingRecommendation[] = [
    { operator: "低", priority_rank: 70 },
    { operator: "高", priority_rank: 50 },
    { operator: "中", priority_rank: 55 },
  ];
  assert.deepEqual(
    sortTrainingRecommendations(recommendations).map((item) => item.operator),
    ["高", "中", "低"],
  );
});
