export const OPERATOR_NAME_SIZE_CLASS = "text-xs max-sm:text-[10px]";

export const COMPACT_OPERATOR_SIZE_CLASS =
  "[--operator-slot-size:clamp(56px,5.3vw,68px)]";

export const COMPACT_OPERATOR_ROW_CLASS =
  "flex items-start justify-start gap-2";

export const COMPACT_CARD_CLASS =
  "flex flex-col justify-start gap-2 bg-[#313131] px-3 py-2";

export const COMPACT_HEADER_CLASS =
  "flex h-7 shrink-0 items-center gap-2";

export const COMPACT_ROOM_TITLE_CLASS =
  "shrink-0 whitespace-nowrap text-sm font-medium text-white";

export const COMPACT_ROOM_LEVEL_CLASS =
  "min-w-0 truncate text-xs text-white/50";

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
