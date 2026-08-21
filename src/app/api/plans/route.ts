import { createRequestId, failureResponse, successResponse } from "@/server/api-contract";
import { requireWebsiteSession } from "@/server/auth/authorization";
import { listSavedPlans } from "@/server/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  try {
    const session = await requireWebsiteSession(request);
    return successResponse(await listSavedPlans(session.user.id), requestId);
  } catch (error) {
    return failureResponse(error, requestId, "/api/plans", startedAt);
  }
}
