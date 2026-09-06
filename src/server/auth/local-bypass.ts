// Local preview only. Never commit this file.
const COOKIE = "riic_local_test_session";

function isLocal5174(request: Request | Headers): boolean {
  if (process.env.LOCAL_AUTH_BYPASS !== "1" || process.env.NODE_ENV !== "development") return false;
  const host = request instanceof Request ? new URL(request.url).host : request.get("host");
  return host?.endsWith(":5174") ?? false;
}

export function localTestSession(request: Request | Headers) {
  const headers = request instanceof Request ? request.headers : request;
  if (!isLocal5174(request) || !headers.get("cookie")?.split(/;\s*/).includes(`${COOKIE}=1`)) return null;
  return {
    session: { id: "local-test-session", token: "local-test-session", userId: "local-test-user", expiresAt: new Date("2099-12-31T23:59:59.999Z"), createdAt: new Date(), updatedAt: new Date(), ipAddress: null, userAgent: "local-test" },
    user: { id: "local-test-user", name: "1", email: "1", emailVerified: true, image: null, createdAt: new Date(), updatedAt: new Date(), role: "user", banned: false, banReason: null, banExpires: null },
  };
}

export async function localTestAuthResponse(request: Request): Promise<Response | null> {
  if (!isLocal5174(request)) return null;
  const pathname = new URL(request.url).pathname.replace(/\/+$/, "");
  if (pathname === "/api/auth/get-session") return Response.json(localTestSession(request));
  if (pathname === "/api/auth/sign-out") {
    return Response.json({ success: true }, { headers: { "set-cookie": `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax` } });
  }
  if (pathname !== "/api/auth/sign-in/email" || request.method !== "POST") return null;
  const body = await request.clone().json().catch(() => null) as { email?: unknown; password?: unknown } | null;
  if (body?.email !== "1" || body.password !== "1") return null;
  return Response.json({ redirect: false, token: "local-test-session", user: localTestSession(new Headers({ cookie: `${COOKIE}=1`, host: "127.0.0.1:5174" }))?.user }, {
    headers: { "set-cookie": `${COOKIE}=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800` },
  });
}
