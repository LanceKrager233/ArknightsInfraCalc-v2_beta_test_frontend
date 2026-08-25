import type { MaaJson, MaaOperatorSlot } from "./types.ts";

const PRELOAD_CONCURRENCY = 6;
export const OPERATOR_PORTRAIT_CACHE = "operator-portraits-v1";

let portraitCacheRegistration: Promise<void> | null = null;

async function ensurePortraitCache() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  portraitCacheRegistration ??= navigator.serviceWorker
    .register("/operator-portrait-cache-sw.js", { scope: "/" })
    .then(() => navigator.serviceWorker.ready)
    .then(() => undefined)
    .catch(() => undefined);
  await portraitCacheRegistration;
}

export async function clearOperatorPortraitCache(
  cacheStorage: Pick<CacheStorage, "delete"> | undefined = globalThis.caches,
): Promise<boolean> {
  if (!cacheStorage) return false;
  await cacheStorage.delete(OPERATOR_PORTRAIT_CACHE);
  return true;
}

function operatorName(value: string | MaaOperatorSlot | null): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (value && typeof value.name === "string") return value.name.trim() || null;
  return null;
}

export function scheduleOperatorNames(maa: MaaJson): string[] {
  const names = new Set<string>();
  for (const plan of maa.plans) {
    for (const rooms of Object.values(plan.rooms)) {
      for (const room of rooms ?? []) {
        for (const operator of room.operators) {
          const name = operatorName(operator);
          if (name) names.add(name);
        }
      }
    }
    const targets = plan.Fiammetta?.target;
    for (const target of Array.isArray(targets) ? targets : targets ? [targets] : []) {
      const name = target.trim();
      if (name) names.add(name);
    }
  }
  return [...names];
}

export async function preloadWithConcurrency<T>(items: T[], load: (item: T) => Promise<void>, concurrency = PRELOAD_CONCURRENCY) {
  let next = 0;
  const workers = Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      try { await load(item); } catch { /* 预加载失败不影响排班展示。 */ }
    }
  });
  await Promise.all(workers);
}

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const image = new Image();
    const finish = () => resolve();
    image.addEventListener("load", () => {
      if (typeof image.decode === "function") void image.decode().catch(() => undefined).finally(finish);
      else finish();
    }, { once: true });
    image.addEventListener("error", finish, { once: true });
    image.src = url;
    if (image.complete) {
      if (typeof image.decode === "function") void image.decode().catch(() => undefined).finally(finish);
      else finish();
    }
  });
}

export async function preloadSchedulePortraits(maa: MaaJson) {
  if (typeof Image === "undefined") return;
  await ensurePortraitCache();
  const { operatorPortraitFor } = await import("./operatorPortraits.ts");
  const urls = [...new Set(scheduleOperatorNames(maa).map((name) => operatorPortraitFor(name)).filter((url): url is string => Boolean(url)))];
  await preloadWithConcurrency(urls, preloadImage);
}
