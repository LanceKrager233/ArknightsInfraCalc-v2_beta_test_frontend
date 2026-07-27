"use client";

import { Fragment, type CSSProperties } from "react";

import {
  factoryRecipeFor,
  maxRoomLevel,
  tradeOrderFor,
} from "@/blueprint";
import { OperatorSlot, roomVisualFor } from "@/components";
import { presentRoomEfficiency } from "@/efficiency";
import {
  COMPACT_AUXILIARY_WIDTHS,
  COMPACT_CARD_CLASS,
  COMPACT_GRID_CLASS,
  COMPACT_HEADER_CLASS,
  COMPACT_OPERATOR_ROW_CLASS,
  COMPACT_POWER_CARD_CLASS,
  COMPACT_POWER_OPERATOR_ROW_CLASS,
  COMPACT_ROOM_LEVEL_CLASS,
  COMPACT_ROOM_TITLE_CLASS,
  compactFactoryAccent,
  compactTradeAccent,
  isCompactScheduleGroupVisible,
} from "@/schedule-view-presentation";
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
  slots,
  currentMoraleByOperator,
  className = "",
  style,
}: {
  row: RoomRow;
  layoutRoom: BaseBlueprint["rooms"][number] | undefined;
  visual: ReturnType<typeof roomVisualFor>;
  efficiency: ReturnType<typeof presentRoomEfficiency>;
  slots: (RoomRow["operatorSlots"][number] | undefined)[];
  currentMoraleByOperator?: ReadonlyMap<string, number>;
  className?: string;
  style?: CSSProperties;
}) {
  const isTrade = layoutRoom?.kind === "trade_post";
  const isFactory = layoutRoom?.kind === "factory";
  const isPower = row.group === "power";
  const rowStyle = { "--room-accent": visual.accent } as CSSProperties;

  const header = (
    <div className={COMPACT_HEADER_CLASS}>
      <span className="h-5 w-1 shrink-0 bg-[var(--room-accent)]" aria-hidden="true" />
      <span className={COMPACT_ROOM_TITLE_CLASS}>{row.title}</span>
      {row.level ? (
          <span className={COMPACT_ROOM_LEVEL_CLASS}>
            Lv.{row.level}/{layoutRoom ? maxRoomLevel(layoutRoom.kind) : row.level}
          </span>
        ) : null}
        {isTrade ? (() => {
          const order = tradeOrderFor(layoutRoom!);
          const accent = compactTradeAccent(order);
          const label = order === "gold" ? "龙门商法" : order === "originium" ? "开采协力" : order;
          return (
            <div className={`ml-auto flex h-7 w-[90px] items-center justify-center rounded border px-2 text-xs ${accent}`}>
              {label}
            </div>
          );
        })() : isFactory ? (() => {
          const recipe = factoryRecipeFor(layoutRoom!);
          const accent = compactFactoryAccent(recipe);
          const label = recipe === "all" ? "自动选择" : recipe === "gold" ? "贵金属" : recipe === "battle_record" ? "作战记录" : recipe === "originium" ? "源石碎片" : recipe;
          return (
            <div className={`ml-auto flex h-7 w-[90px] items-center justify-center rounded border px-2 text-xs ${accent}`}>
              {label}
            </div>
          );
      })() : null}
    </div>
  );

  const efficiencyBlock = efficiency ? (
    <div>
      {isPower ? (
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
  ) : null;

  const operators = slots.map((slot, index) => (
    <OperatorSlot
      key={`${slot?.name ?? "empty"}-${index}`}
      slot={slot}
      currentMorale={slot ? currentMoraleByOperator?.get(slot.name) : undefined}
      compactView
    />
  ));

  if (isPower) {
    return (
      <div className={`${COMPACT_POWER_CARD_CLASS} ${className}`} style={{ ...rowStyle, ...style }}>
        <div className="min-w-0">
          {header}
          <div className="mt-2">{efficiencyBlock}</div>
        </div>
        <div className={COMPACT_POWER_OPERATOR_ROW_CLASS}>
          {operators}
        </div>
      </div>
    );
  }

  return (
    <div className={`${COMPACT_CARD_CLASS} ${className}`} style={{ ...rowStyle, ...style }}>
      {header}
      {efficiencyBlock}
      <div className={COMPACT_OPERATOR_ROW_CLASS}>
        {operators}
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
    if (!isCompactScheduleGroupVisible(row.group)) continue;
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

  return (
    <div
      className={COMPACT_GRID_CLASS}
      style={{ gridTemplateColumns: `${GRID_LEFT_PCT}% ${GRID_RIGHT_PCT}%` }}
    >
      {/* Row 1: 控制中枢 | 会客室 办公室 */}
      {ctrl ? makeCard(ctrl) : <div />}
      <div className="flex justify-between gap-3">
        {meeting && makeCard(meeting, COMPACT_AUXILIARY_WIDTHS.meeting)}
        {office && makeCard(office, COMPACT_AUXILIARY_WIDTHS.hire)}
      </div>

      {/* Row 2-4: 工作站×2(各50%) | 宿舍 */}
      {[0, 2, 4].map((start) => (
        <Fragment key={start}>
          <div className="flex justify-between gap-3">
            {workstations[start] && makeCard(workstations[start], 50)}
            {workstations[start + 1] && makeCard(workstations[start + 1], 50)}
          </div>
          {dorms[start / 2] ? makeCard(dorms[start / 2]) : <div />}
        </Fragment>
      ))}

      {/* Row 5 */}
      {powerCount === 3 ? (
        <>
          <div className="flex items-start justify-between gap-3">
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
