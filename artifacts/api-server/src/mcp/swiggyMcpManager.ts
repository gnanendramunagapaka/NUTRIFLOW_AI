import { SwiggyMcpClient, SwiggyServerType, MCPTool } from "./client";
import { getSwiggyConnectionForUser, isSwiggyConnectionValid } from "./swiggyAuthService";
import { SwiggyTokenExpiredError, SwiggyMcpUnavailableError } from "./errors";

export interface ToolClassification {
  toolName: string;
  serverType: SwiggyServerType;
  requiresConfirmation: boolean; // TASK-036 & TASK-037
}

/**
 * List of known side-effect tool name patterns that require explicit user confirmation.
 */
const SIDE_EFFECT_PATTERNS = [
  /add.*cart/i,
  /update.*cart/i,
  /remove.*cart/i,
  /clear.*cart/i,
  /checkout/i,
  /order/i,
  /book/i,
  /reserve/i,
  /cancel/i,
  /pay/i,
];

/**
 * TASK-036: Classifies an MCP tool as read-only vs side-effecting.
 */
export function isSideEffectTool(toolName: string): boolean {
  return SIDE_EFFECT_PATTERNS.some((pattern) => pattern.test(toolName));
}

export class SwiggyMcpManager {
  /**
   * Returns an initialized MCP client for the specified server type and user ID.
   * Enforces user isolation by fetching credentials tied to the authenticated user ID.
   */
  static async getClientForUser(userId: number, serverType: SwiggyServerType): Promise<SwiggyMcpClient> {
    const connection = await getSwiggyConnectionForUser(userId);

    if (!connection) {
      throw new SwiggyTokenExpiredError("No Swiggy account connected for this user.");
    }

    if (new Date() > connection.expiresAt) {
      throw new SwiggyTokenExpiredError("Swiggy connection has expired. Please re-authorize.");
    }

    const client = new SwiggyMcpClient(serverType, connection.accessToken);
    await client.initialize();
    return client;
  }

  /**
   * TASK-018, TASK-020, TASK-025, TASK-029: Discovers all available tools across connected Swiggy servers.
   */
  static async discoverAllToolsForUser(userId: number): Promise<MCPTool[]> {
    const connection = await getSwiggyConnectionForUser(userId);
    if (!connection || new Date() > connection.expiresAt) {
      return [];
    }

    const servers: SwiggyServerType[] = ["food", "instamart", "dineout"];
    const allTools: MCPTool[] = [];

    for (const serverType of servers) {
      try {
        const client = new SwiggyMcpClient(serverType, connection.accessToken);
        const tools = await client.listTools();
        allTools.push(...tools);
      } catch (err: any) {
        // REQ-SERVER-003: Independent failure — failure of one MCP server does not fail others
        console.warn(`[SwiggyMcpManager] Tool discovery on ${serverType} server failed (non-fatal):`, err?.message);
      }
    }

    return allTools;
  }
}
