import {
  assertSameOrigin,
  createRequestId,
  enforceRateLimit,
  requestClientIp,
  successResponse,
} from "@/server/api-contract";
import { SklandServiceError, syncSessionSnapshot } from "@/server/skland/adapter";
import {
  assertSklandAvailable,
  clearSklandSessionCookie,
  readSklandSession,
  setSklandSessionCookie,
  sklandErrorResponse,
} from "@/server/skland/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  try {
    assertSameOrigin(request);
    enforceRateLimit("skland-action", requestClientIp(request), 30, 60 * 60_000);
    assertSklandAvailable(request);
    const session = await readSklandSession();
    if (!session) throw new SklandServiceError("AUTH_EXPIRED", "请先登录森空岛。", 401);
    const result = await syncSessionSnapshot(session);
    const response = successResponse({ authenticated: true, configured: true, snapshot: result.snapshot }, requestId);
    setSklandSessionCookie(response, request, result.session);
    return response;
  } catch (error) {
    const response = sklandErrorResponse(error, requestId, "/api/skland/sync", startedAt);
    if (error instanceof SklandServiceError && error.code === "AUTH_EXPIRED") clearSklandSessionCookie(response);
    return response;
  }
}
