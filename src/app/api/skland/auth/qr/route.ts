import {
  assertSameOrigin,
  createRequestId,
  enforceRateLimit,
  requestClientIp,
  successResponse,
} from "@/server/api-contract";
import { startScan } from "@/server/skland/adapter";
import { assertSklandAvailable, sklandErrorResponse } from "@/server/skland/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  try {
    assertSameOrigin(request);
    assertSklandAvailable(request);
    const ip = requestClientIp(request);
    enforceRateLimit("skland-qr", ip, 10, 10 * 60_000);
    return successResponse(await startScan(ip), requestId);
  } catch (error) {
    return sklandErrorResponse(error, requestId, "/api/skland/auth/qr", startedAt);
  }
}
