import type { RoomRow } from "./schedule.ts";

const TRADE_BASE_DAILY: Record<number, number> = { 1: 10_000, 2: 10_141, 3: 10_265 };
const DRONES_PER_DAY = 480;

export interface DroneYieldEstimate {
  value: number;
  unit: string;
  product: string;
}

export function estimateDroneYield(row: RoomRow, drones: number): DroneYieldEstimate | null {
  const efficiency = row.efficiency?.final_efficiency;
  if (!Number.isFinite(efficiency) || !row.level || drones < 0) return null;
  const product = row.product ?? "";
  let baseDaily: number;
  let unit: string;
  if (row.group === "trading") {
    const originium = product.includes("开采") || product.includes("源石");
    baseDaily = originium ? 240 : TRADE_BASE_DAILY[row.level] ?? 0;
    unit = originium ? "合成玉" : "龙门币";
  } else if (row.group === "manufacture") {
    if (product.includes("作战")) { baseDaily = 8_000; unit = "经验"; }
    else if (product.includes("源石")) { baseDaily = 24; unit = "源石碎片"; }
    else { baseDaily = 20; unit = "赤金"; }
  } else return null;
  return { value: drones * baseDaily * efficiency / DRONES_PER_DAY, unit, product: product || "当前产物" };
}
