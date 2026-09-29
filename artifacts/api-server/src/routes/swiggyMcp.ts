import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import { db, userSwiggyTokensTable, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  SWIGGY_AUTH_URL,
  SWIGGY_TOKEN_URL,
  SWIGGY_SERVICES,
  getSwiggyClientId,
  getRedirectUri,
} from "../lib/swiggyDcr";
import {
  createSessionToken,
  extractSwiggyUserIdFromToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
} from "../lib/session";
import crypto from "node:crypto";

const router = Router();

// GET /api/swiggy/config: Provides public OAuth client configuration to frontend
router.get("/swiggy/config", async (_req: Request, res: Response): Promise<void> => {
  try {
    const clientId = await getSwiggyClientId();
    const redirectUri = getRedirectUri();
    res.json({
      clientId,
      redirectUri,
      authUrl: SWIGGY_AUTH_URL,
    });
  } catch (err: any) {
    console.error("[Swiggy Config] Failed to retrieve client ID:", err?.message ?? err);
    res.status(500).json({ error: "Swiggy client configuration unavailable" });
  }
});

// GET /api/swiggy/status: Checks if authenticated user has an active, valid Swiggy token
router.get("/swiggy/status", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const [tokenRecord] = await db
      .select()
      .from(userSwiggyTokensTable)
      .where(eq(userSwiggyTokensTable.userId, userId))
      .limit(1);

    if (!tokenRecord) {
      res.json({ connected: false, expiresAt: null });
      return;
    }

    const now = new Date();
    if (now >= new Date(tokenRecord.expiresAt)) {
      // Token expired (5 days lifetime exceeded) — clean up and signal re-auth
      await db
        .delete(userSwiggyTokensTable)
        .where(eq(userSwiggyTokensTable.userId, userId));

      res.json({ connected: false, expiresAt: null, expired: true });
      return;
    }

    res.json({
      connected: true,
      expiresAt: tokenRecord.expiresAt.toISOString(),
    });
  } catch (err: any) {
    console.error("[Swiggy Status] Query error:", err?.message ?? err);
    res.status(500).json({ error: "Failed to check Swiggy connection status" });
  }
});

// POST /api/swiggy/disconnect: Removes user's Swiggy access token and clears session cookie
router.post("/swiggy/disconnect", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    await db
      .delete(userSwiggyTokensTable)
      .where(eq(userSwiggyTokensTable.userId, userId));

    res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    res.json({ success: true, connected: false });
  } catch (err: any) {
    console.error("[Swiggy Disconnect] Error:", err?.message ?? err);
    res.status(500).json({ error: "Failed to disconnect Swiggy account" });
  }
});

