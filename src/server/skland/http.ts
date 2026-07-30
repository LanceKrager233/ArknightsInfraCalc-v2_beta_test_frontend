import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { SklandAccountSummary, SklandSnapshot } from "../../types.ts";
import { failureResponse, PublicApiError } from "../api-contract";
import { loadSessionSnapshot, SklandServiceError } from "./adapter";
import {
  createSklandStoredAccount,
  isSecureSklandRequest,
  isSklandConfigured,
  removeSklandAccount,
  sealSklandAccount,
  sealSklandAccountIndex,
  SKLAND_ACCOUNT_COOKIE_PREFIX,
  SKLAND_ACCOUNT_INDEX_COOKIE,
  SKLAND_ACCOUNT_LIMIT,
  SKLAND_SESSION_COOKIE,
  SKLAND_SESSION_TTL_SECONDS,
  sklandAccountCookieName,
  toPublicSklandAccount,
  type SklandStoredAccount,
  type SklandSessionPayload,
  unsealSklandAccount,
  unsealSklandAccountIndex,
  unsealSklandSession,
} from "./session";

export interface SklandAccountStore {
  accounts: SklandStoredAccount[];
  activeAccountId: string | null;
  staleCookieNames: string[];
  migratedSnapshot: SklandSnapshot | null;
}

function cookieOptions(request: Request, maxAge = SKLAND_SESSION_TTL_SECONDS) {
  const url = new URL(request.url);
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: forwarded === "https" || url.protocol === "https:",
    maxAge,
    path: "/",
  };
}

export async function readSklandAccountStore(): Promise<SklandAccountStore> {
  if (!isSklandConfigured()) {
    return { accounts: [], activeAccountId: null, staleCookieNames: [], migratedSnapshot: null };
  }
  const store = await cookies();
  const allCookies = store.getAll();
  const indexCookie = store.get(SKLAND_ACCOUNT_INDEX_COOKIE);
  const index = indexCookie ? unsealSklandAccountIndex(indexCookie.value) : null;
  const staleCookieNames = indexCookie && !index ? [SKLAND_ACCOUNT_INDEX_COOKIE] : [];
  const byName = new Map(allCookies.map((cookie) => [cookie.name, cookie.value]));
  const indexedNames = index?.accountIds.map(sklandAccountCookieName) ?? [];
  const extraNames = allCookies
    .map((cookie) => cookie.name)
    .filter((name) => name.startsWith(SKLAND_ACCOUNT_COOKIE_PREFIX) && !indexedNames.includes(name));
  const accountNames = [...indexedNames, ...extraNames];
  const accounts: SklandStoredAccount[] = [];

  for (const name of accountNames) {
    const value = byName.get(name);
    const account = value ? unsealSklandAccount(value) : null;
    if (!account || sklandAccountCookieName(account.accountId) !== name) {
      staleCookieNames.push(name);
      continue;
    }
    if (
      accounts.length >= SKLAND_ACCOUNT_LIMIT ||
      accounts.some((current) =>
        current.accountId === account.accountId ||
        current.session.userId === account.session.userId
      )
    ) {
      staleCookieNames.push(name);
      continue;
    }
    accounts.push(account);
  }

  const legacyValue = store.get(SKLAND_SESSION_COOKIE)?.value;
  const legacySession = legacyValue ? unsealSklandSession(legacyValue) : null;
  let migratedSnapshot: SklandSnapshot | null = null;
  if (accounts.length === 0 && legacySession) {
    const result = await loadSessionSnapshot(legacySession);
    const account = createSklandStoredAccount(result.session, result.snapshot.roles);
    accounts.push(account);
    migratedSnapshot = result.snapshot;
  }
  if (legacyValue) staleCookieNames.push(SKLAND_SESSION_COOKIE);

  const activeAccountId = accounts.some((account) => account.accountId === index?.activeAccountId)
    ? index?.activeAccountId ?? null
    : accounts[0]?.accountId ?? null;
  return {
    accounts,
    activeAccountId,
    staleCookieNames: [...new Set(staleCookieNames)],
    migratedSnapshot,
  };
}

export function activeSklandAccount(store: SklandAccountStore): SklandStoredAccount | null {
  return store.accounts.find((account) => account.accountId === store.activeAccountId) ?? null;
}

export function sklandAccountSummaries(store: SklandAccountStore): SklandAccountSummary[] {
  return store.accounts.map(toPublicSklandAccount);
}

