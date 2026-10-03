import { SWIGGY_SERVICES } from "./swiggyDcr";
import {
  extractSwiggyAddresses,
  extractSwiggyMcpContent,
  extractFoodRestaurantsFromMcp,
  extractFoodMenuItemsFromMcp,
  type SwiggyAddress,
  type RawSwiggyFoodRestaurant,
  type RawSwiggyFoodMenuItem,
} from "@workspace/api-zod";

export class SwiggyAuthError extends Error {
  public readonly requiresReauth = true;
  constructor(message: string = "Swiggy session has expired or been revoked") {
    super(message);
    this.name = "SwiggyAuthError";
  }
}

export class SwiggyMcpError extends Error {
  public readonly status: number;
  constructor(message: string, status: number = 502) {
    super(message);
    this.name = "SwiggyMcpError";
    this.status = status;
  }
}

export interface FoodMcpClientOptions {
  fetchFn?: typeof fetch;
  foodBaseUrl?: string;
}

/**
 * Client for interacting with Swiggy Food MCP tools.
 * Uses authenticated user token and enforces required MCP headers.
 */
export class FoodMcpClient {
  private fetchFn: typeof fetch;
  private foodBaseUrl: string;

  constructor(options?: FoodMcpClientOptions) {
    this.fetchFn = options?.fetchFn || globalThis.fetch;
    this.foodBaseUrl = options?.foodBaseUrl || SWIGGY_SERVICES["food"] || "https://mcp.swiggy.com/food";
  }

  private getHeaders(userToken: string): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${userToken}`,
    };
  }

  /**
   * Retrieves saved delivery addresses for the authenticated user.
   */
  async getAddresses(userToken: string): Promise<SwiggyAddress[]> {
    if (!userToken) {
      throw new SwiggyAuthError("Missing Swiggy access token");
    }

    try {
      // 1. Standard MCP tools/call get_addresses (matches production handleMcpToolCall route)
      const mcpRes = await this.fetchFn(this.foodBaseUrl, {
        method: "POST",
        headers: this.getHeaders(userToken),
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: "get_addresses",
            arguments: {},
          },
        }),
      });

      if (mcpRes.status === 401) {
        throw new SwiggyAuthError();
      }

      if (mcpRes.ok) {
        const mcpData = await mcpRes.json();
        const content = extractSwiggyMcpContent(mcpData);
        const addresses = extractSwiggyAddresses(content);
        if (addresses.length > 0) {
          return addresses;
        }
        // Fallback: extract directly from the raw MCP JSON-RPC envelope
        return extractSwiggyAddresses(mcpData);
      }

      // 2. Fallback to direct /get_addresses endpoint
      const res = await this.fetchFn(`${this.foodBaseUrl}/get_addresses`, {
        method: "POST",
        headers: this.getHeaders(userToken),
        body: JSON.stringify({}),
      });

      if (res.status === 401) {
        throw new SwiggyAuthError();
      }

      if (res.ok) {
        const raw = await res.json();
        return extractSwiggyAddresses(raw);
      }

      const errText = await mcpRes.text().catch(() => "");
      throw new SwiggyMcpError(`Swiggy address retrieval failed (${mcpRes.status}): ${errText}`);
    } catch (err: any) {
      if (err instanceof SwiggyAuthError || err instanceof SwiggyMcpError) {
        throw err;
      }
      throw new SwiggyMcpError(`Communication error with Swiggy address service: ${err?.message ?? err}`);
    }
  }

  /**
   * Invokes search_restaurants MCP tool to find restaurants.
   */
  async searchRestaurants(
    userToken: string,
    args: { query?: string; address_id?: string; addressId?: string; lat?: number; lng?: number }
  ): Promise<RawSwiggyFoodRestaurant[]> {
    if (!userToken) {
      throw new SwiggyAuthError("Missing Swiggy access token");
    }

    const addressId = args?.address_id || args?.addressId;
    const toolArguments: Record<string, unknown> = { ...(args || {}) };
    if (addressId) {
      toolArguments.address_id = addressId;
      toolArguments.addressId = addressId;
    }

    try {
      const res = await this.fetchFn(this.foodBaseUrl, {
        method: "POST",
        headers: this.getHeaders(userToken),
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: "search_restaurants",
            arguments: toolArguments,
          },
        }),
      });

      if (res.status === 401) {
        throw new SwiggyAuthError();
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new SwiggyMcpError(`Swiggy restaurant search failed (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const content = extractSwiggyMcpContent(data);
      return extractFoodRestaurantsFromMcp(content);
    } catch (err: any) {
      if (err instanceof SwiggyAuthError || err instanceof SwiggyMcpError) {
        throw err;
      }
      throw new SwiggyMcpError(`Communication error with Swiggy Food MCP: ${err?.message ?? err}`);
    }
  }

  /**
   * Invokes get_restaurant_menu MCP tool.
   */
  async getRestaurantMenu(
    userToken: string,
    args: { restaurant_id: string; address_id?: string }
  ): Promise<RawSwiggyFoodMenuItem[]> {
    if (!userToken) {
      throw new SwiggyAuthError("Missing Swiggy access token");
    }

    try {
      const res = await this.fetchFn(this.foodBaseUrl, {
        method: "POST",
        headers: this.getHeaders(userToken),
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: "get_restaurant_menu",
            arguments: args,
          },
        }),
      });

      if (res.status === 401) {
        throw new SwiggyAuthError();
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new SwiggyMcpError(`Swiggy restaurant menu lookup failed (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const content = extractSwiggyMcpContent(data);
      return extractFoodMenuItemsFromMcp(content);
    } catch (err: any) {
      if (err instanceof SwiggyAuthError || err instanceof SwiggyMcpError) {
        throw err;
      }
      throw new SwiggyMcpError(`Communication error with Swiggy menu service: ${err?.message ?? err}`);
    }
  }

  /**
   * Invokes search_menu MCP tool.
   */
  async searchMenu(
    userToken: string,
    args: { query: string; restaurant_id?: string; address_id?: string }
  ): Promise<RawSwiggyFoodMenuItem[]> {
    if (!userToken) {
      throw new SwiggyAuthError("Missing Swiggy access token");
    }

    try {
      const res = await this.fetchFn(this.foodBaseUrl, {
        method: "POST",
        headers: this.getHeaders(userToken),
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: "search_menu",
            arguments: args,
          },
        }),
      });

      if (res.status === 401) {
        throw new SwiggyAuthError();
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new SwiggyMcpError(`Swiggy menu search failed (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const content = extractSwiggyMcpContent(data);
      return extractFoodMenuItemsFromMcp(content);
    } catch (err: any) {
      if (err instanceof SwiggyAuthError || err instanceof SwiggyMcpError) {
        throw err;
      }
      throw new SwiggyMcpError(`Communication error with Swiggy menu search: ${err?.message ?? err}`);
    }
  }
}

export const defaultFoodMcpClient = new FoodMcpClient();