// Helper for Swiggy token exchange and session establishment
async function handleTokenExchange(req: Request, res: Response): Promise<void> {
  const { code, code_verifier, redirect_uri } = (req.body || {}) as {
    code?: string;
    code_verifier?: string;
    redirect_uri?: string;
  };

  if (!code || !code_verifier) {
    res.status(400).json({ error: "Missing authorization code or code_verifier" });
    return;
  }

  const redirectUri = redirect_uri || getRedirectUri();

  let clientId: string;
  try {
    clientId = await getSwiggyClientId();
  } catch (dcrErr: any) {
    console.error("[Swiggy Token Exchange] Client ID resolution failed:", dcrErr?.message ?? dcrErr);
    res.status(500).json({ error: "Swiggy OAuth client not registered" });
    return;
  }

  let swiggyRes: any;
  try {
    // 1. Exchange authorization code for Swiggy access token using PKCE verifier
    swiggyRes = await fetch(SWIGGY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        code,
        redirect_uri: redirectUri,
        code_verifier,
      }),
    });
  } catch (netErr: any) {
    console.error("[Swiggy Token Exchange] Network communication failure:", netErr?.message ?? netErr);
    res.status(502).json({ error: "Swiggy token service communication failure" });
    return;
  }

  if (!swiggyRes.ok) {
    const errorText = await swiggyRes.text();
    console.warn(`[Swiggy Token Exchange] Failed (${swiggyRes.status}):`, errorText);
    res.status(swiggyRes.status).json({
      error: "Swiggy authorization failed",
      details: errorText,
    });
    return;
  }

  let data: {
    access_token: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
  };
  try {
    data = (await swiggyRes.json()) as any;
  } catch (jsonErr: any) {
    console.error("[Swiggy Token Exchange] Failed to parse response:", jsonErr?.message ?? jsonErr);
    res.status(502).json({ error: "Invalid response from Swiggy token service" });
    return;
  }

  if (!data?.access_token) {
    res.status(400).json({ error: "Swiggy token response missing access_token" });
    return;
  }

  // 2. Extract validated Swiggy user identity strictly using documented JWT 'sub' claim
  let swiggyUserId: string;
  try {
    swiggyUserId = extractSwiggyUserIdFromToken(data.access_token);
  } catch (parseErr: any) {
    console.error("[Swiggy Token Exchange] Failed to extract identity from token:", parseErr.message);
    res.status(502).json({ error: "Invalid Swiggy identity token" });
    return;
  }

  // 3. Find or auto-provision persistent NutriFlow user profile and store Swiggy token in database
  let user: typeof userProfilesTable.$inferSelect;
  const expiresInSec = data.expires_in || 432000;
  const expiresAt = new Date(Date.now() + expiresInSec * 1000);

  try {
    const [existingUser] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.swiggyUserId, swiggyUserId))
      .limit(1);

    if (existingUser) {
      user = existingUser;
    } else {
      const [created] = await db
        .insert(userProfilesTable)
        .values({
          id: crypto.randomUUID(),
          swiggyUserId,
          name: "Swiggy User",
          email: null,
          onboardingCompleted: false,
          goal: "Stay Healthy",
          dietaryPreferences: [],
          allergies: [],
          wellnessScore: 72,
          streak: 0,
        })
        .returning();
      user = created;
      console.log(`[Swiggy Auth] Created new NutriFlow user for Swiggy user ${swiggyUserId} (${user.id})`);
    }

    const [existingToken] = await db
      .select({ id: userSwiggyTokensTable.id })
      .from(userSwiggyTokensTable)
      .where(eq(userSwiggyTokensTable.userId, user.id))
      .limit(1);

    if (existingToken) {
      await db
        .update(userSwiggyTokensTable)
        .set({
          accessToken: data.access_token,
          tokenType: data.token_type || "Bearer",
          scope: data.scope || "mcp:tools",
          expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(userSwiggyTokensTable.id, existingToken.id));
    } else {
      await db.insert(userSwiggyTokensTable).values({
        userId: user.id,
        accessToken: data.access_token,
        tokenType: data.token_type || "Bearer",
        scope: data.scope || "mcp:tools",
        expiresAt,
      });
    }

    console.log(`[Swiggy Token Exchange] Stored Swiggy token for user ${user.id}`);
  } catch (dbErr: any) {
    console.error("[Swiggy Auth] Database persistence error:", dbErr?.message ?? dbErr);
    res.status(500).json({ error: "Failed to persist user profile or Swiggy session" });
    return;
  }

  // 4. Establish NutriFlow server-managed session via signed HttpOnly cookie
  let sessionToken: string;
  try {
    sessionToken = createSessionToken({
      userId: user.id,
      swiggyUserId: user.swiggyUserId || swiggyUserId,
    });
  } catch (sessionErr: any) {
    console.error("[Swiggy Auth] Session initialization error:", sessionErr?.message ?? sessionErr);
    res.status(500).json({ error: "Failed to initialize user session" });
    return;
  }

  res.cookie(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || !!process.env.VERCEL,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS,
  });

  // 5. Return safe profile confirmation to browser — RAW ACCESS TOKEN IS NEVER EXPOSED
  res.json({
    success: true,
    connected: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      onboardingCompleted: user.onboardingCompleted,
      goal: user.goal,
      wellnessScore: user.wellnessScore,
      streak: user.streak,
    },
    expiresAt: expiresAt.toISOString(),
  });
}

