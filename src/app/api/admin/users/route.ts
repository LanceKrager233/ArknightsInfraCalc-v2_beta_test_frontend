import { and, desc, eq, gt, ilike, or } from "drizzle-orm";
import { requireWebsiteAdmin } from "@/server/auth/authorization";
import { getDatabase } from "@/server/db";
import { session, user } from "@/server/db/schema";
import { assertSameOrigin, createRequestId, enforceRateLimit, failureResponse, PublicApiError, readJsonBody, requestClientIp, successResponse } from "@/server/api-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  try {
    await requireWebsiteAdmin(request);
    enforceRateLimit("admin-users", requestClientIp(request), 60, 10 * 60_000);
    const searchParams = new URL(request.url).searchParams;
    const targetUserId = searchParams.get("userId")?.trim();
    if (targetUserId) {
      if (targetUserId.length > 100) throw new PublicApiError("AIC-REQ-1001");
      const sessions = await getDatabase().select({
        id: session.id,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      }).from(session).where(and(eq(session.userId, targetUserId), gt(session.expiresAt, new Date()))).orderBy(desc(session.createdAt)).limit(100);
      return successResponse({ sessions }, requestId);
    }
    const query = searchParams.get("q")?.trim().slice(0, 100);
    const where = query ? or(ilike(user.email, `%${query}%`), ilike(user.name, `%${query}%`)) : undefined;
    const users = await getDatabase().select({ id: user.id, name: user.name, email: user.email, emailVerified: user.emailVerified, banned: user.banned, banReason: user.banReason, createdAt: user.createdAt }).from(user).where(where).orderBy(desc(user.createdAt)).limit(100);
    return successResponse({ users }, requestId);
  } catch (error) {
    return failureResponse(error, requestId, "/api/admin/users", startedAt);
  }
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  try {
    assertSameOrigin(request);
    const actor = await requireWebsiteAdmin(request);
    enforceRateLimit("admin-users-write", requestClientIp(request), 30, 10 * 60_000);
    const body = await readJsonBody(request, 16 * 1024) as { userId?: unknown; action?: unknown; reason?: unknown };
    const targetUserId = typeof body.userId === "string" ? body.userId.trim() : "";
    if (!targetUserId || targetUserId.length > 100 || !["ban", "unban", "revokeSessions"].includes(String(body.action))) throw new PublicApiError("AIC-REQ-1001");
    if (targetUserId === actor.user.id && body.action === "ban") throw new PublicApiError("AIC-REQ-1001", { message: "不能封禁当前管理员账号。" });
    if (body.action === "revokeSessions") {
      await getDatabase().delete(session).where(eq(session.userId, targetUserId));
    } else {
      await getDatabase().update(user).set(body.action === "ban" ? { banned: true, banReason: typeof body.reason === "string" ? body.reason.slice(0, 300) : "管理员封禁", updatedAt: new Date() } : { banned: false, banReason: null, banExpires: null, updatedAt: new Date() }).where(eq(user.id, targetUserId));
      if (body.action === "ban") await getDatabase().delete(session).where(eq(session.userId, targetUserId));
    }
    return successResponse({ updated: true }, requestId);
  } catch (error) {
    return failureResponse(error, requestId, "/api/admin/users", startedAt);
  }
}
