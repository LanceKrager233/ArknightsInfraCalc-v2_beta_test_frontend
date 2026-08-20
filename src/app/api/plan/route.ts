import { runPlan } from "@/server/infra";
import { validateLayoutJson } from "@/layout-validation";
import { assertOperbox } from "@/operbox";
import {
  acquirePlanSlot,
  assertFiammettaEnableCompatible,
  assertPlanCollectionLimits,
  assertSameOrigin,
  createRequestId,
  enforceRateLimit,
  failureResponse,
  normalizeFiammettaEnable,
  PublicApiError,
  readJsonBody,
  requestClientIp,
  successResponse,
} from "@/server/api-contract";
import { safeDisplayName, toPublicPlanData } from "@/server/public-plan";
import { isRotationProfile } from "@/rotation-settings";
import type { BaseBlueprint, OperBoxEntry, RotationProfile } from "@/types";
import { activeSklandAccount, readSklandAccountStore } from "@/server/skland/http";
import { sklandDataOwnerTag } from "@/server/skland/session";
import { requireWebsiteSession } from "@/server/auth/authorization";
import { planAccessMode } from "@/server/plan-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  let release: (() => void) | undefined;
  try {
    const includeDebug = new URL(request.url).searchParams.get("beta") === "1";
    assertSameOrigin(request);
    const ip = requestClientIp(request);
    enforceRateLimit("plan", ip, 20, 10 * 60_000, "AIC-PLAN-3002");
    release = acquirePlanSlot(ip);

    const body = await readJsonBody(request, 2 * 1024 * 1024) as {
      layout?: BaseBlueprint;
      operbox?: OperBoxEntry[];
      sourceName?: unknown;
      rotation?: unknown;
      boxSource?: unknown;
      fiammetta_enable?: unknown;
    };
    if (planAccessMode(body.boxSource, body.operbox !== undefined) === "trusted-sample") {
      const sample = await (await import("@/server/infra")).getSampleOperbox();
      body.operbox = sample.operbox as OperBoxEntry[];
      body.sourceName = "243 全精二示例";
    } else {
      await requireWebsiteSession(request);
    }
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
    let rotation: RotationProfile = "abc_12_6_6";
    if (body.rotation !== undefined) {
      if (!isRotationProfile(body.rotation)) {
        throw new PublicApiError("AIC-PLAN-3001", {
          fieldErrors: [{
            path: "rotation",
            code: "invalid_rotation",
            message: "换班参数不在当前求解器支持范围内。",
          }],
        });
      }
      rotation = body.rotation;
    }
    const fiammettaEnable = normalizeFiammettaEnable(body.fiammetta_enable);
    assertFiammettaEnableCompatible(fiammettaEnable, rotation);
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
    let dataOwnerTag: string | null = null;
    if (body.boxSource === "skland") {
      const account = activeSklandAccount(await readSklandAccountStore());
      if (account) dataOwnerTag = sklandDataOwnerTag(account.session.userId);
    }
    const result = await runPlan({ layout: body.layout, operbox, sourceName, rotation, fiammettaEnable, dataOwnerTag });
    return successResponse(
      toPublicPlanData(
        result,
        { layoutLabel: body.layout.template, sourceName },
        requestId,
        { includeDebug }
      ),
      requestId
    );
  } catch (error) {
    return failureResponse(error, requestId, "/api/plan", startedAt, "AIC-SYS-5000");
  } finally {
    release?.();
  }
}
