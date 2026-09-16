import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import {
  startSwiggyAuth,
  handleSwiggyOAuthCallback,
  getSwiggyStatusForUser,
  disconnectSwiggyUser,
} from "../mcp/swiggyAuthService";
import { SwiggyMcpManager, isSideEffectTool } from "../mcp/swiggyMcpManager";
import { SwiggyTokenExpiredError, SwiggyMcpUnavailableError, SwiggyToolExecutionError } from "../mcp/errors";
import { swiggyConfig } from "../lib/swiggyConfig";

const router = Router();

/**
 * TASK-008: GET /api/swiggy/auth/start
 * Initiates the server-side OAuth 2.1 + PKCE flow for an authenticated NutriFlow user.
 */
router.get("/swiggy/auth/start", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { authorizationUrl, state } = await startSwiggyAuth(req.user!.id);
    res.json({ authorizationUrl, state });
  } catch (error: any) {
    console.error("[SwiggyAuth] Failed to start authorization:", error);
    res.status(500).json({ error: "Failed to initialize Swiggy authorization" });
  }
});

/**
 * TASK-009: GET /api/swiggy/auth/callback
 * Server-side handler for the registered Swiggy OAuth redirect URI.
 */
router.get("/swiggy/auth/callback", async (req: Request, res: Response): Promise<void> => {
  const { code, state, error, error_description } = req.query as Record<string, string>;

  const result = await handleSwiggyOAuthCallback(code, state, error, error_description);

  if (!result.success) {
    console.warn("[SwiggyAuth Callback] Failed:", result.error);
    const redirectUrl = new URL("/auth/callback", swiggyConfig.redirectUri);
    redirectUrl.searchParams.set("swiggy_error", result.error || "Authorization failed");
    return res.redirect(redirectUrl.toString());
  }

  const redirectUrl = new URL("/auth/callback", swiggyConfig.redirectUri);
  redirectUrl.searchParams.set("swiggy_connected", "true");
  return res.redirect(redirectUrl.toString());
});

/**
 * TASK-009 & TASK-010: POST /api/swiggy/mcp/token
 * Exchange authorization code server-side from frontend callback component.
 */
router.post("/swiggy/mcp/token", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { code, state } = (req.body || {}) as { code?: string; state?: string };

  if (!code) {
    res.status(400).json({ error: "Missing authorization code" });
    return;
  }

  const result = await handleSwiggyOAuthCallback(code, state, undefined);

  if (!result.success) {
    res.status(400).json({ error: result.error || "Token exchange failed" });
    return;
  }

  res.json({
    status: "CONNECTED",
    message: "Swiggy account linked successfully",
  });
});

/**
 * TASK-038: GET /api/swiggy/status
 * Returns current Swiggy connection status for the authenticated user.
 */
router.get("/swiggy/status", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = await getSwiggyStatusForUser(req.user!.id);
    res.json(status);
  } catch (error: any) {
    console.error("[SwiggyStatus] Error retrieving connection status:", error);
    res.status(500).json({ error: "Failed to retrieve connection status" });
  }
});

/**
 * TASK-040: POST /api/swiggy/disconnect
 * Disconnects the user's Swiggy connection by purging server-side stored credentials.
 */
router.post("/swiggy/disconnect", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await disconnectSwiggyUser(req.user!.id);
    res.json({ success: true, status: "DISCONNECTED", message: "Swiggy connection removed." });
  } catch (error: any) {
    console.error("[SwiggyDisconnect] Error purging connection:", error);
    res.status(500).json({ error: "Failed to disconnect Swiggy account" });
  }
});

/**
 * TASK-018: GET /api/swiggy/mcp/tools
 * Discovers available tools across Food, Instamart, and Dineout for the user.
 */
router.get("/swiggy/mcp/tools", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const tools = await SwiggyMcpManager.discoverAllToolsForUser(req.user!.id);
    const classified = tools.map((t) => ({
      ...t,
      requiresConfirmation: isSideEffectTool(t.name),
    }));
    res.json({ tools: classified });
  } catch (error: any) {
    if (error instanceof SwiggyTokenExpiredError) {
      res.status(401).json({ error: error.message, code: error.code });
      return;
    }
    console.error("[SwiggyMcpTools] Tool discovery error:", error);
    res.status(500).json({ error: "Failed to discover Swiggy MCP tools" });
  }
});

/**
 * TASK-021, TASK-026, TASK-030, TASK-034, TASK-037: POST /api/swiggy/mcp/call
 * Invokes a discovered Swiggy MCP tool with side-effect confirmation gating.
 */
router.post("/swiggy/mcp/call", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { serverType, toolName, toolArguments, confirmed } = req.body || {};

  if (!serverType || !toolName) {
    res.status(400).json({ error: "Missing required parameters: serverType, toolName" });
    return;
  }

  // TASK-036 & TASK-037: Side Effect Confirmation Gate
  const isSideEffect = isSideEffectTool(toolName);
  if (isSideEffect && !confirmed) {
    res.status(200).json({
      confirmationRequired: true,
      serverType,
      toolName,
      toolArguments: toolArguments || {},
      message: `The operation "${toolName}" on Swiggy ${serverType} causes external side effects and requires explicit user confirmation.`,
    });
    return;
  }

  try {
    const client = await SwiggyMcpManager.getClientForUser(req.user!.id, serverType);
    const result = await client.callTool(toolName, toolArguments || {});
    res.json({ status: "success", serverType, toolName, result });
  } catch (error: any) {
    if (error instanceof SwiggyTokenExpiredError) {
      res.status(401).json({ error: error.message, code: error.code });
      return;
    }
    if (error instanceof SwiggyMcpUnavailableError) {
      res.status(503).json({ error: error.message, code: error.code });
      return;
    }
    if (error instanceof SwiggyToolExecutionError) {
      res.status(400).json({ error: error.message, code: error.code });
      return;
    }
    console.error(`[SwiggyMcpCall] Execution error in ${toolName}:`, error);
    res.status(500).json({ error: `Swiggy MCP tool execution failed: ${error?.message || error}` });
  }
});

/**
 * Backward-compatible address endpoint using live MCP client when connected.
 */
router.post("/swiggy/mcp/get_addresses", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await SwiggyMcpManager.getClientForUser(req.user!.id, "food");
    const result = await client.callTool("get_addresses", req.body || {});
    res.json({ status: "success", source: "mcp_live", addresses: result?.addresses || result });
  } catch (error: any) {
    if (error instanceof SwiggyTokenExpiredError) {
      res.status(401).json({ error: "Swiggy authorization expired. Please re-authorize.", code: "TOKEN_EXPIRED" });
      return;
    }
    // Return empty array rather than fake addresses when live server is unreachable
    res.status(503).json({ error: "Swiggy address service unreachable", status: "mcp_unavailable" });
  }
});

export default router;
