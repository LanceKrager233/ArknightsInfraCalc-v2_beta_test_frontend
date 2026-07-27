"use client";

import { CSSProperties } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  FACTORY_RECIPE_OPTIONS,
  factoryRecipeFor,
  type FactoryRecipe,
  maxRoomLevel,
  TRADE_ORDER_OPTIONS,
  tradeOrderFor,
  type TradeOrder,
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
  onFactoryRecipeChange: (roomId: string, recipe: FactoryRecipe) => void;
  onTradeOrderChange: (roomId: string, order: TradeOrder) => void;
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
  onTradeOrderChange,
  onFactoryRecipeChange,
}: {
  row: RoomRow;
  layoutRoom: BaseBlueprint["rooms"][number] | undefined;
  visual: ReturnType<typeof roomVisualFor>;
  efficiency: ReturnType<typeof presentRoomEfficiency>;
  slotCount: number;
  slots: (RoomRow["operatorSlots"][number] | undefined)[];
  currentMoraleByOperator?: ReadonlyMap<string, number>;
  onTradeOrderChange: CompactScheduleViewProps["onTradeOrderChange"];
  onFactoryRecipeChange: CompactScheduleViewProps["onFactoryRecipeChange"];
}) {
  const isTrade = layoutRoom?.kind === "trade_post";
  const isFactory = layoutRoom?.kind === "factory";
  const rowStyle = { "--room-accent": visual.accent } as CSSProperties;

  return (
    <div className="flex flex-col gap-2 bg-[#313131] px-3 py-2" style={rowStyle}>
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
          return (
          <Select
            items={TRADE_ORDER_OPTIONS.map((o) => ({ value: o.order, label: o.label }))}
            value={order}
            onValueChange={(value) => onTradeOrderChange(row.roomId, value as TradeOrder)}
          >
            <SelectTrigger size="sm" className={`ml-auto w-[100px] ${accent}`}>
              <SelectValue placeholder="选择" />
            </SelectTrigger>
            <SelectContent className="min-w-0">
              {TRADE_ORDER_OPTIONS.map((o) => (
                <SelectItem key={o.order} value={o.order}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          );
        })() : isFactory ? (() => {
          const recipe = factoryRecipeFor(layoutRoom!);
          const accent = FACTORY_ACCENT[recipe] || "border-white/20 text-white bg-[#3C3C3C]/70";
          return (
          <Select
            items={FACTORY_RECIPE_OPTIONS.map((o) => ({ value: o.recipe, label: o.label }))}
            value={recipe}
            onValueChange={(value) => onFactoryRecipeChange(row.roomId, value as FactoryRecipe)}
          >
            <SelectTrigger size="sm" className={`ml-auto w-[100px] ${accent}`}>
              <SelectValue placeholder="选择" />
            </SelectTrigger>
            <SelectContent className="min-w-0">
              {FACTORY_RECIPE_OPTIONS.map((o) => (
                <SelectItem key={o.recipe} value={o.recipe}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
  const { rows, layout, currentMoraleByOperator, onFactoryRecipeChange, onTradeOrderChange } = props;

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

  const production = [...getGroup("trading"), ...getGroup("manufacture")];
  const power = getGroup("power");
  const dorms = getGroup("dormitory");
  const hire = getGroup("hire");
  const processing = getGroup("processing");
  const powerCount = power.length;

  const rows1: RoomRow[][] = [
    [...getGroup("control"), ...getGroup("meeting")],
  ];
  if (powerCount === 3) {
    rows1.push([...production.slice(0, 2), ...power.slice(0, 1)]);
    rows1.push([...production.slice(2, 4), ...power.slice(1, 2), ...hire]);
    rows1.push([...production.slice(4, 6), ...power.slice(2, 3), ...processing]);
  } else {
    rows1.push(production.slice(0, 3));
    rows1.push(production.slice(3, 6));
    rows1.push([...production.slice(6, 7), ...power, ...hire, ...processing]);
  }
  for (let i = 0; i < dorms.length; i += 2) {
    rows1.push(dorms.slice(i, i + 2));
  }

  function makeCard(row: RoomRow) {
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
        onTradeOrderChange={onTradeOrderChange}
        onFactoryRecipeChange={onFactoryRecipeChange}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rows1.map((rowRooms, ri) => (
        <div key={ri} className="flex items-center justify-center gap-3">
          {rowRooms.map(makeCard)}
        </div>
      ))}
    </div>
  );
}
