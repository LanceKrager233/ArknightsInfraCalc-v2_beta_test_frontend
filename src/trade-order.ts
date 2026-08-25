export type TradeOrderValue = "gold" | "originium";

export function isTradeOrderAllowed(level: number, order: TradeOrderValue) {
  return order !== "originium" || level >= 3;
}

export function normalizeTradeOrderForLevel(level: number, order: TradeOrderValue): TradeOrderValue {
  return isTradeOrderAllowed(level, order) ? order : "gold";
}
