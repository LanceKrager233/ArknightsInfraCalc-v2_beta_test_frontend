import {
  assertSameOrigin,
  createRequestId,
  enforceRateLimit,
  PublicApiError,
  readJsonBody,
  requestClientIp,
  successResponse,
} from "@/server/api-contract";
import { pollScan } from "@/server/skland/adapter";
import { assertSklandAvailable, setSklandSessionCookie, sklandErrorResponse } from "@/server/skland/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  try {
    assertSameOrigin(request);
    assertSklandAvailable(request);
    enforceRateLimit("skland-poll", requestClientIp(request), 120, 10 * 60_000);
    const body = await readJsonBody(request, 16 * 1024) as { scanId?: unknown } | null;
    if (typeof body?.scanId !== "string" || !body.scanId.trim()) {
      throw new PublicApiError("AIC-REQ-1001");
    }
    const result = await pollScan(body.scanId.trim());
    const response = successResponse({
      status: result.response.status,
      snapshot: result.response.snapshot,
    }, requestId);
    if (result.session) setSklandSessionCookie(response, request, result.session);
    return response;
  } catch (error) {
    return sklandErrorResponse(error, requestId, "/api/skland/auth/qr/status", startedAt);
  }
}
