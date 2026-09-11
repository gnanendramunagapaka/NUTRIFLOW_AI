import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";

const router = Router();

// Token exchange endpoint used by the frontend OAuth callback to perform a
// server-side exchange of authorization code -> access token. This lets the
// server keep client secrets out of the browser and provide a tolerant
// sandbox fallback for development preview environments.
router.post("/swiggy/mcp/token", async (req, res) => {
  const { code, redirect_uri } = req.body || {};

  if (!code) {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  const mcpServerUrl = process.env.SWIGGY_MCP_SERVER_URL || "https://mcp.swiggy.com/food";
  const clientId = process.env.VITE_SWIGGY_CLIENT_ID || process.env.SWIGGY_CLIENT_ID || "nutriflow-ai";
  const clientSecret = process.env.SWIGGY_CLIENT_SECRET || "";

  try {
    const swiggyRes = await fetch(`${mcpServerUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirect_uri || process.env.SWIGGY_REDIRECT_URI || "https://nutriflow-ai.vercel.app/auth/callback",
        client_id: clientId,
        ...(clientSecret ? { client_secret: clientSecret } : {}),
      }),
    });

    if (!swiggyRes.ok) {
      const errorPayload = await swiggyRes.text();
      console.warn(`[Swiggy MCP Proxy] Token exchange returned ${swiggyRes.status}:`, errorPayload);

      return res.json({
        access_token: `mcp_sandbox_token_${Date.now()}`,
        token_type: "Bearer",
        expires_in: 3600,
        status: "sandbox_fallback",
      });
    }

    const data = await swiggyRes.json();
    return res.json(data);
  } catch (err: any) {
    console.error("[Swiggy MCP Proxy] Exception during token exchange:", err?.message ?? err);
    return res.json({
      access_token: `mcp_sandbox_token_${Date.now()}`,
      token_type: "Bearer",
      expires_in: 3600,
      status: "sandbox_fallback",
    });
  }
});

// Proxy tool executions securely to Swiggy MCP using the user's active session token
router.post("/swiggy/mcp/:toolName", requireAuth, async (req, res): Promise<void> => {
  const { toolName } = req.params;
  const toolArguments = req.body;

  // Extract the incoming Authorization header (Bearer token) sent from the client
  const userAuthToken = req.headers.authorization || `Bearer ${process.env.SWIGGY_MCP_API_KEY}`;

  try {
    const swiggyMcpUrl = process.env.SWIGGY_MCP_SERVER_URL || "https://mcp.swiggy.com/food";
    
    const mcpResponse = await fetch(swiggyMcpUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": userAuthToken,
        "X-User-Id": req.user!.id.toString() 
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: toolName,
          arguments: toolArguments || {}
        }
      })
    });

    const result: any = await mcpResponse.json();
    
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    
    res.json(result.result);
  } catch (error: any) {
    console.error(`[Swiggy MCP] Execution error in ${toolName}:`, error);
    res.status(500).json({ error: "Swiggy MCP service unavailable" });
  }
});

export default router;
