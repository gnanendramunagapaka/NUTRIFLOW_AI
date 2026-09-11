import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";

const router = Router();

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
