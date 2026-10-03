import { db, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  buildProfileContextFromProfile,
  type ProfileContext,
  type RawProfileInput,
  type CurrentRequestContext,
  type RecommendationInputContext,
} from "@workspace/api-zod";

/**
 * Fetch and construct the normalized ProfileContext for a given user UUID.
 * Returns null if the user does not exist in the database.
 */
export async function buildProfileContext(userId: string): Promise<ProfileContext | null> {
  if (!userId) return null;

  const [user] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.id, userId))
    .limit(1);

  if (!user) {
    return null;
  }

  return buildProfileContextFromProfile(user);
}

export {
  buildProfileContextFromProfile,
  type ProfileContext,
  type RawProfileInput,
  type CurrentRequestContext,
  type RecommendationInputContext,
};
