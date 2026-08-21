import { describePlanArtifact, getPlanCacheSolverIdentity, runPlan } from "@/server/infra";
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
import { recordPlanRunBestEffort } from "@/server/business-records";
import type { AppErrorCode, PlanApiResponse } from "@/types";
import {
  completePlanCache,
  evictPlanCacheKeys,
  recordPlanCacheReferenceBestEffort,
  releasePlanCacheLease,
  resolvePlanCache,
  type PlanCacheResolution,
} from "@/server/plan-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  let release: (() => void) | undefined;
  let runResult: PlanApiResponse | undefined;
  let cacheLease: Extract<PlanCacheResolution, { kind: "lease" }> | undefined;
  let recordContext: {
    userId: string | null;
    dataOwnerTag: string | null;
    sourceType: "sample" | "maa" | "skland";
    layoutTemplate: string;
    roomCount: number;
    operatorCount: number;
    rotation: RotationProfile;
    fiammettaEnable: boolean;
  } | undefined;
  const recordRun = async (status: "success" | "failed", errorCode: AppErrorCode | null): Promise<boolean> => {
    if (!runResult || !recordContext) return false;
    return recordPlanRunBestEffort({
      diagnosticId: runResult.runId ?? requestId,
      ...recordContext,
      status,
      durationMs: runResult.durationMs ?? Math.max(0, Math.round(performance.now() - startedAt)),
      errorCode,
      solver: runResult.solver,
      artifact: await describePlanArtifact(runResult),
      createdAt: runResult.startedAt ? new Date(runResult.startedAt) : new Date(),
    });
  };
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
    let websiteUserId: string | null = null;
    if (planAccessMode(body.boxSource, body.operbox !== undefined) === "trusted-sample") {
      const sample = await (await import("@/server/infra")).getSampleOperbox();
      body.operbox = sample.operbox as OperBoxEntry[];
      body.sourceName = "243 全精二示例";
    } else {
      websiteUserId = (await requireWebsiteSession(request)).user.id;
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
    recordContext = {
      userId: websiteUserId,
      dataOwnerTag,
      sourceType: body.boxSource === "skland" ? "skland" : body.boxSource === "sample" ? "sample" : "maa",
      layoutTemplate: body.layout.template,
      roomCount: body.layout.rooms.length,
      operatorCount: operbox.length,
      rotation,
      fiammettaEnable,
    };
    if (!includeDebug) {
      const cacheSolver = await getPlanCacheSolverIdentity();
      if (cacheSolver) {
        const cache = await resolvePlanCache({
          layout: body.layout,
          operbox,
          sourceType: recordContext.sourceType,
          sourceName,
          rotation,
          fiammettaEnable,
          solver: cacheSolver,
        });
        if (cache.kind === "hit") {
          const runStored = await recordPlanRunBestEffort({
            diagnosticId: cache.result.diagnosticId,
            ...recordContext,
            status: "success",
            durationMs: cache.result.durationMs,
            solver: cacheSolver,
            artifact: null,
          });
          const referenceStored = runStored && await recordPlanCacheReferenceBestEffort({
            cacheKeyHmac: cache.keyHmac,
            diagnosticId: cache.result.diagnosticId,
            userId: websiteUserId,
          });
          if (!referenceStored) await evictPlanCacheKeys([cache.keyHmac]).catch(() => undefined);
          return successResponse(cache.result, requestId);
        }
        if (cache.kind === "lease") cacheLease = cache;
      }
    }
    runResult = await runPlan({ layout: body.layout, operbox, sourceName, rotation, fiammettaEnable, dataOwnerTag });
    const publicResult = toPublicPlanData(
      runResult,
      { layoutLabel: body.layout.template, sourceName },
      requestId,
      { includeDebug }
    );
    const runStored = await recordRun("success", null);
    if (cacheLease) {
      const activeLease = cacheLease;
      if (!runStored) {
        await releasePlanCacheLease(activeLease);
        cacheLease = undefined;
      } else {
        try {
          await completePlanCache(activeLease, publicResult);
          const referenceStored = await recordPlanCacheReferenceBestEffort({
            cacheKeyHmac: activeLease.keyHmac,
            diagnosticId: publicResult.diagnosticId,
            userId: websiteUserId,
          });
          if (!referenceStored) await evictPlanCacheKeys([activeLease.keyHmac]);
          cacheLease = undefined;
        } catch {
          await releasePlanCacheLease(activeLease);
          cacheLease = undefined;
        }
      }
    }
    return successResponse(
      publicResult,
      requestId
    );
  } catch (error) {
    if (cacheLease) await releasePlanCacheLease(cacheLease);
    await recordRun("failed", error instanceof PublicApiError ? error.code : "AIC-SYS-5000");
    return failureResponse(error, requestId, "/api/plan", startedAt, "AIC-SYS-5000");
  } finally {
    release?.();
  }
}
