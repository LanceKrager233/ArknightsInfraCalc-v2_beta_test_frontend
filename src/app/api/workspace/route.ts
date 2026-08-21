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
import { getWorkspace, putWorkspace, revokeAccountDataAndDeleteWorkspace } from "@/server/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  try {
    const session = await requireWebsiteSession(request);
    return successResponse(await getWorkspace(session.user.id), requestId);
  } catch (error) {
    return failureResponse(error, requestId, "/api/workspace", startedAt);
  }
}

export async function PUT(request: Request) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  try {
    assertSameOrigin(request);
    enforceRateLimit("workspace-write", requestClientIp(request), 30, 10 * 60_000);
    const session = await requireWebsiteSession(request);
    return successResponse(await putWorkspace(session.user.id, await readJsonBody(request, 3 * 1024 * 1024)), requestId);
  } catch (error) {
    return failureResponse(error, requestId, "/api/workspace", startedAt);
  }
}

export async function DELETE(request: Request) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  try {
    assertSameOrigin(request);
    enforceRateLimit("workspace-delete", requestClientIp(request), 3, 60 * 60_000);
    await assertEmptyBody(request, 1024);
    const session = await requireWebsiteSession(request);
    await revokeAccountDataAndDeleteWorkspace(session.user.id);
    return successResponse({ deleted: true as const }, requestId);
  } catch (error) {
    return failureResponse(error, requestId, "/api/workspace", startedAt);
  }
}
