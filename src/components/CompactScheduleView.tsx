"use client";

import { CSSProperties } from "react";

import type { FactoryRecipe, TradeOrder } from "@/blueprint";
import { maxRoomLevel } from "@/blueprint";
import { OperatorSlot, RoomProductControls, roomVisualFor } from "@/components";
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

function roomSlotCountFor(group: string) {
  if (group === "trading" || group === "manufacture") return 3;
  return 5;
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

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row) => {
        const layoutRoom = layout.rooms.find((room) => room.id === row.roomId);
        const visual = roomVisualFor(row.group);
        const efficiency = presentRoomEfficiency(row.group, row.efficiency);
        const slotCount = roomSlotCountFor(row.group);
        const slots = Array.from({ length: slotCount }, (_, index) => row.operatorSlots[index]);
        const rowStyle = {
          "--room-accent": visual.accent,
        } as CSSProperties;

        return (
          <div
            key={row.key}
            className="flex flex-col gap-3 bg-[#313131] px-4 py-3"
            style={rowStyle}
          >
            {/* Row 1: room name + efficiency */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span className="h-6 w-1 shrink-0 bg-[var(--room-accent)]" aria-hidden="true" />
                <span className="text-lg font-medium text-white">{row.title}</span>
                {row.level ? (
                  <span className="text-xs text-white/50">
                    Lv.{row.level}/{layoutRoom ? maxRoomLevel(layoutRoom.kind) : row.level}
                  </span>
                ) : null}
              </div>
              {efficiency ? (
                <div className="shrink-0 text-right">
                  {row.group === "power" ? (
                    <span className="text-base font-semibold tabular-nums text-[var(--room-accent)]">
                      {efficiency.primaryValue}
                    </span>
                  ) : row.group === "trading" || row.group === "manufacture" ? (
                    <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-white/72">
                      <span className="font-semibold tabular-nums text-[var(--room-accent)]">
                        {efficiency.primaryValue}
                      </span>
                      {efficiency.details.map((detail) => (
                        <span key={detail.label} className={detail.kind === "cross-station" ? "text-[#C8F75A]" : undefined}>
                          / {detail.label} {detail.value}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm tabular-nums text-white/60">
                      {efficiency.primaryValue}
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            {/* Row 2: product controls */}
            <RoomProductControls
              row={row}
              layoutRoom={layoutRoom}
              onFactoryRecipeChange={onFactoryRecipeChange}
              onTradeOrderChange={onTradeOrderChange}
            />

            {/* Row 3: operator slots */}
            <div
              className="grid items-center justify-items-center gap-2.5"
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
      })}
    </div>
  );
}