// POST /api/swiggy/oauth/callback (PUBLIC: Authenticated via PKCE code + verifier, NOT Supabase JWT)
router.post("/swiggy/oauth/callback", handleTokenExchange);
router.post("/swiggy/mcp/token", handleTokenExchange);

// Helper function to resolve user token and check 5-day expiration
async function getValidUserToken(userId: string): Promise<string | null> {
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

// POST /api/swiggy/mcp/get_addresses: Dedicated address retrieval proxy
router.post("/swiggy/mcp/get_addresses", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const userToken = await getValidUserToken(userId);

  if (!userToken) {
    res.status(401).json({
      error: "Swiggy account not connected or session expired",
      requires_reauth: true,
    });
    return;
  }

  const foodMcpUrl = SWIGGY_SERVICES["food"];

  try {
    const swiggyRes = await fetch(`${foodMcpUrl}/get_addresses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify(req.body || {}),
    });

    if (swiggyRes.status === 401) {
      // Swiggy invalidated token — invalidate locally
      await db.delete(userSwiggyTokensTable).where(eq(userSwiggyTokensTable.userId, userId));
      res.status(401).json({
        error: "Swiggy session has expired or been revoked",
        requires_reauth: true,
      });
      return;
    }

    if (!swiggyRes.ok) {
      const errText = await swiggyRes.text();
      res.status(swiggyRes.status).json({
        error: "Swiggy address retrieval failed",
        details: errText,
      });
      return;
    }

    const data = await swiggyRes.json();
    res.json(data);
  } catch (err: any) {
    console.error("[Swiggy MCP get_addresses] Error:", err?.message ?? err);
    res.status(502).json({ error: "Failed to communicate with Swiggy MCP service" });
  }
});

// Proxy handler for generic MCP tool execution
async function handleMcpToolCall(
  serviceKey: string,
  toolName: string,
  toolArguments: any,
  req: Request,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const userToken = await getValidUserToken(userId);

  if (!userToken) {
    res.status(401).json({
      error: "Swiggy account not connected or session expired",
      requires_reauth: true,
    });
    return;
  }

  const baseUrl = SWIGGY_SERVICES[serviceKey.toLowerCase()] || SWIGGY_SERVICES["food"];

  try {
    const mcpResponse = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: toolName,
          arguments: toolArguments || {},
        },
      }),
    });

    if (mcpResponse.status === 401) {
      await db.delete(userSwiggyTokensTable).where(eq(userSwiggyTokensTable.userId, userId));
      res.status(401).json({
        error: "Swiggy session has expired or been revoked",
        requires_reauth: true,
      });
      return;
    }

    const result = (await mcpResponse.json()) as any;

    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json(result.result ?? result);
  } catch (err: any) {
    console.error(`[Swiggy MCP ${serviceKey}/${toolName}] Error:`, err?.message ?? err);
    res.status(502).json({ error: "Swiggy MCP service unavailable" });
  }
}

// POST /api/swiggy/mcp/:service/:toolName (Explicit service routing: food, im, dineout)
router.post("/swiggy/mcp/:service/:toolName", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const service = (Array.isArray(req.params.service) ? req.params.service[0] : req.params.service) || "food";
  const toolName = (Array.isArray(req.params.toolName) ? req.params.toolName[0] : req.params.toolName) || "";
  
  if (service in SWIGGY_SERVICES) {
    await handleMcpToolCall(service, toolName, req.body, req, res);
  } else {
    // Default to food service if the first param is a sub-tool path
    await handleMcpToolCall("food", `${service}/${toolName}`, req.body, req, res);
  }
});

// POST /api/swiggy/mcp/:toolName (Defaults to food service)
router.post("/swiggy/mcp/:toolName", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const toolName = (Array.isArray(req.params.toolName) ? req.params.toolName[0] : req.params.toolName) || "";
  await handleMcpToolCall("food", toolName, req.body, req, res);
});


export default router;
