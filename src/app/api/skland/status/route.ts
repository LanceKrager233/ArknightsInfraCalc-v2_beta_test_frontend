import {
  assertSameOrigin,
  createRequestId,
  enforceRateLimit,
  requestClientIp,
  successResponse,
} from "@/server/api-contract";
import { loadStatusSnapshot, SklandServiceError } from "@/server/skland/adapter";
import {
  activeSklandAccount,
  assertSklandAvailable,
  assertSklandFeatureEnabled,
  readSklandAccountStore,
  setSklandAccountStoreCookies,
  sklandAccountSummaries,
  sklandErrorResponse,
  withUpdatedSklandSession,
} from "@/server/skland/http";
import { requireWebsiteSession } from "@/server/auth/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  try {
    assertSklandFeatureEnabled();
    await requireWebsiteSession(request);
    assertSklandAvailable(request);
    assertSameOrigin(request);
    enforceRateLimit("skland-action", requestClientIp(request), 30, 60 * 60_000);
    const previous = await readSklandAccountStore();
    const account = activeSklandAccount(previous);
    if (!account) throw new SklandServiceError("AUTH_EXPIRED", "请先登录森空岛。", 401);
    const loaded = await loadStatusSnapshot(account.session);
    const next = withUpdatedSklandSession(previous, account.accountId, loaded.session);
    const response = successResponse({
      accounts: sklandAccountSummaries(next),
      activeAccountId: next.activeAccountId,
      snapshot: loaded.snapshot,
    }, requestId);
    setSklandAccountStoreCookies(response, request, next, previous);
    return response;
  } catch (error) {
    return sklandErrorResponse(error, requestId, "/api/skland/status", startedAt);
  }
}
