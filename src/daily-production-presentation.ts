import type { DailyProductionAmount, DailyProductionEstimate } from "./daily-production.ts";
import { PRODUCT_ICON_URLS } from "./product-assets.ts";
import type { RotationJson } from "./types.ts";

type SolverDailyProduction = NonNullable<RotationJson["daily"]["production"]>;

export type ProductionDetailProduct = {
  id: string;
  label: string;
  unit: string;
  icon: string;
  amount: DailyProductionAmount;
  rows: Array<[string, number | null, string]>;
  relation?: string;
  note?: string;
};

export type DailyProductionGroup = {
  id: string;
  source: "solver" | "estimate";
  primary: ProductionDetailProduct;
  supporting?: ProductionDetailProduct;
};

function dailyAmount(value: number): DailyProductionAmount {
  return { value, natural: value, drones: 0 };
}

function originiumBottleneck(production: DailyProductionEstimate): string {
  if (production.orundum.bottleneck === "manufacture") return "源石碎片制造";
  if (production.orundum.bottleneck === "trade") return "合成玉订单";
  if (production.orundum.bottleneck === "balanced") return "两段持平";
  if (production.orundum.bottleneck === "none") return "暂无搓玉产线";
  return "产出数据不足";
}

function solverGroups(production: SolverDailyProduction): DailyProductionGroup[] {
  const goldUnits = production.pure_gold / 500;
  return [
    {
      id: "experience",
      source: "solver",
      primary: {
        id: "experience",
        label: "经验",
        unit: "经验",
        icon: PRODUCT_ICON_URLS.experience,
        amount: dailyAmount(production.battle_records),
        rows: [["求解器日产量", production.battle_records, "经验"]],
      },
    },
    {
      id: "lmd",
      source: "solver",
      primary: {
        id: "lmd-orders",
        label: "龙门币",
        unit: "龙门币",
        icon: PRODUCT_ICON_URLS.lmdOrders,
        amount: dailyAmount(production.lmd),
        rows: [["求解器日产量", production.lmd, "龙门币"]],
      },
      supporting: {
        id: "gold",
        label: "赤金",
        unit: "枚",
        icon: PRODUCT_ICON_URLS.gold,
        amount: dailyAmount(goldUnits),
        rows: [["求解器日产量", goldUnits, "枚"]],
        relation: "订单原料",
      },
    },
    {
      id: "orundum",
      source: "solver",
      primary: {
        id: "orundum",
        label: "合成玉",
        unit: "合成玉",
        icon: PRODUCT_ICON_URLS.orundum,
        amount: dailyAmount(production.orundum),
        rows: [["求解器日产量", production.orundum, "合成玉"]],
      },
      supporting: {
        id: "shards",
        label: "源石碎片",
        unit: "枚",
        icon: PRODUCT_ICON_URLS.shards,
        amount: dailyAmount(production.originium_shards),
        rows: [["求解器日产量", production.originium_shards, "枚"]],
        relation: "制造环节",
      },
    },
  ];
}

function estimateGroups(production: DailyProductionEstimate): DailyProductionGroup[] {
  return [
    {
      id: "experience",
      source: "estimate",
      primary: {
        id: "experience",
        label: "经验",
        unit: "经验",
        icon: PRODUCT_ICON_URLS.experience,
        amount: production.experience,
        rows: [["自然制造", production.experience.natural, "经验"], ["无人机制造", production.experience.drones, "经验"]],
      },
    },
    {
      id: "lmd",
      source: "estimate",
      primary: {
        id: "lmd-orders",
        label: "龙门币",
        unit: "龙门币",
        icon: PRODUCT_ICON_URLS.lmdOrders,
        amount: production.lmdOrders,
        rows: [["自然订单", production.lmdOrders.natural, "龙门币"], ["无人机订单", production.lmdOrders.droneTrade, "龙门币"]],
      },
      supporting: {
        id: "gold",
        label: "赤金",
        unit: "枚",
        icon: PRODUCT_ICON_URLS.gold,
        amount: production.gold,
        rows: [["自然制造", production.gold.natural, "枚"], ["无人机制造", production.gold.drones, "枚"]],
        relation: "订单原料",
      },
    },
    {
      id: "orundum",
      source: "estimate",
      primary: {
        id: "orundum",
        label: "合成玉",
        unit: "合成玉",
        icon: PRODUCT_ICON_URLS.orundum,
        amount: production.orundum,
        rows: [["碎片阶段可供", production.orundum.manufactureCapacity, "合成玉"], ["订单阶段可交付", production.orundum.tradeCapacity, "合成玉"]],
        note: `限制环节：${originiumBottleneck(production)}`,
      },
      supporting: {
        id: "shards",
        label: "源石碎片",
        unit: "枚",
        icon: PRODUCT_ICON_URLS.shards,
        amount: production.shards,
        rows: [["自然制造", production.shards.natural, "枚"], ["无人机制造", production.shards.drones, "枚"]],
        relation: "制造环节",
      },
    },
  ];
}

export function dailyProductionGroups(
  estimate: DailyProductionEstimate | null,
  solverProduction: SolverDailyProduction | null,
): DailyProductionGroup[] {
  if (solverProduction) return solverGroups(solverProduction);
  return estimate ? estimateGroups(estimate) : [];
}
