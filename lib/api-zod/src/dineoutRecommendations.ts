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
  type RawSwiggyDineoutRestaurant,
  normalizeSwiggyDineoutRestaurant,
} from "./swiggyAdapters";
import { extractSwiggyMcpContent } from "./foodRecommendations";

// ─── 1. Dineout Location Schemas & Types ──────────────────────────────────────

export const DineoutLocationSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  isDefault: z.boolean().optional(),
  label: z.string().optional(),
});

export type DineoutLocation = z.infer<typeof DineoutLocationSchema>;

export interface LocationResolutionResult {
  success: boolean;
  location?: DineoutLocation;
  clarificationNeeded?: boolean;
  availableLocations?: DineoutLocation[];
  error?: string;
}

// ─── 2. Request & Response Contracts ──────────────────────────────────────────

export const DineoutRecommendationRequestSchema = z.object({
  query: z.string().optional(),
  locationId: z.string().optional(),
  currentRequest: CurrentRequestContextSchema.optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export type DineoutRecommendationRequest = z.infer<typeof DineoutRecommendationRequestSchema>;

export const DineoutRecommendationResponseSchema = RecommendationResponseSchema.extend({
  locationUsed: DineoutLocationSchema.optional(),
  clarificationNeeded: z.boolean().optional(),
  availableLocations: z.array(DineoutLocationSchema).optional(),
});

export type DineoutRecommendationResponse = z.infer<typeof DineoutRecommendationResponseSchema>;

// ─── 3. Pure Dineout Location Helpers ─────────────────────────────────────────

/**
 * Extracts and normalizes Dineout saved locations from raw API/MCP responses.
 * Never invents mock or hardcoded locations.
 */
export function extractDineoutLocations(raw: unknown): DineoutLocation[] {
  if (!raw || typeof raw !== "object") return [];

  let candidateList: unknown[] = [];
  let defaultLocationId: string | undefined;
  let needsUserClarification = false;

  const obj = raw as Record<string, unknown>;

  // Check structuredContent envelope first (Swiggy MCP pattern)
  const structured = (obj.structuredContent && typeof obj.structuredContent === "object")
    ? (obj.structuredContent as Record<string, unknown>)
    : (obj.result && typeof obj.result === "object" && (obj.result as any).structuredContent && typeof (obj.result as any).structuredContent === "object")
    ? ((obj.result as any).structuredContent as Record<string, unknown>)
    : undefined;

  if (structured) {
    if (Array.isArray(structured.locations)) {
      candidateList = structured.locations;
    } else if (Array.isArray(structured.saved_locations)) {
      candidateList = structured.saved_locations;
    } else if (Array.isArray(structured.addresses)) {
      candidateList = structured.addresses;
    }
    const res = structured.resolution as Record<string, unknown> | undefined;
    if (res) {
      if (typeof res.defaultLocationId === "string") {
        defaultLocationId = res.defaultLocationId.trim();
      } else if (typeof res.defaultAddressId === "string") {
        defaultLocationId = res.defaultAddressId.trim();
      }
      if (res.needsUserClarification === true) {
        needsUserClarification = true;
      }
    }
  }

  if (candidateList.length === 0) {
    if (Array.isArray(obj.locations)) {
      candidateList = obj.locations;
    } else if (Array.isArray(obj.saved_locations)) {
      candidateList = obj.saved_locations;
    } else if (Array.isArray(obj.addresses)) {
      candidateList = obj.addresses;
    } else if (obj.result && typeof obj.result === "object") {
      const r = obj.result as Record<string, unknown>;
      if (Array.isArray(r.locations)) candidateList = r.locations;
      else if (Array.isArray(r.saved_locations)) candidateList = r.saved_locations;
      else if (Array.isArray(r.addresses)) candidateList = r.addresses;
    } else if (obj.data && typeof obj.data === "object") {
      const d = obj.data as Record<string, unknown>;
      if (Array.isArray(d.locations)) candidateList = d.locations;
      else if (Array.isArray(d.saved_locations)) candidateList = d.saved_locations;
      else if (Array.isArray(d.addresses)) candidateList = d.addresses;
    } else if (Array.isArray(raw)) {
      candidateList = raw;
    }
  }

  if (!defaultLocationId) {
    const res = (obj.resolution || (obj.result as any)?.resolution) as Record<string, unknown> | undefined;
    if (res) {
      if (typeof res.defaultLocationId === "string") {
        defaultLocationId = res.defaultLocationId.trim();
      } else if (typeof res.defaultAddressId === "string") {
        defaultLocationId = res.defaultAddressId.trim();
      }
      if (res.needsUserClarification === true) {
        needsUserClarification = true;
      }
    }
  }

  const results: DineoutLocation[] = [];
  for (const item of candidateList) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    const rawId = it.id ?? it.location_id ?? it.locationId ?? it.address_id ?? it._id;
    if (rawId == null) continue;

    const id = String(rawId).trim();
    if (!id) continue;

    const name = typeof it.name === "string" ? it.name.trim() : typeof it.title === "string" ? it.title.trim() : undefined;
    const address = typeof it.address === "string"
      ? it.address.trim()
      : typeof it.addressLine === "string"
      ? it.addressLine.trim()
      : typeof it.address_line === "string"
      ? it.address_line.trim()
      : typeof it.formatted_address === "string"
      ? it.formatted_address.trim()
      : typeof it.locality === "string"
      ? it.locality.trim()
      : undefined;

    const city = typeof it.city === "string" ? it.city.trim() : undefined;
    const label = typeof it.label === "string"
      ? it.label.trim()
      : typeof it.addressTag === "string"
      ? it.addressTag.trim()
      : typeof it.addressCategory === "string"
      ? it.addressCategory.trim()
      : undefined;

    const isExplicitDefault =
      it.isDefault === true ||
      it.is_default === true ||
      it.default === true ||
      it.is_default === 1 ||
      it.default === 1;

    const isEnvelopeDefault =
      !needsUserClarification && defaultLocationId ? id === defaultLocationId : false;

    const isDefault = isExplicitDefault || isEnvelopeDefault;

    let lat: number | undefined;
    const rawLat = it.lat ?? it.latitude;
    if (typeof rawLat === "number" && !isNaN(rawLat)) lat = rawLat;
    else if (typeof rawLat === "string" && !isNaN(parseFloat(rawLat))) lat = parseFloat(rawLat);

    let lng: number | undefined;
    const rawLng = it.lng ?? it.longitude;
    if (typeof rawLng === "number" && !isNaN(rawLng)) lng = rawLng;
    else if (typeof rawLng === "string" && !isNaN(parseFloat(rawLng))) lng = parseFloat(rawLng);

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

/**
 * Resolves user Dineout location deterministically without hardcoding.
 * If user has multiple saved locations and none was explicitly selected or default, requires clarification.
 */
export function resolveDineoutLocation(
  locations: DineoutLocation[],
  requestedLocationId?: string
): LocationResolutionResult {
  if (!locations || locations.length === 0) {
    return {
      success: false,
      error: "No saved locations found on your Swiggy Dineout account. Please set a location to explore restaurants.",
      clarificationNeeded: false,
    };
  }

  // 1. If explicit location ID requested, locate it strictly
  if (requestedLocationId && requestedLocationId.trim()) {
    const targetId = requestedLocationId.trim();
    const matched = locations.find((l) => l.id === targetId);
    if (matched) {
      return {
        success: true,
        location: matched,
        clarificationNeeded: false,
      };
    }
    return {
      success: false,
      error: `Location with ID "${requestedLocationId}" was not found on your Swiggy Dineout account.`,
      clarificationNeeded: true,
      availableLocations: locations,
    };
  }

  // 2. If exactly one saved location exists, use it
  if (locations.length === 1) {
    return {
      success: true,
      location: locations[0],
      clarificationNeeded: false,
    };
  }

  // 3. If multiple locations exist, check for an explicit default location
  const defaultLocations = locations.filter((l) => l.isDefault);
  if (defaultLocations.length === 1) {
    return {
      success: true,
      location: defaultLocations[0],
      clarificationNeeded: false,
    };
  }

  // 4. Multiple locations exist and none/multiple are marked default: require user clarification
  return {
    success: false,
    error: "Multiple saved locations found. Please select which location to use for Dineout discovery.",
    clarificationNeeded: true,
    availableLocations: locations,
  };
}

// ─── 4. MCP Response Extraction ───────────────────────────────────────────────

/**
 * Extracts raw Dineout restaurants from an unwrapped MCP response.
 * Handles structuredContent envelopes, top-level arrays, cards, and items/restaurants arrays.
 */
export function extractDineoutRestaurantsFromMcp(data: unknown): RawSwiggyDineoutRestaurant[] {
  if (!data) return [];

  let list: unknown[] = [];

  if (Array.isArray(data)) {
    list = data;
  } else if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const structured = (obj.structuredContent && typeof obj.structuredContent === "object")
      ? (obj.structuredContent as Record<string, unknown>)
      : (obj.result && typeof obj.result === "object" && (obj.result as any).structuredContent && typeof (obj.result as any).structuredContent === "object")
      ? ((obj.result as any).structuredContent as Record<string, unknown>)
      : undefined;

    if (structured) {
      if (Array.isArray(structured.restaurants)) {
        list = structured.restaurants;
      } else if (Array.isArray(structured.dining_restaurants)) {
        list = structured.dining_restaurants;
      } else if (Array.isArray(structured.items)) {
        list = structured.items;
      }
    }

    if (list.length === 0) {
      if (Array.isArray(obj.restaurants)) {
        list = obj.restaurants;
      } else if (Array.isArray(obj.dining_restaurants)) {
        list = obj.dining_restaurants;
      } else if (Array.isArray(obj.items)) {
        list = obj.items;
      } else if (obj.data && typeof obj.data === "object") {
        const d = obj.data as Record<string, unknown>;
        if (Array.isArray(d.restaurants)) list = d.restaurants;
        else if (Array.isArray(d.dining_restaurants)) list = d.dining_restaurants;
        else if (Array.isArray(d.items)) list = d.items;
      } else if (obj.result && typeof obj.result === "object") {
        const r = obj.result as Record<string, unknown>;
        if (Array.isArray(r.restaurants)) list = r.restaurants;
        else if (Array.isArray(r.dining_restaurants)) list = r.dining_restaurants;
        else if (Array.isArray(r.items)) list = r.items;
      } else if (Array.isArray(obj.cards)) {
        for (const card of obj.cards as any[]) {
          if (card && typeof card === "object") {
            if (Array.isArray(card.restaurants)) list.push(...card.restaurants);
            else if (Array.isArray(card.items)) list.push(...card.items);
            else if (card.card && typeof card.card === "object") {
              const inner = card.card;
              if (Array.isArray(inner.restaurants)) list.push(...inner.restaurants);
              else if (Array.isArray(inner.items)) list.push(...inner.items);
              else if (inner.gridElements?.infoWithStyle?.restaurants && Array.isArray(inner.gridElements.infoWithStyle.restaurants)) {
                list.push(...inner.gridElements.infoWithStyle.restaurants);
              }
            }
          }
        }
      }
    }
  }

  const results: RawSwiggyDineoutRestaurant[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    if (it.id != null || it.restaurant_id != null || it.restaurantId != null) {
      results.push(it as RawSwiggyDineoutRestaurant);
    }
  }

  return results;
}

// ─── 5. Batch Normalizer ──────────────────────────────────────────────────────

/**
 * Normalizes an array of raw Dineout restaurants into canonical NormalizedSwiggyCandidate items.
 * Structurally invalid items are cleanly skipped to preserve pipeline resilience.
 */
export function normalizeDineoutRestaurantsBatch(
  rawRestaurants: RawSwiggyDineoutRestaurant[]
): NormalizedSwiggyCandidate[] {
  const candidates: NormalizedSwiggyCandidate[] = [];

  for (const raw of rawRestaurants) {
    try {
      const normalized = normalizeSwiggyDineoutRestaurant(raw);
      candidates.push(normalized);
    } catch {
      // Skip structurally invalid individual items, maintain pipeline integrity
      continue;
    }
  }

  return candidates;
}

export { extractSwiggyMcpContent };
