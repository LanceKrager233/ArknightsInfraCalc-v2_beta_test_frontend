import { randomUUID } from "node:crypto";

import {
  assertSameOrigin,
  createRequestId,
  enforceRateLimit,
  failureResponse,
  PublicApiError,
  readJsonBody,
  requestClientIp,
  successResponse,
} from "@/server/api-contract";
import { requireWebsiteSession } from "@/server/auth/authorization";
import { getDatabase } from "@/server/db";
import { telemetryEvent } from "@/server/db/schema";
import { activeSklandAccount, readSklandAccountStore } from "@/server/skland/http";
import { sklandDataOwnerTag } from "@/server/skland/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TELEMETRY_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_EVENTS_PER_REQUEST = 20;

const ALLOWED_TYPES = new Set(["performance", "interaction", "navigation", "error"]);
const ALLOWED_NAMES = new Set([
  "web_vitals_fcp",
  "web_vitals_lcp",
  "web_vitals_cls",
  "web_vitals_ttfb",
  "web_vitals_inp",
  "long_task_total",
  "resource_images",
  "plan_click",
  "plan_submit",
  "plan_response",
  "plan_render",
  "plan_result",
  "page_view",
  "js_error",
  "api_error",
]);
const ALLOWED_META_KEYS = new Set([
  "error_code",
  "cache_hit",
  "count",
  "bytes",
  "shift_index",
]);

function validateEvent(value: unknown): { sessionId: string; type: string; name: string; durationMs?: number; value?: number; page?: string; meta?: Record<string, unknown> } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const event = value as Record<string, unknown>;
  if (typeof event.sessionId !== "string" || event.sessionId.length === 0 || event.sessionId.length > 128) return null;
  if (typeof event.type !== "string" || !ALLOWED_TYPES.has(event.type)) return null;
  if (typeof event.name !== "string" || !ALLOWED_NAMES.has(event.name)) return null;
  const durationMs = event.durationMs === undefined ? undefined : Number(event.durationMs);
  const numberValue = event.value === undefined ? undefined : Number(event.value);
  if (durationMs !== undefined && (!Number.isInteger(durationMs) || durationMs < 0)) return null;
  if (numberValue !== undefined && (!Number.isInteger(numberValue) || numberValue < 0)) return null;
  if (event.page !== undefined && typeof event.page !== "string") return null;
  if (event.page !== undefined && event.page.length > 120) return null;

  let meta: Record<string, unknown> | undefined;
  if (event.meta !== undefined) {
    if (!event.meta || typeof event.meta !== "object" || Array.isArray(event.meta)) return null;
    const rawMeta = event.meta as Record<string, unknown>;
    meta = {};
    for (const [key, metaValue] of Object.entries(rawMeta)) {
      if (!ALLOWED_META_KEYS.has(key)) return null;
      if (typeof metaValue !== "string" && typeof metaValue !== "number" && typeof metaValue !== "boolean") return null;
      meta[key] = metaValue;
    }
  }
  return { sessionId: event.sessionId, type: event.type, name: event.name, durationMs, value: numberValue, page: event.page as string | undefined, meta };
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  try {
    assertSameOrigin(request);
    const ip = requestClientIp(request);
    enforceRateLimit("telemetry", ip, 60, 60_000, "AIC-RATE-6001");

    const body = await readJsonBody(request, 128 * 1024) as { events?: unknown };
    if (!Array.isArray(body.events) || body.events.length === 0 || body.events.length > MAX_EVENTS_PER_REQUEST) {
      throw new PublicApiError("AIC-REQ-1001", {
        fieldErrors: [{ path: "events", code: "invalid_events", message: "埋点事件数量需要在 1-20 之间。" }],
      });
    }
    const events = body.events.map(validateEvent);
    if (events.some((event) => event === null)) {
      throw new PublicApiError("AIC-REQ-1001", {
        fieldErrors: [{ path: "events", code: "invalid_event", message: "埋点事件包含未知类型或字段。" }],
      });
    }

    let userId: string | null = null;
    try {
      userId = (await requireWebsiteSession(request)).user.id;
    } catch {
      // 游客埋点不强制登录。
    }
    let dataOwnerTag: string | null = null;
    try {
      const account = activeSklandAccount(await readSklandAccountStore());
      if (account) dataOwnerTag = sklandDataOwnerTag(account.session.userId);
    } catch {
      // 无森空岛会话时为 null。
    }

    const now = new Date();
    const validEvents = events as NonNullable<ReturnType<typeof validateEvent>>[];
    await getDatabase().insert(telemetryEvent).values(
      validEvents.map((event) => ({
        id: randomUUID(),
        sessionId: event.sessionId,
        userId,
        dataOwnerTag,
        type: event.type,
        name: event.name,
        durationMs: event.durationMs ?? null,
        value: event.value ?? null,
        page: event.page ?? null,
        meta: event.meta ?? null,
        createdAt: now,
        expiresAt: new Date(now.getTime() + TELEMETRY_TTL_MS),
      })),
    );

    return successResponse({ accepted: validEvents.length }, requestId);
  } catch (error) {
    return failureResponse(error, requestId, "/api/telemetry", startedAt, "AIC-SYS-5000");
  }
}
