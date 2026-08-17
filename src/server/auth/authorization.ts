import "server-only";

import { PublicApiError } from "@/server/api-contract";
import { websiteSession } from ".";
import { configuredAdminIds } from "./config";

export async function requireWebsiteSession(request: Request | Headers) {
  let session;
  try {
    session = await websiteSession(request);
  } catch (cause) {
    throw new PublicApiError("AIC-AUTH-2008", { cause });
  }
  if (!session?.user?.id) throw new PublicApiError("AIC-AUTH-2008");
  return session;
}

export async function requireWebsiteAdmin(request: Request | Headers) {
  const session = await requireWebsiteSession(request);
  if (!configuredAdminIds().has(session.user.id)) throw new PublicApiError("AIC-AUTH-2009");
  return session;
}
