import type { CSSProperties } from "react";

export const OPERATOR_NAME_SIZE_CLASS = "text-xs max-sm:text-[10px]";

export const COMPACT_OPERATOR_SIZE_CLASS =
  "[--operator-slot-size:clamp(64px,5.9vw,76px)]";

export const COMPACT_OPERATOR_ROW_CLASS =
  "flex items-start justify-start gap-2";

export const COMPACT_GRID_CLASS = "-mx-[80px] flex items-stretch gap-3";
export const COMPACT_COLUMN_CLASS = "flex min-w-0 flex-col gap-3";
export const COMPACT_DORM_WRAPPER_CLASS = "flex min-h-0 flex-1";
export const COMPACT_DORM_OPERATOR_AREA_CLASS =
  "flex min-h-0 flex-1 items-center";

export const COMPACT_AUXILIARY_WIDTHS = {
  meeting: 50,
  hire: 25,
  processing: 25,
} as const;

export const COMPACT_CARD_CLASS =
  "relative flex flex-col justify-start gap-2 overflow-hidden bg-[#313131] px-3 py-2";

export const COMPACT_POWER_CARD_CLASS =
  "relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 overflow-hidden bg-[#313131] px-3 py-2";

export const COMPACT_POWER_OPERATOR_ROW_CLASS =
  "flex items-start justify-end gap-2";

export const COMPACT_HEADER_CLASS =
  "flex h-7 shrink-0 items-center gap-2";

export const COMPACT_ROOM_TITLE_CLASS =
  "shrink-0 whitespace-nowrap text-sm font-medium text-white";

export const COMPACT_ROOM_LEVEL_CLASS =
  "min-w-0 truncate text-xs text-white/50";

export const COMPACT_ROOM_BACKGROUND_CLASS =
  "pointer-events-none absolute inset-0 bg-no-repeat opacity-[0.52]";

export const COMPACT_ROOM_GRADIENT_CLASS =
  "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#313131]/20 via-[#313131]/72 to-[#313131]";

export const COMPACT_ROOM_BACKGROUND_STYLE = {
  backgroundPosition: "-18px center",
  backgroundSize: "auto 176px",
} satisfies CSSProperties;

const PRODUCT_FALLBACK =
  "border-white/20 text-white bg-[#3C3C3C]/70";

const TRADE_ACCENT: Record<string, string> = {
  gold: "border-transparent bg-transparent text-[#22BBFF]",
  originium: "border-transparent bg-[#8F1E26] text-white",
};

const FACTORY_ACCENT: Record<string, string> = {
  all: "border-transparent bg-[#FFD800] text-[#313131]",
  gold: "border-transparent bg-transparent text-[#FFD800]",
  battle_record: "border-transparent bg-transparent text-[#1F7DCE]",
  originium: "border-transparent bg-[#8F1E26] text-white",
};

export function compactTradeAccent(order: string) {
  return TRADE_ACCENT[order] ?? PRODUCT_FALLBACK;
}

export function compactFactoryAccent(recipe: string) {
  return FACTORY_ACCENT[recipe] ?? PRODUCT_FALLBACK;
}

export function isCompactScheduleGroupVisible(group: string) {
  return Boolean(group);
}

export function usesCompactHorizontalCard(group: string, powerCount: number) {
  return group === "power" && powerCount !== 2;
}
