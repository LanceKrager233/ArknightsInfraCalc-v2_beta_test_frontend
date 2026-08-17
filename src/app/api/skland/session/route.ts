import {
  assertSameOrigin,
  createRequestId,
  enforceRateLimit,
  PublicApiError,
  readJsonBody,
  requestClientIp,
  successResponse,
} from "@/server/api-contract";
import {
  assertSklandAvailable,
  assertSklandFeatureEnabled,
  loadActiveSklandAccount,
  readSklandAccountStore,
  setSklandAccountStoreCookies,
  sklandAccountSummaries,
  sklandErrorResponse,
} from "@/server/skland/http";
import { removeSklandAccount } from "@/server/skland/session";
import { isSecureSklandRequest, isSklandConfigured } from "@/server/skland/session";
import { requireWebsiteSession } from "@/server/auth/authorization";
import { getSklandBindingSummary, removeSklandBindings } from "@/server/skland/bindings";
import type { SklandBindingSummary } from "@/types";

export const runtime = "nodejs";
const authMethods = { qr: true as const };

export async function GET(request: Request) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  let websiteUserId: string;
  let bindingSummary: SklandBindingSummary;
  try {
    assertSklandFeatureEnabled();
    const website = await requireWebsiteSession(request);
    websiteUserId = website.user.id;
    bindingSummary = await getSklandBindingSummary(websiteUserId);
  } catch (error) {
    return sklandErrorResponse(error, requestId, "/api/skland/session", startedAt);
  }
  if (!isSklandConfigured() || !isSecureSklandRequest(request)) {
    return successResponse({
      authenticated: false,
      configured: isSklandConfigured(),
      authMethods,
      disabledReason: "当前未开放森空岛登录，可使用 MAA 导入。",
      accounts: [],
      activeAccountId: null,
      bindingCount: bindingSummary.totalCount,
      bindingSummary,
    }, requestId);
  }
  try {
    const previous = await readSklandAccountStore();
    const loaded = await loadActiveSklandAccount(previous);
    const response = successResponse({
      authenticated: Boolean(loaded.snapshot),
      configured: true,
      authMethods,
      accounts: sklandAccountSummaries(loaded.store),
      activeAccountId: loaded.store.activeAccountId,
      bindingCount: bindingSummary.totalCount,
      bindingSummary,
      ...(loaded.snapshot ? { scheduleSnapshot: loaded.snapshot } : {}),
      ...(loaded.statusSnapshot ? { statusSnapshot: loaded.statusSnapshot } : {}),
    }, requestId);
    setSklandAccountStoreCookies(response, request, loaded.store, previous);
    return response;
  } catch (error) {
    return sklandErrorResponse(error, requestId, "/api/skland/session", startedAt);
  }
}

export async function DELETE(request: Request) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  try {
    assertSklandFeatureEnabled();
    const website = await requireWebsiteSession(request);
    assertSklandAvailable(request);
    assertSameOrigin(request);
    enforceRateLimit("skland-action", requestClientIp(request), 30, 60 * 60_000);
    const previous = await readSklandAccountStore();
    let next = previous;
    let removedSklandUserIds: string[];
    if (request.body) {
      const body = await readJsonBody(request, 16 * 1024) as { accountId?: unknown } | null;
      if (typeof body?.accountId !== "string" || !body.accountId.trim()) throw new PublicApiError("AIC-REQ-1001");
      if (!previous.accounts.some((account) => account.accountId === body.accountId)) throw new PublicApiError("AIC-REQ-1001");
      removedSklandUserIds = previous.accounts
        .filter((account) => account.accountId === body.accountId)
        .map((account) => account.session.userId);
      const removed = removeSklandAccount(previous.accounts, previous.activeAccountId, body.accountId);
      next = { ...previous, ...removed, migratedSnapshot: null };
    } else {
      removedSklandUserIds = previous.accounts.map((account) => account.session.userId);
      next = { ...previous, accounts: [], activeAccountId: null, migratedSnapshot: null };
    }
    await removeSklandBindings(website.user.id, removedSklandUserIds);
    const loaded = await loadActiveSklandAccount(next);
    const bindingSummary = await getSklandBindingSummary(website.user.id);
    const response = successResponse({
      authenticated: Boolean(loaded.snapshot),
      configured: true,
      authMethods,
      accounts: sklandAccountSummaries(loaded.store),
      activeAccountId: loaded.store.activeAccountId,
      bindingCount: bindingSummary.totalCount,
      bindingSummary,
      ...(loaded.snapshot ? { scheduleSnapshot: loaded.snapshot } : {}),
      ...(loaded.statusSnapshot ? { statusSnapshot: loaded.statusSnapshot } : {}),
    }, requestId);
    setSklandAccountStoreCookies(response, request, loaded.store, previous);
    return response;
  } catch (error) {
    return sklandErrorResponse(error, requestId, "/api/skland/session", startedAt);
  }
}
