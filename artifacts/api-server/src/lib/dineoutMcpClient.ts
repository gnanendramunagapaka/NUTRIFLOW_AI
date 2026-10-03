import { SWIGGY_SERVICES } from "./swiggyDcr";
import {
  extractDineoutLocations,
  extractSwiggyMcpContent,
  extractDineoutRestaurantsFromMcp,
  type DineoutLocation,
  type RawSwiggyDineoutRestaurant,
} from "@workspace/api-zod";
import { SwiggyAuthError, SwiggyMcpError } from "./foodMcpClient";

export { SwiggyAuthError, SwiggyMcpError };

export interface DineoutMcpClientOptions {
  fetchFn?: typeof fetch;
  dineoutBaseUrl?: string;
  foodBaseUrl?: string;
}

/**
 * Client for interacting with Swiggy Dineout MCP tools.
 * Connects to https://mcp.swiggy.com/dineout using authenticated user tokens.
 * Enforces required MCP headers: Accept: "application/json, text/event-stream".
 */
export class DineoutMcpClient {
  private fetchFn: typeof fetch;
  private dineoutBaseUrl: string;
  private foodBaseUrl: string;

  constructor(options?: DineoutMcpClientOptions) {
    this.fetchFn = options?.fetchFn || globalThis.fetch;
    this.dineoutBaseUrl = options?.dineoutBaseUrl || SWIGGY_SERVICES["dineout"] || "https://mcp.swiggy.com/dineout";
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
   * Retrieves saved dining locations for the authenticated user.
   * Tries Dineout MCP tools/call get_saved_locations, falls back to direct endpoint,
   * and if necessary queries Food/account-level addresses as locations.
   */
  async getSavedLocations(userToken: string): Promise<DineoutLocation[]> {
    if (!userToken) {
      throw new SwiggyAuthError("Missing Swiggy access token");
    }

    try {
      // 1. Standard MCP tools/call get_saved_locations on Dineout service
      const mcpRes = await this.fetchFn(this.dineoutBaseUrl, {
        method: "POST",
        headers: this.getHeaders(userToken),
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: "get_saved_locations",
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
        const locations = extractDineoutLocations(content);
        if (locations.length > 0) {
          return locations;
        }
        const envelopeLocations = extractDineoutLocations(mcpData);
        if (envelopeLocations.length > 0) {
          return envelopeLocations;
        }
      }

      // 2. Direct endpoint /get_saved_locations on Dineout service
      const directRes = await this.fetchFn(`${this.dineoutBaseUrl}/get_saved_locations`, {
        method: "POST",
        headers: this.getHeaders(userToken),
        body: JSON.stringify({}),
      });

      if (directRes.status === 401) {
        throw new SwiggyAuthError();
      }

      if (directRes.ok) {
        const raw = await directRes.json();
        const locations = extractDineoutLocations(raw);
        if (locations.length > 0) {
          return locations;
        }
      }

      // 3. Fallback to Food service for account-level Swiggy addresses normalized as Dineout locations
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
        const locations = extractDineoutLocations(content);
        if (locations.length > 0) {
          return locations;
        }
        return extractDineoutLocations(foodData);
      }

      const errText = await mcpRes.text().catch(() => "");
      throw new SwiggyMcpError(`Swiggy Dineout saved location retrieval failed (${mcpRes.status}): ${errText}`);
    } catch (err: any) {
      if (err instanceof SwiggyAuthError || err instanceof SwiggyMcpError) {
        throw err;
      }
      throw new SwiggyMcpError(`Communication error with Swiggy Dineout location service: ${err?.message ?? err}`);
    }
  }

  /**
   * Invokes search_restaurants_dineout MCP tool on Dineout service.
   */
  async searchRestaurantsDineout(
    userToken: string,
    args: {
      query?: string;
      location_id?: string;
      locationId?: string;
      address_id?: string;
      addressId?: string;
      lat?: number;
      lng?: number;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<RawSwiggyDineoutRestaurant[]> {
    if (!userToken) {
      throw new SwiggyAuthError("Missing Swiggy access token");
    }

    const targetAddressId = args.addressId || args.address_id || args.locationId || args.location_id;
    const toolArguments: Record<string, unknown> = {};

    if (args.query) toolArguments.query = args.query;
    if (targetAddressId) {
      toolArguments.addressId = targetAddressId;
      toolArguments.address_id = targetAddressId;
      toolArguments.locationId = targetAddressId;
      toolArguments.location_id = targetAddressId;
    }
    const lat = typeof args.lat === "number" ? args.lat : typeof args.latitude === "number" ? args.latitude : undefined;
    const lng = typeof args.lng === "number" ? args.lng : typeof args.longitude === "number" ? args.longitude : undefined;
    if (typeof lat === "number" && !isNaN(lat)) {
      toolArguments.lat = lat;
      toolArguments.latitude = lat;
    }
    if (typeof lng === "number" && !isNaN(lng)) {
      toolArguments.lng = lng;
      toolArguments.longitude = lng;
    }

    try {
      const res = await this.fetchFn(this.dineoutBaseUrl, {
        method: "POST",
        headers: this.getHeaders(userToken),
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: "search_restaurants_dineout",
            arguments: toolArguments,
          },
        }),
      });

      if (res.status === 401) {
        throw new SwiggyAuthError();
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new SwiggyMcpError(`Swiggy Dineout restaurant search failed (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const content = extractSwiggyMcpContent(data);
      return extractDineoutRestaurantsFromMcp(content);
    } catch (err: any) {
      if (err instanceof SwiggyAuthError || err instanceof SwiggyMcpError) {
        throw err;
      }
      throw new SwiggyMcpError(`Communication error with Swiggy Dineout MCP: ${err?.message ?? err}`);
    }
  }

  /**
   * Invokes get_restaurant_details MCP tool on Dineout service.
   */
  async getRestaurantDetails(
    userToken: string,
    args: { restaurant_id: string }
  ): Promise<RawSwiggyDineoutRestaurant | null> {
    if (!userToken) {
      throw new SwiggyAuthError("Missing Swiggy access token");
    }

    try {
      const res = await this.fetchFn(this.dineoutBaseUrl, {
        method: "POST",
        headers: this.getHeaders(userToken),
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: "get_restaurant_details",
            arguments: args,
          },
        }),
      });

      if (res.status === 401) {
        throw new SwiggyAuthError();
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new SwiggyMcpError(`Swiggy Dineout restaurant details failed (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const content = extractSwiggyMcpContent(data) as any;
      if (!content || typeof content !== "object") return null;
      return content.restaurant || content;
    } catch (err: any) {
      if (err instanceof SwiggyAuthError || err instanceof SwiggyMcpError) {
        throw err;
      }
      throw new SwiggyMcpError(`Communication error with Swiggy Dineout MCP: ${err?.message ?? err}`);
    }
  }

  /**
   * Invokes get_available_slots MCP tool on Dineout service.
   */
  async getAvailableSlots(
    userToken: string,
    args: { restaurant_id: string; date?: string }
  ): Promise<string[]> {
    if (!userToken) {
      throw new SwiggyAuthError("Missing Swiggy access token");
    }

    try {
      const res = await this.fetchFn(this.dineoutBaseUrl, {
        method: "POST",
        headers: this.getHeaders(userToken),
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: "get_available_slots",
            arguments: args,
          },
        }),
      });

      if (res.status === 401) {
        throw new SwiggyAuthError();
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new SwiggyMcpError(`Swiggy Dineout available slots failed (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const content = extractSwiggyMcpContent(data) as any;
      if (!content || typeof content !== "object") return [];
      const slots = content.slots || content.available_slots || content.availableSlots || [];
      return Array.isArray(slots) ? slots.map(String) : [];
    } catch (err: any) {
      if (err instanceof SwiggyAuthError || err instanceof SwiggyMcpError) {
        throw err;
      }
      throw new SwiggyMcpError(`Communication error with Swiggy Dineout MCP: ${err?.message ?? err}`);
    }
  }
}

export const defaultDineoutMcpClient = new DineoutMcpClient();
