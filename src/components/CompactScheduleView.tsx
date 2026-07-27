"use client";

import { CSSProperties } from "react";

import {
  factoryRecipeFor,
  maxRoomLevel,
  tradeOrderFor,
} from "@/blueprint";
import { OperatorSlot, roomVisualFor } from "@/components";
import { presentRoomEfficiency } from "@/efficiency";
import type { RoomRow } from "@/schedule";
import type { BaseBlueprint, MaaPlan } from "@/types";

export interface CompactScheduleViewProps {
  rows: RoomRow[];
  layout: BaseBlueprint;
  currentMoraleByOperator?: ReadonlyMap<string, number>;
  activeShift: number;
  activePlan?: MaaPlan;
  onIssue: (row: RoomRow) => void;
}

const TRADE_ACCENT: Record<string, string> = {
  gold: "border-transparent bg-[#22BBFF] text-[#313131]",
  originium: "border-transparent bg-[#8F1E26] text-white",
};

const FACTORY_ACCENT: Record<string, string> = {
  all: "border-transparent bg-[#FFD800] text-[#313131] ",
  gold: "border-transparent bg-[#FFD800] text-[#313131]",
  battle_record: "border-transparent bg-[#1F7DCE] text-white",
  originium: "border-transparent bg-[#8F1E26] text-white",
};

/** 布局宽度百分比，自己改数值 */
const GRID_LEFT_PCT = 55;   // 左大列宽度%
const GRID_RIGHT_PCT = 45;  // 右大列宽度%

function roomSlotCountFor(group: string) {
  if (group === "trading" || group === "manufacture") return 3;
  if (group === "meeting") return 2;
  if (group === "power" || group === "hire" || group === "processing") return 1;
  return 5;
}

