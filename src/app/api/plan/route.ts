import { runPlan } from "@/server/infra";
import { validateLayoutJson } from "@/layout-validation";
import { assertOperbox } from "@/operbox";
import {
  acquirePlanSlot,
  assertPlanCollectionLimits,
  assertSameOrigin,
  createRequestId,
  enforceRateLimit,
  failureResponse,
  PublicApiError,
  readJsonBody,
  requestClientIp,
  successResponse,
} from "@/server/api-contract";
import { safeDisplayName, toPublicPlanData } from "@/server/public-plan";
import type { BaseBlueprint, OperBoxEntry } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  let release: (() => void) | undefined;
  try {
    assertSameOrigin(request);
    const ip = requestClientIp(request);
    enforceRateLimit("plan", ip, 20, 10 * 60_000, "AIC-PLAN-3002");
    release = acquirePlanSlot(ip);

    const body = await readJsonBody(request, 2 * 1024 * 1024) as {
      layout?: BaseBlueprint;
      operbox?: OperBoxEntry[];
      sourceName?: unknown;
    };
    const layoutErrors = validateLayoutJson(body?.layout);
    if (layoutErrors.length || !body.layout) {
      throw new PublicApiError("AIC-LAYOUT-1201", {
        fieldErrors: (layoutErrors.length ? layoutErrors : ["布局格式无效。"]).map((message) => ({
          path: "layout",
          code: "invalid_layout",
          message,
        })),
      });
    }
    if (!Array.isArray(body.operbox)) {
      throw new PublicApiError("AIC-BOX-1101", {
        fieldErrors: [{
          path: "operbox",
          code: "invalid_operbox",
          message: "干员数据需要是数组。",
        }],
      });
    }
    assertPlanCollectionLimits(body.operbox.length, body.layout.rooms.length, body.sourceName);
    let operbox: OperBoxEntry[];
    try {
      operbox = assertOperbox(body.operbox);
    } catch (error) {
      throw new PublicApiError("AIC-BOX-1101", {
        fieldErrors: [{
          path: "operbox",
          code: "invalid_operbox_entry",
          message: error instanceof Error ? error.message : "干员数据包含无效记录。",
        }],
        cause: error,
      });
    }
    const sourceName = safeDisplayName(body.sourceName, "已导入的干员数据");
    const result = await runPlan({ layout: body.layout, operbox, sourceName });
    return successResponse(
      toPublicPlanData(result, { layoutLabel: body.layout.template, sourceName }, requestId),
      requestId
    );
  } catch (error) {
    return failureResponse(error, requestId, "/api/plan", startedAt, "AIC-SYS-5000");
  } finally {
    release?.();
  }
}
