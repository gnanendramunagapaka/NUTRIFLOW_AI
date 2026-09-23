import { db, appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const SWIGGY_AUTH_URL = "https://mcp.swiggy.com/auth/authorize";
export const SWIGGY_TOKEN_URL = "https://mcp.swiggy.com/auth/token";
export const SWIGGY_REGISTER_URL = "https://mcp.swiggy.com/auth/register";

export const SWIGGY_SERVICES: Record<string, string> = {
  food: "https://mcp.swiggy.com/food",
  im: "https://mcp.swiggy.com/im",
  instamart: "https://mcp.swiggy.com/im",
  dineout: "https://mcp.swiggy.com/dineout",
};

export const EXACT_REDIRECT_URI = "https://nutriflow-ai.vercel.app/auth/callback";

export function getRedirectUri(): string {
  return process.env.SWIGGY_REDIRECT_URI || EXACT_REDIRECT_URI;
}

// In-memory cache across warm serverless lambdas
let cachedClientId: string | null = null;
let registrationPromise: Promise<string> | null = null;

/**
 * Resolves the registered Swiggy client_id:
 * 1. Checks SWIGGY_CLIENT_ID environment variable.
 * 2. Checks in-memory cache.
 * 3. Checks app_settings table in PostgreSQL.
 * 4. Performs controlled one-time Dynamic Client Registration (RFC 7591) if not found.
 */
export async function getSwiggyClientId(): Promise<string> {
  // 1. Explicit environment variable takes highest precedence
  const envClientId = process.env.SWIGGY_CLIENT_ID?.trim();
  if (envClientId) {
    return envClientId;
  }

  // 2. In-memory cache for warm lambda executions
  if (cachedClientId) {
    return cachedClientId;
  }

  // Deduplicate concurrent cold-start requests
  if (registrationPromise) {
    return registrationPromise;
  }

  registrationPromise = (async () => {
    try {
      // 3. Check persistent database storage
      try {
        const [existing] = await db
          .select()
          .from(appSettingsTable)
          .where(eq(appSettingsTable.key, "swiggy_client_id"))
          .limit(1);

        if (existing?.value) {
          cachedClientId = existing.value;
          return existing.value;
        }
      } catch (dbErr) {
        console.warn("[Swiggy DCR] Could not check app_settings table:", dbErr);
      }

      // 4. One-time Dynamic Client Registration
      const redirectUri = getRedirectUri();
      console.log(`[Swiggy DCR] Performing one-time Dynamic Client Registration with redirect_uri: ${redirectUri}`);

      const response = await fetch(SWIGGY_REGISTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_name: "NutriFlow AI",
          redirect_uris: [redirectUri],
          response_types: ["code"],
          grant_types: ["authorization_code"],
          token_endpoint_auth_method: "none",
          application_type: "web",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Dynamic Client Registration failed (${response.status}): ${errorText}`);
      }

      const data = (await response.json()) as { client_id?: string };
      if (!data.client_id) {
        throw new Error("Dynamic Client Registration response did not include a client_id");
      }

      const newClientId = data.client_id;
      cachedClientId = newClientId;

      // Persist to database so subsequent serverless instances reuse it
      try {
        await db
          .insert(appSettingsTable)
          .values({
            key: "swiggy_client_id",
            value: newClientId,
          })
          .onConflictDoUpdate({
            target: appSettingsTable.key,
            set: { value: newClientId, updatedAt: new Date() },
          });
        console.log("[Swiggy DCR] Successfully persisted registered client_id to database");
      } catch (saveErr) {
        console.warn("[Swiggy DCR] Failed to persist client_id to database:", saveErr);
      }

      return newClientId;
    } finally {
      registrationPromise = null;
    }
  })();

  return registrationPromise;
}
