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
  addressId: z.string().optional(),
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
    const rawId = it.id ?? it.addressId ?? it.address_id ?? it.location_id ?? it.locationId ?? it._id;
    if (rawId == null) continue;

    const id = String(rawId).trim();
    if (!id) continue;

    const rawAddressId = it.addressId ?? it.address_id ?? it.id;
    const addressId = rawAddressId != null ? String(rawAddressId).trim() : id;

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
      addressId: addressId || id,
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
    const matched = locations.find((l) => l.id === targetId || l.addressId === targetId);
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
 * Defensive parser for raw text responses from Swiggy Dineout MCP tools.
 * Handles prose listings such as:
 * "Found 39 restaurant(s) matching "restaurants", showing 10. 29 more available...
 * 1. Punjab Grill (ID: 101)
 *    Rating: 4.7
 *    Cuisine: North Indian, Mughlai
 *    Cost for two: ₹2200
 *    Locality: Koramangala"
 *
 * Guaranteed defensive:
 * - Malformed lines are skipped
 * - Missing optional fields remain undefined
 * - No fabricated values or nutrition data
 * - Non-participating warnings are preserved in tags without booking slots
 */
export function parseDineoutRestaurantsFromText(text: string): RawSwiggyDineoutRestaurant[] {
  if (!text || typeof text !== "string") return [];

  const trimmedText = text.trim();
  if (!trimmedText) return [];

  const results: RawSwiggyDineoutRestaurant[] = [];

  // 1. Check for markdown table format: | Name | ID | ... |
  const lines = trimmedText.split(/\r?\n/);
  const tableLines = lines.filter((l) => l.trim().startsWith("|") && l.trim().endsWith("|"));
  if (tableLines.length >= 3) {
    const headerLine = tableLines[0].toLowerCase();
    if (headerLine.includes("name") || headerLine.includes("restaurant") || headerLine.includes("id")) {
      const headers = tableLines[0].split("|").map((h) => h.trim().toLowerCase()).filter(Boolean);
      for (let i = 2; i < tableLines.length; i++) {
        const cells = tableLines[i].split("|").map((c) => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (cells.length < 2) continue;
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          if (cells[idx]) row[h] = cells[idx];
        });

        const id = row["id"] || row["restaurant_id"] || row["restaurant id"];
        const name = row["name"] || row["restaurant"] || row["restaurant name"];
        if (id && name) {
          const rawRating = parseFloat(row["rating"] || row["avg_rating"] || "");
          const rating = !isNaN(rawRating) && rawRating >= 0 && rawRating <= 5 ? rawRating : undefined;
          const locality = row["locality"] || row["location"] || row["area"] || undefined;
          const cuisineStr = row["cuisine"] || row["cuisines"];
          const cuisine = cuisineStr ? cuisineStr.split(",").map((c) => c.trim()).filter(Boolean) : undefined;
          const rawCost = parseInt((row["cost"] || row["cost for two"] || row["price"] || "").replace(/[^0-9]/g, ""), 10);
          const costForTwo = !isNaN(rawCost) && rawCost > 0 ? rawCost : undefined;
          results.push({
            id,
            restaurant_id: id,
            name,
            cuisine,
            avg_rating: rating,
            rating,
            locality,
            costForTwo,
            cost_for_two: costForTwo,
          });
        }
      }
      if (results.length > 0) {
        return results;
      }
    }
  }

  // 2. Group lines into blocks representing individual restaurant entries
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Skip preamble/header lines
    if (/^found\s+\d+\s+restaurant/i.test(line) || /^showing\s+\d+/i.test(line)) {
      continue;
    }

    const isNumbered = /^(?:#+\s*)?\d+[\.\)]\s+/.test(line);
    const isAttribute = /^(?:[\*\-\•]\s*)?(?:rating|avg\s*rating|score|locality|area|address|location|cuisine|cuisines|food|cost for two|price for two|cost|price|distance|status|open|offers|slots|id|restaurant\s*id|amenities|coordinates|lat|lng):/i.test(line);
    const isBullet = /^[-\*•]\s+/.test(line) && !isAttribute;
    const isNamedHeader = /^(?:restaurant|venue)\s*\d*:\s*/i.test(line);

    if ((isNumbered || isBullet || isNamedHeader) && !isAttribute) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock);
      }
      currentBlock = [line];
    } else {
      if (currentBlock.length > 0) {
        currentBlock.push(line);
      }
    }
  }
  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  for (const block of blocks) {
    const firstLine = block[0];
    const fullBlock = block.join(" ");

    // 1. Extract ID
    let id: string | undefined;
    const idMatch =
      fullBlock.match(/[\(\[]\s*(?:restaurant\s*)?id\s*[:#]?\s*([a-zA-Z0-9_-]+)\s*[\)\]]/i) ||
      fullBlock.match(/\b(?:restaurant\s*)?id\s*[:=]\s*([a-zA-Z0-9_-]+)/i) ||
      firstLine.match(/\bID\s*[:=]\s*([a-zA-Z0-9_-]+)/i);

    if (idMatch && idMatch[1]) {
      id = idMatch[1].trim();
    }

    // 2. Extract Name
    let nameClean = firstLine
      .replace(/^(?:#+\s*)?\d+[\.\)]\s*/, "")
      .replace(/^[-*•]\s*/, "")
      .replace(/^(?:restaurant|venue)\s*\d*:\s*/i, "")
      .trim();

    // Strip ID pattern from nameClean
    nameClean = nameClean.replace(/[\(\[]\s*(?:restaurant\s*)?id\s*[:#]?\s*[a-zA-Z0-9_-]+\s*[\)\]]/gi, "");
    nameClean = nameClean.replace(/\b(?:restaurant\s*)?id\s*[:=]\s*[a-zA-Z0-9_-]+/gi, "");

    // Strip trailing attributes if on the same line (e.g. " - Rating: 4.5 ...")
    nameClean = nameClean.replace(/\s*[-|–—]\s*(?:rating|locality|area|address|cuisine|cost|price|₹|rs\.?|distance|status).*$/i, "");
    nameClean = nameClean.replace(/[*_#`]/g, "").trim();

    // Guardrail: Skip malformed blocks without ID or valid name
    if (!id || !nameClean || nameClean.length < 2) {
      continue;
    }

    // 3. Parse attributes line by line
    let rating: number | undefined;
    let locality: string | undefined;
    let cuisines: string[] | undefined;
    let costForTwo: number | undefined;
    let distance: string | undefined;
    let isOpen: boolean | undefined;

    const attrLines: string[] = [];
    for (const rawLine of block) {
      const segments = rawLine.split(/\s+[-|–—]\s+/);
      attrLines.push(...segments);
    }

    for (const attrLine of attrLines) {
      const l = attrLine.trim();

      // Rating
      if (rating == null) {
        const ratingMatch =
          l.match(/(?:rating|avg\s*rating|score)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/i) ||
          l.match(/([0-9]+\.[0-9]+)\s*(?:★|stars|\/5|\/ 5)/i) ||
          l.match(/★\s*([0-9]+(?:\.[0-9]+)?)/i);
        if (ratingMatch && ratingMatch[1]) {
          const parsed = parseFloat(ratingMatch[1]);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 5) rating = parsed;
        }
      }

      // Locality / Area
      if (locality == null) {
        const locMatch = l.match(/^(?:[\*\-\•]\s*)?(?:locality|area|location|address)\s*[:=]?\s*([^,\n|–—\(\)]+)/i);
        if (locMatch && locMatch[1]) {
          const clean = locMatch[1].replace(/[*_`]/g, "").trim();
          if (clean && !/^(?:rating|cuisine|cost|price|distance|status)/i.test(clean)) {
            locality = clean;
          }
        }
      }

      // Cuisines
      if (cuisines == null) {
        const cuiMatch = l.match(/^(?:[\*\-\•]\s*)?(?:cuisines?|food)\s*[:=]?\s*([^|\n–—\(\)]+)/i);
        if (cuiMatch && cuiMatch[1]) {
          const rawCuisines = cuiMatch[1].replace(/[*_`]/g, "").trim();
          const parts = rawCuisines.split(/[,/]/).map((c) => c.trim()).filter((c) => c.length > 0 && !/^(?:cost|price|₹|rating|distance)/i.test(c));
          if (parts.length > 0) cuisines = parts;
        }
      }

      // Cost for two
      if (costForTwo == null) {
        const costMatch =
          l.match(/(?:cost\s*for\s*two|price\s*for\s*two|cost|price)\s*[:=]?\s*(?:₹|rs\.?|inr)?\s*([0-9]+)/i) ||
          l.match(/(?:₹|rs\.?)\s*([0-9]+)\s*(?:for\s*two|\/-\s*for\s*two)?/i);
        if (costMatch && costMatch[1]) {
          const parsed = parseInt(costMatch[1], 10);
          if (!isNaN(parsed) && parsed > 0) costForTwo = parsed;
        }
      }

      // Distance
      if (distance == null) {
        const distMatch = l.match(/(?:distance\s*[:=]?\s*)?([0-9]+(?:\.[0-9]+)?\s*km)/i);
        if (distMatch && distMatch[1]) distance = distMatch[1].trim();
      }

      // Status
      if (isOpen == null) {
        if (/\b(?:open\s*now|currently\s*open)\b/i.test(l)) {
          isOpen = true;
        } else if (/\b(?:closed\s*now|currently\s*closed)\b/i.test(l)) {
          isOpen = false;
        } else {
          const statusMatch = l.match(/(?:status|open\s*status)\s*[:=]?\s*(open|closed)/i);
          if (statusMatch && statusMatch[1]) {
            isOpen = statusMatch[1].toLowerCase() === "open";
          }
        }
      }
    }

    // 9. Preserve non-participating / booking warning in tags
    const tags: string[] = [];
    if (/non-participating|not\s*participating|no\s*table\s*booking|call\s*to\s*reserve/i.test(fullBlock)) {
      tags.push("non-participating");
    }

    results.push({
      id,
      restaurant_id: id,
      name: nameClean,
      cuisine: cuisines,
      avg_rating: rating,
      rating,
      costForTwo,
      cost_for_two: costForTwo,
      locality,
      distance,
      isOpen,
      tags: tags.length > 0 ? tags : undefined,
    });
  }

  return results;
}

/**
 * Extracts raw Dineout restaurants from an unwrapped MCP response.
 * Handles:
 * 1. Structured responses: structuredContent envelopes, top-level arrays, cards, and items/restaurants arrays.
 * 2. Controlled text fallback: when structuredContent is empty ({}) or missing and response content contains prose text.
 */
export function extractDineoutRestaurantsFromMcp(
  data: unknown,
  rawEnvelope?: unknown
): RawSwiggyDineoutRestaurant[] {
  if (!data && !rawEnvelope) return [];

  let list: unknown[] = [];

  const sourceObj = (data && typeof data === "object") ? (data as Record<string, unknown>) : undefined;
  const envObj = (rawEnvelope && typeof rawEnvelope === "object") ? (rawEnvelope as Record<string, unknown>) : undefined;

  // 1. Structured data checks
  if (Array.isArray(data)) {
    list = data;
  } else if (sourceObj) {
    const structured = (sourceObj.structuredContent && typeof sourceObj.structuredContent === "object")
      ? (sourceObj.structuredContent as Record<string, unknown>)
      : (sourceObj.result && typeof sourceObj.result === "object" && (sourceObj.result as any).structuredContent && typeof (sourceObj.result as any).structuredContent === "object")
      ? ((sourceObj.result as any).structuredContent as Record<string, unknown>)
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
      if (Array.isArray(sourceObj.restaurants)) {
        list = sourceObj.restaurants;
      } else if (Array.isArray(sourceObj.dining_restaurants)) {
        list = sourceObj.dining_restaurants;
      } else if (Array.isArray(sourceObj.items)) {
        list = sourceObj.items;
      } else if (sourceObj.data && typeof sourceObj.data === "object") {
        const d = sourceObj.data as Record<string, unknown>;
        if (Array.isArray(d.restaurants)) list = d.restaurants;
        else if (Array.isArray(d.dining_restaurants)) list = d.dining_restaurants;
        else if (Array.isArray(d.items)) list = d.items;
      } else if (sourceObj.result && typeof sourceObj.result === "object") {
        const r = sourceObj.result as Record<string, unknown>;
        if (Array.isArray(r.restaurants)) list = r.restaurants;
        else if (Array.isArray(r.dining_restaurants)) list = r.dining_restaurants;
        else if (Array.isArray(r.items)) list = r.items;
      } else if (Array.isArray(sourceObj.cards)) {
        for (const card of sourceObj.cards as any[]) {
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

  // Also check rawEnvelope for structured data if list is still empty
  if (list.length === 0 && envObj) {
    const envStructured = (envObj.structuredContent && typeof envObj.structuredContent === "object")
      ? (envObj.structuredContent as Record<string, unknown>)
      : (envObj.result && typeof envObj.result === "object" && (envObj.result as any).structuredContent && typeof (envObj.result as any).structuredContent === "object")
      ? ((envObj.result as any).structuredContent as Record<string, unknown>)
      : undefined;

    if (envStructured) {
      if (Array.isArray(envStructured.restaurants)) list = envStructured.restaurants;
      else if (Array.isArray(envStructured.dining_restaurants)) list = envStructured.dining_restaurants;
      else if (Array.isArray(envStructured.items)) list = envStructured.items;
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

  if (results.length > 0) {
    return results;
  }

  // 2. Controlled fallback: Parse restaurant records from MCP content text
  let proseText = "";
  if (typeof data === "string") {
    proseText = data;
  } else if (sourceObj) {
    if (Array.isArray(sourceObj.content) && sourceObj.content.length > 0) {
      const first = sourceObj.content[0];
      if (first && typeof first === "object" && typeof (first as any).text === "string") {
        proseText = (first as any).text;
      }
    } else if (sourceObj.result && typeof sourceObj.result === "object") {
      const r = sourceObj.result as Record<string, unknown>;
      if (Array.isArray(r.content) && r.content.length > 0) {
        const first = r.content[0];
        if (first && typeof first === "object" && typeof (first as any).text === "string") {
          proseText = (first as any).text;
        }
      }
    } else if (typeof sourceObj.text === "string") {
      proseText = sourceObj.text;
    }
  }

  if (!proseText && envObj) {
    if (Array.isArray(envObj.content) && envObj.content.length > 0) {
      const first = envObj.content[0];
      if (first && typeof first === "object" && typeof (first as any).text === "string") {
        proseText = (first as any).text;
      }
    } else if (envObj.result && typeof envObj.result === "object") {
      const r = envObj.result as Record<string, unknown>;
      if (Array.isArray(r.content) && r.content.length > 0) {
        const first = r.content[0];
        if (first && typeof first === "object" && typeof (first as any).text === "string") {
          proseText = (first as any).text;
        }
      }
    } else if (typeof envObj.text === "string") {
      proseText = envObj.text;
    }
  }

  if (proseText) {
    return parseDineoutRestaurantsFromText(proseText);
  }

  return [];
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
