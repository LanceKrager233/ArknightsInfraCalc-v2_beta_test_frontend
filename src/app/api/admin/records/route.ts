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
import { requireWebsiteAdmin } from "@/server/auth/authorization";
import { isBusinessDatabaseReadEnabled } from "@/server/business-config";
import { queryBusinessRecords, updateFeedbackRecord } from "@/server/business-records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function date(value: string | null): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new PublicApiError("AIC-REQ-1001");
  return parsed;
}

export async function GET(request: Request) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  try {
    await requireWebsiteAdmin(request);
    if (!isBusinessDatabaseReadEnabled()) throw new PublicApiError("AIC-DATA-8002");
    const params = new URL(request.url).searchParams;
    const kind = params.get("kind") === "feedback" ? "feedback" : params.get("kind") === "runs" ? "runs" : null;
    if (!kind) throw new PublicApiError("AIC-REQ-1001");
    return successResponse(await queryBusinessRecords({
      kind,
      limit: Number(params.get("limit") ?? 50),
      offset: Number(params.get("offset") ?? 0),
      from: date(params.get("from")),
      to: date(params.get("to")),
      status: params.get("status") ?? undefined,
      errorCode: params.get("errorCode") ?? undefined,
      solverExecutableSha256: params.get("solver") ?? undefined,
    }), requestId);
  } catch (error) {
    return failureResponse(error, requestId, "/api/admin/records", startedAt);
  }
}

export async function PATCH(request: Request) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  try {
    assertSameOrigin(request);
    enforceRateLimit("admin-record-update", requestClientIp(request), 60, 10 * 60_000);
    const admin = await requireWebsiteAdmin(request);
    if (!isBusinessDatabaseReadEnabled()) throw new PublicApiError("AIC-DATA-8002");
    const body = await readJsonBody(request, 16 * 1024) as { feedbackId?: unknown; status?: unknown; note?: unknown };
    if (
      typeof body.feedbackId !== "string"
      || !["pending", "working", "resolved"].includes(String(body.status))
      || typeof body.note !== "string"
      || body.note.length > 2000
    ) throw new PublicApiError("AIC-REQ-1001");
    const updated = await updateFeedbackRecord({
      feedbackId: body.feedbackId,
      status: body.status as "pending" | "working" | "resolved",
      note: body.note,
      actorUserId: admin.session.user.id,
    });
    if (!updated) throw new PublicApiError("AIC-DATA-8004");
    return successResponse(updated, requestId);
  } catch (error) {
    return failureResponse(error, requestId, "/api/admin/records", startedAt);
  }
}