export function withUpdatedSklandAccount(
  store: SklandAccountStore,
  accountId: string,
  session: SklandSessionPayload,
  snapshot: SklandSnapshot
): SklandAccountStore {
  return {
    ...store,
    accounts: store.accounts.map((account) => account.accountId === accountId
      ? createSklandStoredAccount(session, snapshot.roles, accountId)
      : account),
    activeAccountId: accountId,
    migratedSnapshot: null,
  };
}

export async function loadActiveSklandAccount(
  store: SklandAccountStore,
  forceRefresh = false
): Promise<{ store: SklandAccountStore; snapshot: SklandSnapshot | null }> {
  let current = store;
  while (current.activeAccountId) {
    const account = activeSklandAccount(current);
    if (!account) {
      current = { ...current, activeAccountId: current.accounts[0]?.accountId ?? null };
      continue;
    }
    if (current.migratedSnapshot && !forceRefresh) {
      return { store: current, snapshot: current.migratedSnapshot };
    }
    try {
      const result = await loadSessionSnapshot(account.session, forceRefresh);
      const updated = withUpdatedSklandAccount(current, account.accountId, result.session, result.snapshot);
      return { store: updated, snapshot: result.snapshot };
    } catch (error) {
      if (!(error instanceof SklandServiceError) || error.code !== "AUTH_EXPIRED") throw error;
      const removed = removeSklandAccount(current.accounts, current.activeAccountId, account.accountId);
      current = {
        ...current,
        accounts: removed.accounts,
        activeAccountId: removed.activeAccountId,
        migratedSnapshot: null,
      };
    }
  }
  return { store: current, snapshot: null };
}

export function setSklandAccountStoreCookies(
  response: NextResponse,
  request: Request,
  store: SklandAccountStore,
  previous?: SklandAccountStore
): void {
  const options = cookieOptions(request);
  const currentNames = new Set(store.accounts.map((account) => sklandAccountCookieName(account.accountId)));
  const removedNames = [
    ...(previous?.accounts.map((account) => sklandAccountCookieName(account.accountId)) ?? []),
    ...(previous?.staleCookieNames ?? []),
    ...store.staleCookieNames,
  ].filter((name) => name.startsWith(SKLAND_ACCOUNT_COOKIE_PREFIX) && !currentNames.has(name));

  for (const name of new Set(removedNames)) {
    response.cookies.set(name, "", cookieOptions(request, 0));
  }
  response.cookies.set(SKLAND_SESSION_COOKIE, "", cookieOptions(request, 0));

  if (store.accounts.length === 0) {
    response.cookies.set(SKLAND_ACCOUNT_INDEX_COOKIE, "", cookieOptions(request, 0));
    return;
  }

  response.cookies.set(
    SKLAND_ACCOUNT_INDEX_COOKIE,
    sealSklandAccountIndex({
      version: 2,
      accountIds: store.accounts.map((account) => account.accountId),
      activeAccountId: store.activeAccountId,
      expiresAt: Date.now() + SKLAND_SESSION_TTL_SECONDS * 1000,
    }),
    options
  );
  for (const account of store.accounts) {
    response.cookies.set(sklandAccountCookieName(account.accountId), sealSklandAccount(account), options);
  }
}

export function assertSklandAvailable(request: Request): void {
  if (!isSklandConfigured()) throw new PublicApiError("AIC-AUTH-2003");
  if (!isSecureSklandRequest(request)) throw new PublicApiError("AIC-AUTH-2002");
}

export function sklandErrorResponse(
  error: unknown,
  requestId: string,
  route: string,
  startedAt: number
): NextResponse {
  if (error instanceof PublicApiError) {
    return failureResponse(error, requestId, route, startedAt);
  }
  if (error instanceof Error && error.message === "请求来源无效。") {
    return failureResponse(new PublicApiError("AIC-AUTH-2002"), requestId, route, startedAt);
  }
  if (error instanceof SklandServiceError) {
    const code =
      error.code === "AUTH_EXPIRED"
        ? "AIC-AUTH-2001"
        : error.code === "RATE_LIMITED"
          ? "AIC-RATE-6001"
          : error.code === "INSECURE"
            ? "AIC-AUTH-2002"
            : error.code === "NOT_CONFIGURED" || error.code === "UNAVAILABLE"
              ? "AIC-AUTH-2003"
              : "AIC-REQ-1001";
    return failureResponse(new PublicApiError(code), requestId, route, startedAt);
  }
  return failureResponse(new PublicApiError("AIC-AUTH-2003"), requestId, route, startedAt);
}
