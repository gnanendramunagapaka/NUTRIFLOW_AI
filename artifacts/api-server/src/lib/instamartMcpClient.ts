import { SWIGGY_SERVICES } from "./swiggyDcr";
import {
  extractSwiggyAddresses,
  extractSwiggyMcpContent,
  extractInstamartProductsFromMcp,
  type SwiggyAddress,
  type RawSwiggyInstamartProduct,
} from "@workspace/api-zod";
import { SwiggyAuthError, SwiggyMcpError } from "./foodMcpClient";

export { SwiggyAuthError, SwiggyMcpError };

export interface InstamartMcpClientOptions {
  fetchFn?: typeof fetch;
  imBaseUrl?: string;
  foodBaseUrl?: string;
}

/**
 * Client for interacting with Swiggy Instamart MCP tools.
 * Connects to https://mcp.swiggy.com/im using authenticated user tokens.
 * Enforces required MCP headers: Accept: "application/json, text/event-stream".
 */
export class InstamartMcpClient {
  private fetchFn: typeof fetch;
  private imBaseUrl: string;
  private foodBaseUrl: string;

  constructor(options?: InstamartMcpClientOptions) {
    this.fetchFn = options?.fetchFn || globalThis.fetch;
    this.imBaseUrl = options?.imBaseUrl || SWIGGY_SERVICES["im"] || "https://mcp.swiggy.com/im";
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
   * Tries Instamart MCP tools/call get_addresses, falls back to direct endpoint,
   * and if necessary queries Food MCP addresses (Swiggy addresses are account-wide).
   */
  async getAddresses(userToken: string): Promise<SwiggyAddress[]> {
    if (!userToken) {
      throw new SwiggyAuthError("Missing Swiggy access token");
    }

    try {
      // 1. Standard MCP tools/call get_addresses on Instamart service
      const mcpRes = await this.fetchFn(this.imBaseUrl, {
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
        const envelopeAddresses = extractSwiggyAddresses(mcpData);
        if (envelopeAddresses.length > 0) {
          return envelopeAddresses;
        }
      }

      // 2. Direct endpoint /get_addresses on Instamart service
      const directRes = await this.fetchFn(`${this.imBaseUrl}/get_addresses`, {
        method: "POST",
        headers: this.getHeaders(userToken),
        body: JSON.stringify({}),
      });

      if (directRes.status === 401) {
        throw new SwiggyAuthError();
      }

      if (directRes.ok) {
        const raw = await directRes.json();
        const addresses = extractSwiggyAddresses(raw);
        if (addresses.length > 0) {
          return addresses;
        }
      }

      // 3. Fallback to Food service for account-level Swiggy addresses if IM doesn't return any
      const foodRes = await this.fetchFn(this.foodBaseUrl, {
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

      if (foodRes.status === 401) {
        throw new SwiggyAuthError();
      }

      if (foodRes.ok) {
        const foodData = await foodRes.json();
        const content = extractSwiggyMcpContent(foodData);
        const addresses = extractSwiggyAddresses(content);
        if (addresses.length > 0) {
          return addresses;
        }
        return extractSwiggyAddresses(foodData);
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
   * Invokes search_products MCP tool on Instamart service.
   */
  async searchProducts(
    userToken: string,
    args: { query?: string; address_id?: string; addressId?: string; lat?: number; lng?: number }
  ): Promise<RawSwiggyInstamartProduct[]> {
    if (!userToken) {
      throw new SwiggyAuthError("Missing Swiggy access token");
    }

    const addressId = args.address_id || args.addressId;
    const toolArguments: Record<string, unknown> = {};

    if (args.query) toolArguments.query = args.query;
    if (addressId) {
      toolArguments.address_id = addressId;
      toolArguments.addressId = addressId;
    }
    if (typeof args.lat === "number") toolArguments.lat = args.lat;
    if (typeof args.lng === "number") toolArguments.lng = args.lng;

    try {
      const res = await this.fetchFn(this.imBaseUrl, {
        method: "POST",
        headers: this.getHeaders(userToken),
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: "search_products",
            arguments: toolArguments,
          },
        }),
      });

      if (res.status === 401) {
        throw new SwiggyAuthError();
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new SwiggyMcpError(`Swiggy Instamart product search failed (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const content = extractSwiggyMcpContent(data);
      return extractInstamartProductsFromMcp(content);
    } catch (err: any) {
      if (err instanceof SwiggyAuthError || err instanceof SwiggyMcpError) {
        throw err;
      }
      throw new SwiggyMcpError(`Communication error with Swiggy Instamart MCP: ${err?.message ?? err}`);
    }
  }

  /**
   * Invokes your_go_to_items MCP tool on Instamart service.
   */
  async yourGoToItems(
    userToken: string,
    args?: { address_id?: string; addressId?: string }
  ): Promise<RawSwiggyInstamartProduct[]> {
    if (!userToken) {
      throw new SwiggyAuthError("Missing Swiggy access token");
    }

    const addressId = args?.address_id || args?.addressId;
    const toolArguments: Record<string, unknown> = {};
    if (addressId) {
      toolArguments.address_id = addressId;
      toolArguments.addressId = addressId;
    }

    try {
      const res = await this.fetchFn(this.imBaseUrl, {
        method: "POST",
        headers: this.getHeaders(userToken),
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: "your_go_to_items",
            arguments: toolArguments,
          },
        }),
      });

      if (res.status === 401) {
        throw new SwiggyAuthError();
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new SwiggyMcpError(`Swiggy Instamart your_go_to_items failed (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const content = extractSwiggyMcpContent(data);
      return extractInstamartProductsFromMcp(content);
    } catch (err: any) {
      if (err instanceof SwiggyAuthError || err instanceof SwiggyMcpError) {
        throw err;
      }
      throw new SwiggyMcpError(`Communication error with Swiggy Instamart MCP: ${err?.message ?? err}`);
    }
  }
}

export const defaultInstamartMcpClient = new InstamartMcpClient();
