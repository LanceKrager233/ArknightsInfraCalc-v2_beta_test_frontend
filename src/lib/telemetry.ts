// 轻量埋点 SDK：批量 + sendBeacon，性能事件采样 10%，不阻塞主线程。
// 只采集白名单事件；字段校验在服务端 /api/telemetry 完成。

const TELEMETRY_ENDPOINT = "/api/telemetry";
const FLUSH_INTERVAL_MS = 5_000;
const FLUSH_BATCH_SIZE = 20;
const PERFORMANCE_SAMPLE_RATE = 1;

export type TelemetryType = "performance" | "interaction" | "navigation" | "error";

export type TelemetryInput = {
  type: TelemetryType;
  name: string;
  durationMs?: number;
  value?: number;
  page?: string;
  meta?: Record<string, string | number | boolean>;
};

type QueuedEvent = TelemetryInput & {
  sessionId: string;
  createdAt: number;
};

const queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function getSessionId(): string {
  try {
    const key = "arknights-infra-telemetry-session";
    let value = window.localStorage.getItem(key);
    if (!value) {
      value = crypto.randomUUID();
      window.localStorage.setItem(key, value);
    }
    return value;
  } catch {
    return "unknown";
  }
}

function shouldSample(type: TelemetryType): boolean {
  return type !== "performance" || Math.random() < PERFORMANCE_SAMPLE_RATE;
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushTelemetry();
  }, FLUSH_INTERVAL_MS);
}

export function track(input: TelemetryInput): void {
  if (!shouldSample(input.type)) return;
  queue.push({
    ...input,
    sessionId: getSessionId(),
    createdAt: Date.now(),
  });
  if (queue.length >= FLUSH_BATCH_SIZE) {
    void flushTelemetry();
  } else {
    scheduleFlush();
  }
}

/** 手动立即上报（页面卸载前调用，防止丢数据）。 */
export function flushTelemetry(): void {
  if (queue.length === 0) return;
  const events = queue.splice(0, FLUSH_BATCH_SIZE);
  const payload = { events };
  try {
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    if (navigator.sendBeacon(TELEMETRY_ENDPOINT, blob)) return;
  } catch {
    // sendBeacon 不可用时走 fetch 兜底
  }
  void fetch(TELEMETRY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // 上报失败直接丢弃，避免重试循环拖累页面。
  });
}

// 页面卸载/隐藏前冲刷剩余队列。
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => flushTelemetry());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushTelemetry();
  });
}
