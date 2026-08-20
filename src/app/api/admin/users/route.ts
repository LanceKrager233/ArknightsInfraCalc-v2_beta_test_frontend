import { and, desc, eq, gt, ilike, or } from "drizzle-orm";
import {
  canChangeWebsiteAdminRole,
  canModerateWebsiteUser,
  isEligibleForWebsiteAdmin,
  WEBSITE_ADMIN_ROLE,
  WEBSITE_USER_ROLE,
  websiteAdminAccess,
} from "@/server/auth/admin-access";
import { toAdminSessionData, toAdminUserData } from "@/server/auth/admin-dto";
import { requireWebsiteAdmin } from "@/server/auth/authorization";
import { configuredAdminIds } from "@/server/auth/config";
import { getDatabase } from "@/server/db";
import { session, user } from "@/server/db/schema";
import { sklandBindingSummariesByUserIds } from "@/server/skland/bindings";
import { assertSameOrigin, createRequestId, enforceRateLimit, failureResponse, PublicApiError, readJsonBody, requestClientIp, successResponse } from "@/server/api-contract";
import type { AdminSessionsData, AdminUserAction, AdminUsersData, AdminUserUpdateData } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = createRequestId();
  const startedAt = performance.now();
  try {
    const actor = await requireWebsiteAdmin(request);
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
      return successResponse<AdminSessionsData>({ sessions: sessions.map(toAdminSessionData) }, requestId);
    }
    const query = searchParams.get("q")?.trim().slice(0, 100);
    const where = query ? or(ilike(user.email, `%${query}%`), ilike(user.name, `%${query}%`)) : undefined;
    const records = await getDatabase().select({ id: user.id, name: user.name, email: user.email, emailVerified: user.emailVerified, role: user.role, banned: user.banned, banReason: user.banReason, createdAt: user.createdAt }).from(user).where(where).orderBy(desc(user.createdAt)).limit(100);
    const bindingSummaries = await sklandBindingSummariesByUserIds(records.map((record) => record.id));
    const bootstrapAdminIds = configuredAdminIds();
    const users = records.map((record) => {
      const bindingSummary = bindingSummaries.get(record.id);
      return toAdminUserData({
        ...record,
        sklandBindingCount: bindingSummary?.totalCount ?? 0,
        sklandActiveBindingCount: bindingSummary?.activeCount ?? 0,
        sklandRenewalDueCount: bindingSummary?.renewalDueCount ?? 0,
      }, bootstrapAdminIds);
    });
    return successResponse<AdminUsersData>({ users, permissions: { canManageAdminRoles: actor.canManageAdminRoles } }, requestId);
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
    const action = typeof body.action === "string" ? body.action : "";
    if (!targetUserId || targetUserId.length > 100 || !["ban", "unban", "revokeSessions", "grantAdmin", "revokeAdmin"].includes(action)) throw new PublicApiError("AIC-REQ-1001");
    const validatedAction = action as AdminUserAction;

    const [targetRecord] = await getDatabase().select({ id: user.id, role: user.role, emailVerified: user.emailVerified, banned: user.banned }).from(user).where(eq(user.id, targetUserId)).limit(1);
    if (!targetRecord) throw new PublicApiError("AIC-REQ-1001", { message: "目标用户不存在。" });
    const targetAccess = websiteAdminAccess(targetRecord.id, targetRecord.role);

    if (["grantAdmin", "revokeAdmin"].includes(validatedAction)) {
      if (!canChangeWebsiteAdminRole(actor, targetAccess)) {
        throw new PublicApiError("AIC-AUTH-2009", { message: targetAccess.isBootstrapAdmin ? "初始管理员权限只能通过服务器环境变量调整。" : "只有初始管理员可以调整管理员权限。" });
      }
      if (validatedAction === "grantAdmin" && !isEligibleForWebsiteAdmin(targetRecord.emailVerified, targetRecord.banned)) {
        throw new PublicApiError("AIC-REQ-1001", { message: "只能将已验证且未封禁的账号设为管理员。" });
      }
      await getDatabase().update(user).set({ role: validatedAction === "grantAdmin" ? WEBSITE_ADMIN_ROLE : WEBSITE_USER_ROLE, updatedAt: new Date() }).where(eq(user.id, targetUserId));
      return successResponse<AdminUserUpdateData>({ updated: true }, requestId);
    }

    if (targetUserId === actor.userId && validatedAction === "ban") throw new PublicApiError("AIC-REQ-1001", { message: "不能封禁当前管理员账号。" });
    if ((validatedAction === "ban" || validatedAction === "revokeSessions") && !canModerateWebsiteUser(actor, targetAccess)) {
      throw new PublicApiError("AIC-AUTH-2009", { message: "受委派管理员不能封禁初始管理员或撤销其 Session。" });
    }
    if (validatedAction === "revokeSessions") {
      await getDatabase().delete(session).where(eq(session.userId, targetUserId));
    } else {
      await getDatabase().update(user).set(validatedAction === "ban" ? { banned: true, banReason: typeof body.reason === "string" ? body.reason.slice(0, 300) : "管理员封禁", updatedAt: new Date() } : { banned: false, banReason: null, banExpires: null, updatedAt: new Date() }).where(eq(user.id, targetUserId));
      if (validatedAction === "ban") await getDatabase().delete(session).where(eq(session.userId, targetUserId));
    }
    return successResponse<AdminUserUpdateData>({ updated: true }, requestId);
  } catch (error) {
    return failureResponse(error, requestId, "/api/admin/users", startedAt);
  }
}
