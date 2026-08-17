import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "@/server/db";
import { sklandBinding } from "@/server/db/schema";
import { sklandBindingKey } from "./session";

export class SklandBindingConflictError extends Error {
  constructor() {
    super("这个森空岛账号已经绑定到其他网站账号。");
    this.name = "SklandBindingConflictError";
  }
}

export async function bindSklandAccount(websiteUserId: string, sklandUserId: string): Promise<number> {
  const bindingKey = sklandBindingKey(sklandUserId);
  const now = new Date();
  await getDatabase().insert(sklandBinding).values({
    bindingKey,
    userId: websiteUserId,
    createdAt: now,
    lastAuthorizedAt: now,
  }).onConflictDoNothing({ target: sklandBinding.bindingKey });

  const [record] = await getDatabase()
    .select({ userId: sklandBinding.userId })
    .from(sklandBinding)
    .where(eq(sklandBinding.bindingKey, bindingKey))
    .limit(1);
  if (!record || record.userId !== websiteUserId) throw new SklandBindingConflictError();

  await getDatabase()
    .update(sklandBinding)
    .set({ lastAuthorizedAt: now })
    .where(and(eq(sklandBinding.bindingKey, bindingKey), eq(sklandBinding.userId, websiteUserId)));
  return countSklandBindings(websiteUserId);
}

export async function countSklandBindings(websiteUserId: string): Promise<number> {
  const [result] = await getDatabase()
    .select({ count: sql<number>`count(*)::int` })
    .from(sklandBinding)
    .where(eq(sklandBinding.userId, websiteUserId));
  return result?.count ?? 0;
}

export async function sklandBindingCountsByUserIds(userIds: string[]): Promise<Map<string, number>> {
  if (!userIds.length) return new Map();
  const records = await getDatabase()
    .select({ userId: sklandBinding.userId, count: sql<number>`count(*)::int` })
    .from(sklandBinding)
    .where(inArray(sklandBinding.userId, userIds))
    .groupBy(sklandBinding.userId);
  return new Map(records.map((record) => [record.userId, record.count]));
}

export async function removeSklandBindings(websiteUserId: string, sklandUserIds?: string[]): Promise<void> {
  if (sklandUserIds && sklandUserIds.length === 0) return;
  const condition = sklandUserIds
    ? and(
        eq(sklandBinding.userId, websiteUserId),
        inArray(sklandBinding.bindingKey, sklandUserIds.map((userId) => sklandBindingKey(userId))),
      )
    : eq(sklandBinding.userId, websiteUserId);
  await getDatabase().delete(sklandBinding).where(condition);
}
