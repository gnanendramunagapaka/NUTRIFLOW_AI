import { z } from "zod";
import {
  CurrentRequestContextSchema,
  type CurrentRequestContext,
} from "./profileContext";
import {
  RecommendationResponseSchema,
  type RecommendationResponse,
} from "./recommendationService";
import {
  type NormalizedSwiggyCandidate,
  type RawSwiggyFoodRestaurant,
  type RawSwiggyFoodMenuItem,
  normalizeSwiggyFoodRestaurant,
  normalizeSwiggyFoodMenuItem,
} from "./swiggyAdapters";

// ─── 1. Swiggy Address Schemas & Types ─────────────────────────────────────────

export const SwiggyAddressSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  isDefault: z.boolean().optional(),
  label: z.string().optional(),
});

export type SwiggyAddress = z.infer<typeof SwiggyAddressSchema>;

// ─── 2. Request & Response Contracts ──────────────────────────────────────────

export const FoodRecommendationRequestSchema = z.object({
  mode: z.enum(["restaurants", "menu", "auto"]).default("auto"),
  restaurantId: z.string().optional(),
  query: z.string().optional(),
  addressId: z.string().optional(),
  currentRequest: CurrentRequestContextSchema.optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export type FoodRecommendationRequest = z.infer<typeof FoodRecommendationRequestSchema>;

export const FoodRecommendationResponseSchema = RecommendationResponseSchema.extend({
  mode: z.enum(["restaurants", "menu"]),
  addressUsed: SwiggyAddressSchema.optional(),
  clarificationNeeded: z.boolean().optional(),
  availableAddresses: z.array(SwiggyAddressSchema).optional(),
  restaurantInfo: z
    .object({
      id: z.string(),
      name: z.string().optional(),
      rating: z.number().optional(),
      costForTwo: z.number().optional(),
    })
    .optional(),
});

export type FoodRecommendationResponse = z.infer<typeof FoodRecommendationResponseSchema>;

// ─── 3. Pure Address Normalization Helpers ─────────────────────────────────────

/**
 * Extracts and validates Swiggy addresses from raw API/MCP responses.
 * Never invents mock or hardcoded addresses.
 */
export function extractSwiggyAddresses(raw: unknown): SwiggyAddress[] {
  if (!raw || typeof raw !== "object") return [];

  let candidateList: unknown[] = [];

  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.addresses)) {
    candidateList = obj.addresses;
  } else if (obj.result && typeof obj.result === "object" && Array.isArray((obj.result as any).addresses)) {
    candidateList = (obj.result as any).addresses;
  } else if (obj.data && typeof obj.data === "object" && Array.isArray((obj.data as any).addresses)) {
    candidateList = (obj.data as any).addresses;
  } else if (Array.isArray(raw)) {
    candidateList = raw;
  }

  const results: SwiggyAddress[] = [];
  for (const item of candidateList) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    const rawId = it.id ?? it.address_id;
    if (rawId == null) continue;

    const id = String(rawId).trim();
    if (!id) continue;

    const name = typeof it.name === "string" ? it.name.trim() : undefined;
    const address = typeof it.address === "string" ? it.address.trim() : undefined;
    const city = typeof it.city === "string" ? it.city.trim() : undefined;
    const label = typeof it.label === "string" ? it.label.trim() : undefined;
    const isDefault = it.isDefault === true || it.is_default === true || it.default === true;

    let lat: number | undefined;
    if (typeof it.lat === "number" && !isNaN(it.lat)) lat = it.lat;
    else if (typeof it.latitude === "number" && !isNaN(it.latitude)) lat = it.latitude;

    let lng: number | undefined;
    if (typeof it.lng === "number" && !isNaN(it.lng)) lng = it.lng;
    else if (typeof it.longitude === "number" && !isNaN(it.longitude)) lng = it.longitude;

    results.push({
      id,
      name: name || label,
      address,
      city,
      lat,
      lng,
      isDefault: isDefault || undefined,
      label,
    });
  }

  return results;
}

export interface AddressResolutionResult {
  success: boolean;
  address?: SwiggyAddress;
  clarificationNeeded?: boolean;
  availableAddresses?: SwiggyAddress[];
  error?: string;
}

/**
 * Resolves user Swiggy address deterministically without hardcoding.
 * If user has multiple addresses and none was selected/default, requires clarification.
 */
export function resolveSwiggyAddress(
  addresses: SwiggyAddress[],
  requestedAddressId?: string
): AddressResolutionResult {
  if (!addresses || addresses.length === 0) {
    return {
      success: false,
      error: "No delivery addresses found on your Swiggy account. Please add an address on Swiggy.",
      clarificationNeeded: false,
    };
  }

  // 1. If explicit address ID requested, locate it strictly
  if (requestedAddressId && requestedAddressId.trim()) {
    const targetId = requestedAddressId.trim();
    const matched = addresses.find((a) => a.id === targetId);
    if (matched) {
      return {
        success: true,
        address: matched,
        clarificationNeeded: false,
      };
    }
    return {
      success: false,
      error: `Address with ID "${requestedAddressId}" was not found on your Swiggy account.`,
      clarificationNeeded: true,
      availableAddresses: addresses,
    };
  }

  // 2. If exactly one address exists, use it
  if (addresses.length === 1) {
    return {
      success: true,
      address: addresses[0],
      clarificationNeeded: false,
    };
  }

  // 3. If multiple addresses exist, check for an explicit default address
  const defaultAddresses = addresses.filter((a) => a.isDefault);
  if (defaultAddresses.length === 1) {
    return {
      success: true,
      address: defaultAddresses[0],
      clarificationNeeded: false,
    };
  }

  // 4. Multiple addresses exist and none/multiple are marked default: require user clarification
  return {
    success: false,
    error: "Multiple delivery addresses found. Please select which address to use for food discovery.",
    clarificationNeeded: true,
    availableAddresses: addresses,
  };
}

