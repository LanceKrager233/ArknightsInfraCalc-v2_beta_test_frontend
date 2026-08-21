import {
  assertEmptyBody,
  assertSameOrigin,
  createRequestId,
  enforceRateLimit,
  failureResponse,
  readJsonBody,
  requestClientIp,
  successResponse,
} from "@/server/api-contract";
import { requireWebsiteSession } from "@/server/auth/authorization";
import { deleteSavedPlan, updateSavedPlan } from "@/server/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  try {
    assertSameOrigin(request);
    enforceRateLimit("saved-plan-write", requestClientIp(request), 20, 10 * 60_000);
    const session = await requireWebsiteSession(request);
    const { id } = await context.params;
    return successResponse(await updateSavedPlan(session.user.id, id, await readJsonBody(request, 16 * 1024)), requestId);
  } catch (error) {
    return failureResponse(error, requestId, "/api/plans/[id]", startedAt);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  try {
    assertSameOrigin(request);
    enforceRateLimit("saved-plan-delete", requestClientIp(request), 10, 10 * 60_000);
    await assertEmptyBody(request, 1024);
    const session = await requireWebsiteSession(request);
    const { id } = await context.params;
    await deleteSavedPlan(session.user.id, id);
    return successResponse({ deleted: true as const }, requestId);
  } catch (error) {
    return failureResponse(error, requestId, "/api/plans/[id]", startedAt);
  }
}
