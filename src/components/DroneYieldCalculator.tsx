"use client";

import { Plane } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { estimateDroneYield } from "@/drone-yield";
import type { RoomRow } from "@/schedule";

export function DroneYieldCalculator({ rows }: { rows: RoomRow[] }) {
  const rooms = useMemo(() => rows.filter((row) => row.group === "trading" || row.group === "manufacture"), [rows]);
  const [roomKey, setRoomKey] = useState("");
  const [drones, setDrones] = useState(100);
  const selected = rooms.find((row) => row.key === roomKey) ?? rooms[0];
  const estimate = selected ? estimateDroneYield(selected, drones) : null;
  const comparable = rooms
    .map((row) => ({ row, estimate: estimateDroneYield(row, drones) }))
    .filter((item): item is { row: RoomRow; estimate: NonNullable<ReturnType<typeof estimateDroneYield>> } => Boolean(item.estimate));
  const best = comparable.length ? comparable.reduce((current, item) => item.estimate.value > current.estimate.value ? item : current) : null;

  if (!rooms.length) return null;
  return (
    <section className="border-y border-border/70 bg-muted/20 px-4 py-4" aria-labelledby="drone-yield-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="drone-yield-title" className="flex items-center gap-2 text-sm font-semibold"><Plane className="size-4 text-[#016E65]" aria-hidden="true" />无人机收益试算</h3>
          <p className="mt-1 text-xs text-muted-foreground">按当前班次效率估算；1 架无人机折算 3 分钟加速。</p>
        </div>
        {best ? <span className="text-xs text-muted-foreground">当前最高：{best.row.title}</span> : null}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(12rem,1fr)_9rem_minmax(12rem,1fr)] sm:items-end">
        <label className="grid gap-1.5 text-xs font-medium">目标设施
          <select className="min-h-11 rounded-md border border-input bg-background px-3 text-sm" value={selected?.key ?? ""} onChange={(event) => setRoomKey(event.target.value)}>
            {rooms.map((row) => <option key={row.key} value={row.key}>{row.title} · {row.product ?? "当前产物"}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-medium">无人机数量
          <Input className="min-h-11" type="number" inputMode="numeric" min={0} max={200} value={drones} onChange={(event) => setDrones(Math.max(0, Math.min(200, Number(event.target.value) || 0)))} />
        </label>
        <div className="min-h-11 border-l-4 border-[#FFD800] bg-background px-3 py-2" aria-live="polite">
          <span className="block text-xs text-muted-foreground">预计额外产出</span>
          <strong className="font-number text-lg">{estimate ? `${Math.round(estimate.value).toLocaleString()} ${estimate.unit}` : "数据不足"}</strong>
        </div>
      </div>
    </section>
  );
}