// ─── 4. Pure MCP Response Parsing Helpers ─────────────────────────────────────

/**
 * Unwraps JSON-RPC 2.0 response or MCP content payload.
 */
export function extractSwiggyMcpContent(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;

  const obj = raw as Record<string, unknown>;

  // Check for JSON-RPC error
  if (obj.error) {
    const errMsg = typeof obj.error === "object" ? (obj.error as any).message || JSON.stringify(obj.error) : String(obj.error);
    throw new Error(`Swiggy MCP error: ${errMsg}`);
  }

  // Unpack result
  const result = obj.result !== undefined ? obj.result : obj;
  if (!result || typeof result !== "object") return result;

  const resObj = result as Record<string, unknown>;

  // Check for MCP standard content block: { content: [{ type: "text", text: "..." }] }
  if (Array.isArray(resObj.content) && resObj.content.length > 0) {
    const first = resObj.content[0];
    if (first && typeof first === "object" && typeof (first as any).text === "string") {
      try {
        return JSON.parse((first as any).text);
      } catch {
        return (first as any).text;
      }
    }
  }

  return result;
}

/**
 * Extracts raw restaurants from an unwrapped MCP response.
 */
export function extractFoodRestaurantsFromMcp(data: unknown): RawSwiggyFoodRestaurant[] {
  if (!data) return [];

  let list: unknown[] = [];

  if (Array.isArray(data)) {
    list = data;
  } else if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.restaurants)) {
      list = obj.restaurants;
    } else if (obj.data && typeof obj.data === "object" && Array.isArray((obj.data as any).restaurants)) {
      list = (obj.data as any).restaurants;
    } else if (Array.isArray(obj.cards)) {
      list = obj.cards;
    } else if (Array.isArray(obj.items)) {
      list = obj.items;
    }
  }

  const results: RawSwiggyFoodRestaurant[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    // Check if item looks like a restaurant (has id/restaurant_id and name or cuisines)
    if (it.id != null || it.restaurant_id != null) {
      results.push(it as RawSwiggyFoodRestaurant);
    }
  }

  return results;
}

/**
 * Extracts raw menu items from an unwrapped MCP response.
 */
export function extractFoodMenuItemsFromMcp(data: unknown): RawSwiggyFoodMenuItem[] {
  if (!data) return [];

  let list: unknown[] = [];

  if (Array.isArray(data)) {
    list = data;
  } else if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) {
      list = obj.items;
    } else if (Array.isArray(obj.menu)) {
      list = obj.menu;
    } else if (obj.data && typeof obj.data === "object") {
      const d = obj.data as Record<string, unknown>;
      if (Array.isArray(d.items)) list = d.items;
      else if (Array.isArray(d.menu)) list = d.menu;
    } else if (Array.isArray(obj.categories)) {
      for (const cat of obj.categories as any[]) {
        if (cat && Array.isArray(cat.items)) {
          list.push(...cat.items);
        }
      }
    }
  }

  const results: RawSwiggyFoodMenuItem[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    if (it.id != null || it.item_id != null) {
      results.push(it as RawSwiggyFoodMenuItem);
    }
  }

  return results;
}

// ─── 5. Batch Normalizers ─────────────────────────────────────────────────────

/**
 * Normalizes an array of raw restaurant data into canonical NormalizedSwiggyCandidate items.
 */
export function normalizeFoodRestaurantsBatch(
  rawRestaurants: RawSwiggyFoodRestaurant[]
): NormalizedSwiggyCandidate[] {
  const candidates: NormalizedSwiggyCandidate[] = [];

  for (const raw of rawRestaurants) {
    try {
      const normalized = normalizeSwiggyFoodRestaurant(raw);
      candidates.push(normalized);
    } catch (err) {
      // Skip structurally invalid individual items, maintain pipeline integrity
      continue;
    }
  }

  return candidates;
}

/**
 * Normalizes an array of raw menu items into canonical NormalizedSwiggyCandidate items.
 */
export function normalizeFoodMenuItemsBatch(
  rawMenuItems: RawSwiggyFoodMenuItem[],
  defaultRestaurantId?: string,
  defaultRestaurantName?: string
): NormalizedSwiggyCandidate[] {
  const candidates: NormalizedSwiggyCandidate[] = [];

  for (const raw of rawMenuItems) {
    try {
      const itemWithRest: RawSwiggyFoodMenuItem = {
        ...raw,
        restaurant_id: raw.restaurant_id ?? raw.restaurantId ?? defaultRestaurantId,
        restaurant_name: raw.restaurant_name ?? raw.restaurantName ?? defaultRestaurantName,
      };
      const normalized = normalizeSwiggyFoodMenuItem(itemWithRest);
      candidates.push(normalized);
    } catch (err) {
      // Skip structurally invalid individual items
      continue;
    }
  }

  return candidates;
}
