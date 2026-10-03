import { db, userSwiggyTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Resolves the active Swiggy access token for a given NutriFlow userId.
 * Checks the 5-day expiration and purges expired tokens automatically.
 */
export async function getValidUserToken(userId: string): Promise<string | null> {
  const [tokenRecord] = await db
    .select()
    .from(userSwiggyTokensTable)
    .where(eq(userSwiggyTokensTable.userId, userId))
    .limit(1);

  if (!tokenRecord) {
    return null;
  }

  if (new Date() >= new Date(tokenRecord.expiresAt)) {
    // Expired — purge and return null
    await db
      .delete(userSwiggyTokensTable)
      .where(eq(userSwiggyTokensTable.userId, userId));
    return null;
  }

  return tokenRecord.accessToken;
}

/**
 * Invalidates and purges the stored Swiggy token for a user (e.g. after upstream 401).
 */
export async function invalidateUserToken(userId: string): Promise<void> {
  try {
    await db
      .delete(userSwiggyTokensTable)
      .where(eq(userSwiggyTokensTable.userId, userId));
  } catch (err: any) {
    console.warn("[Swiggy Tokens] Invalidation skipped (database unavailable):", err?.message ?? err);
  }
}

