import { swiggyConfig } from "../lib/swiggyConfig";
import {
  SwiggyMcpError,
  SwiggyTokenExpiredError,
  SwiggyMcpUnavailableError,
  SwiggyToolExecutionError,
} from "./errors";

export type SwiggyServerType = "food" | "instamart" | "dineout";

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc?: string;
  id?: string | number | null;
  result?: T;
  error?: JsonRpcError;
}

export interface MCPToolInputSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  description?: string;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: MCPToolInputSchema;
  serverType: SwiggyServerType;
}

export class SwiggyMcpClient {
  private serverUrl: string;
  private isInitialized = false;
  private requestIdCounter = 1;

  constructor(
    public readonly serverType: SwiggyServerType,
    private readonly accessToken: string
  ) {
    if (!accessToken) {
      throw new SwiggyTokenExpiredError("No Swiggy access token provided to MCP Client.");
    }

    switch (serverType) {
      case "food":
        this.serverUrl = swiggyConfig.foodMcpUrl;
        break;
      case "instamart":
        this.serverUrl = swiggyConfig.instamartMcpUrl;
        break;
      case "dineout":
        this.serverUrl = swiggyConfig.dineoutMcpUrl;
        break;
      default:
        throw new Error(`Unknown Swiggy server type: ${serverType}`);
    }
  }

  /**
   * TASK-017: Performs the Model Context Protocol initialization handshake (`initialize`).
   * Sends Bearer authorization header with user's access token.
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      const response = await this.sendJsonRpcRequest("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "NutriFlow-AI",
          version: "1.0.0",
        },
      });

      if (response && response.protocolVersion) {
        this.isInitialized = true;
        return true;
      }

      this.isInitialized = true;
      return true;
    } catch (err) {
      this.isInitialized = false;
      throw err;
    }
  }

  /**
   * TASK-018: Dynamically discovers the available tools exposed by the Swiggy MCP server.
   * Invokes `tools/list` over Streamable HTTP.
   */
  async listTools(): Promise<MCPTool[]> {
    await this.ensureInitialized();

    const response = await this.sendJsonRpcRequest("tools/list", {});
    const rawTools = response?.tools || response?.result?.tools || [];

    if (!Array.isArray(rawTools)) {
      return [];
    }

    return rawTools.map((t: any) => ({
      name: t.name,
      description: t.description || `Swiggy ${this.serverType} tool: ${t.name}`,
      inputSchema: t.inputSchema || { type: "object", properties: {} },
      serverType: this.serverType,
    }));
  }

  /**
   * TASK-034: Invokes a discovered Swiggy MCP tool with arguments (`tools/call`).
   */
  async callTool(toolName: string, toolArguments: Record<string, any> = {}): Promise<any> {
    await this.ensureInitialized();

    const response = await this.sendJsonRpcRequest("tools/call", {
      name: toolName,
      arguments: toolArguments,
    });

    if (response?.isError) {
      throw new SwiggyToolExecutionError(toolName, response.content || "Tool returned error state");
    }

    return response;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Helper method sending JSON-RPC 2.0 requests over Streamable HTTP transport.
   * Handles HTTP 401 (token expiration) and network failures appropriately.
   */
  private async sendJsonRpcRequest(method: string, params: Record<string, any>): Promise<any> {
    const id = this.requestIdCounter++;

    let httpResponse: Response;
    try {
      httpResponse = await fetch(this.serverUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id,
          method,
          params,
        }),
      });
    } catch (netErr: any) {
      console.error(`[SwiggyMcpClient] Network error connecting to ${this.serverType} (${this.serverUrl}):`, netErr?.message);
      throw new SwiggyMcpUnavailableError(`Failed to connect to Swiggy ${this.serverType} server`);
    }

    // Handle authentication expiration (401)
    if (httpResponse.status === 401) {
      console.warn(`[SwiggyMcpClient] HTTP 401 returned from ${this.serverType}. Marking token expired.`);
      throw new SwiggyTokenExpiredError();
    }

    // Handle other server errors
    if (!httpResponse.ok) {
      const bodyText = await httpResponse.text().catch(() => "");
      console.warn(`[SwiggyMcpClient] HTTP ${httpResponse.status} from ${this.serverType}:`, bodyText);
      throw new SwiggyMcpUnavailableError(`Swiggy ${this.serverType} server returned HTTP ${httpResponse.status}`);
    }

    const payload = (await httpResponse.json().catch(() => null)) as JsonRpcResponse | null;
    if (!payload || typeof payload !== "object") {
      throw new SwiggyMcpError("Malformed response from Swiggy MCP server");
    }

    if (payload.error) {
      if (payload.error.code === 401 || /unauthorized|invalid token|expired/i.test(payload.error.message)) {
        throw new SwiggyTokenExpiredError(payload.error.message);
      }
      throw new SwiggyMcpError(payload.error.message || "MCP server error", payload.error.code);
    }

    return payload.result !== undefined ? payload.result : payload;
  }
}