function CompactRoomCard({
  row,
  layoutRoom,
  visual,
  efficiency,
  slotCount,
  slots,
  currentMoraleByOperator,
  className = "",
  style,
}: {
  row: RoomRow;
  layoutRoom: BaseBlueprint["rooms"][number] | undefined;
  visual: ReturnType<typeof roomVisualFor>;
  efficiency: ReturnType<typeof presentRoomEfficiency>;
  slotCount: number;
  slots: (RoomRow["operatorSlots"][number] | undefined)[];
  currentMoraleByOperator?: ReadonlyMap<string, number>;
  className?: string;
  style?: CSSProperties;
}) {
  const isTrade = layoutRoom?.kind === "trade_post";
  const isFactory = layoutRoom?.kind === "factory";
  const rowStyle = { "--room-accent": visual.accent } as CSSProperties;

  return (
    <div className={`flex flex-col justify-center gap-2 bg-[#313131] px-3 py-2 ${className}`} style={{ ...rowStyle, ...style }}>
      <div className="flex items-center gap-2">
        <span className="h-5 w-1 shrink-0 bg-[var(--room-accent)]" aria-hidden="true" />
        <span className="text-sm font-medium text-white">{row.title}</span>
        {row.level ? (
          <span className="text-xs text-white/50">
            Lv.{row.level}/{layoutRoom ? maxRoomLevel(layoutRoom.kind) : row.level}
          </span>
        ) : null}
        {isTrade ? (() => {
          const order = tradeOrderFor(layoutRoom!);
          const accent = TRADE_ACCENT[order] || "border-white/20 text-white bg-[#3C3C3C]/70";
          const label = order === "gold" ? "龙门商法" : order === "originium" ? "开采协力" : order;
          return (
            <div className={`ml-auto flex h-7 w-[90px] items-center justify-center rounded border px-2 text-xs ${accent}`}>
              {label}
            </div>
          );
        })() : isFactory ? (() => {
          const recipe = factoryRecipeFor(layoutRoom!);
          const accent = FACTORY_ACCENT[recipe] || "border-white/20 text-white bg-[#3C3C3C]/70";
          const label = recipe === "all" ? "自动选择" : recipe === "gold" ? "贵金属" : recipe === "battle_record" ? "作战记录" : recipe === "originium" ? "源石碎片" : recipe;
          return (
            <div className={`ml-auto flex h-7 w-[90px] items-center justify-center rounded border px-2 text-xs ${accent}`}>
              {label}
            </div>
          );
        })() : null}
      </div>
      {efficiency ? (
        <div>
          {row.group === "power" ? (
            <span className="text-sm font-semibold tabular-nums text-[var(--room-accent)]">{efficiency.primaryValue}</span>
          ) : row.group === "trading" || row.group === "manufacture" ? (
            <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-white/72">
              <span className="font-semibold tabular-nums text-[var(--room-accent)]">{efficiency.primaryValue}</span>
              {efficiency.details.map((detail) => (
                <span key={detail.label} className={detail.kind === "cross-station" ? "text-[#C8F75A]" : undefined}>
                  / {detail.label} {detail.value}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm tabular-nums text-white/60">{efficiency.primaryValue}</span>
          )}
        </div>
      ) : null}
      <div
        className="grid items-center justify-items-center gap-1.5"
        style={{ gridTemplateColumns: `repeat(${slotCount}, minmax(0, 1fr))` }}
      >
        {slots.map((slot, index) => (
          <OperatorSlot
            key={`${slot?.name ?? "empty"}-${index}`}
            slot={slot}
            currentMorale={slot ? currentMoraleByOperator?.get(slot.name) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export function CompactScheduleView(props: CompactScheduleViewProps) {
  const { rows, layout, currentMoraleByOperator } = props;

  if (rows.length === 0) {
    return (
      <div className="flex min-h-[420px] items-center justify-center border-y border-dashed border-border/70 py-6 text-center text-sm text-muted-foreground">
        没有可展示的布局房间。
      </div>
    );
  }

  const byGroup = new Map<string, RoomRow[]>();
  for (const row of rows) {
    const list = byGroup.get(row.group) ?? [];
    list.push(row);
    byGroup.set(row.group, list);
  }
  const getGroup = (group: string) => byGroup.get(group) ?? [];

  const workstations = [...getGroup("trading"), ...getGroup("manufacture")];
  const power = getGroup("power");
  const dorms = getGroup("dormitory");
  const powerCount = power.length;

  function makeCard(row: RoomRow, widthPercent?: number) {
    const layoutRoom = layout.rooms.find((r) => r.id === row.roomId);
    const visual = roomVisualFor(row.group);
    const efficiency = presentRoomEfficiency(row.group, row.efficiency);
    const slotCount = roomSlotCountFor(row.group);
    const slots = Array.from({ length: slotCount }, (_, i) => row.operatorSlots[i]);
    return (
      <CompactRoomCard
        key={row.key}
        row={row}
        layoutRoom={layoutRoom!}
        visual={visual}
        efficiency={efficiency}
        slotCount={slotCount}
        slots={slots}
        currentMoraleByOperator={currentMoraleByOperator}
        className="min-w-0"
        style={widthPercent !== undefined ? { flexBasis: `${widthPercent}%` } : { flex: 1 }}
      />
    );
  }

  const ctrl = getGroup("control")[0];
  const meeting = getGroup("meeting")[0];
  const office = getGroup("hire")[0];
  const workshop = getGroup("processing")[0];

  return (
    <div
      className="-ml-10 -mr-10 grid gap-3"
      style={{ gridTemplateColumns: `${GRID_LEFT_PCT}% ${GRID_RIGHT_PCT}%` }}
    >
      {/* Row 1: 控制中枢 | 会客室 办公室 加工站 */}
      {ctrl ? makeCard(ctrl) : <div />}
      <div className="flex justify-between gap-3">
        {meeting && makeCard(meeting, 48)}
        {office && makeCard(office, 26)}
        {workshop && makeCard(workshop, 26)}
      </div>

      {/* Row 2-4: 工作站×2(各50%) | 宿舍 */}
      {[0, 2, 4].map((start) => (
        <>
          <div className="flex justify-between gap-3">
            {workstations[start] && makeCard(workstations[start], 50)}
            {workstations[start + 1] && makeCard(workstations[start + 1], 50)}
          </div>
          {dorms[start / 2] ? makeCard(dorms[start / 2]) : <div />}
        </>
      ))}

      {/* Row 5 */}
      {powerCount === 3 ? (
        <>
          <div className="flex justify-between gap-3">
            {power.slice(0, 3).map((p) => makeCard(p, 33))}
          </div>
          {dorms[3] ? makeCard(dorms[3]) : <div />}
        </>
      ) : (
        <>
          <div className="flex justify-between gap-3">
            <div className="flex justify-between gap-3" style={{ flexBasis: "50%" }}>
              {power[0] && makeCard(power[0])}
              {power[1] && makeCard(power[1])}
            </div>
            {workstations[6] && makeCard(workstations[6], 50)}
          </div>
          {dorms[3] ? makeCard(dorms[3]) : <div />}
        </>
      )}
    </div>
  );
}
