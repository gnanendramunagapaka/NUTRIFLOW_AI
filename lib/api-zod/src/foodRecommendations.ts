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
  let defaultAddressId: string | undefined;
  let needsUserClarification = false;

  const obj = raw as Record<string, unknown>;

  // Check structuredContent envelope first (Swiggy MCP response pattern)
  const structured = (obj.structuredContent && typeof obj.structuredContent === "object")
    ? (obj.structuredContent as Record<string, unknown>)
    : (obj.result && typeof obj.result === "object" && (obj.result as any).structuredContent && typeof (obj.result as any).structuredContent === "object")
    ? ((obj.result as any).structuredContent as Record<string, unknown>)
    : undefined;

  if (structured) {
    if (Array.isArray(structured.addresses)) {
      candidateList = structured.addresses;
    }
    const res = structured.resolution as Record<string, unknown> | undefined;
    if (res) {
      if (typeof res.defaultAddressId === "string") {
        defaultAddressId = res.defaultAddressId.trim();
      }
      if (res.needsUserClarification === true) {
        needsUserClarification = true;
      }
    }
  }

  if (candidateList.length === 0) {
    if (Array.isArray(obj.addresses)) {
      candidateList = obj.addresses;
    } else if (obj.result && typeof obj.result === "object" && Array.isArray((obj.result as any).addresses)) {
      candidateList = (obj.result as any).addresses;
    } else if (obj.data && typeof obj.data === "object" && Array.isArray((obj.data as any).addresses)) {
      candidateList = (obj.data as any).addresses;
    } else if (Array.isArray(raw)) {
      candidateList = raw;
    } else if (obj.data && Array.isArray(obj.data)) {
      candidateList = obj.data;
    }
  }

  // Also check top-level or result resolution if not already determined
  if (!defaultAddressId) {
    const res = (obj.resolution || (obj.result as any)?.resolution) as Record<string, unknown> | undefined;
    if (res) {
      if (typeof res.defaultAddressId === "string") {
        defaultAddressId = res.defaultAddressId.trim();
      }
      if (res.needsUserClarification === true) {
        needsUserClarification = true;
      }
    }
  }

  const results: SwiggyAddress[] = [];
  for (const item of candidateList) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    const rawId = it.id ?? it.address_id ?? it._id;
    if (rawId == null) continue;

    const id = String(rawId).trim();
    if (!id) continue;

    const name = typeof it.name === "string" ? it.name.trim() : undefined;
    const address = typeof it.address === "string"
      ? it.address.trim()
      : typeof it.addressLine === "string"
      ? it.addressLine.trim()
      : typeof it.address_line === "string"
      ? it.address_line.trim()
      : typeof it.formatted_address === "string"
      ? it.formatted_address.trim()
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

    // Only inherit defaultAddressId from resolution envelope if user clarification is not flagged
    const isEnvelopeDefault =
      !needsUserClarification && defaultAddressId ? id === defaultAddressId : false;

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

function cleanString(val?: unknown): string | undefined {
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function tryParseJson(val: unknown): any {
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {}

  // Markdown code fence extraction: ```json ... ``` or ``` ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {}
  }

  // Substring JSON extraction: find outermost { ... }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {}
  }

  // Substring JSON extraction: find outermost [ ... ]
  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(trimmed.slice(firstBracket, lastBracket + 1));
    } catch {}
  }

  return null;
}

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

  // Check structuredContent
  const structured =
    resObj.structuredContent &&
    typeof resObj.structuredContent === "object" &&
    Object.keys(resObj.structuredContent).length > 0
      ? resObj.structuredContent
      : undefined;

  // Check content array for JSON
  let contentJson: any = undefined;
  if (Array.isArray(resObj.content) && resObj.content.length > 0) {
    for (const item of resObj.content) {
      if (item && typeof item === "object" && typeof (item as any).text === "string") {
        const parsed = tryParseJson((item as any).text);
        if (parsed) {
          contentJson = parsed;
          break;
        }
      }
    }
  }

  // If content JSON has cards or items, prefer it over an empty/metadata-only structuredContent
  if (contentJson && typeof contentJson === "object") {
    const hasItems =
      Array.isArray((contentJson as any).cards) ||
      Array.isArray((contentJson as any).items) ||
      Array.isArray((contentJson as any).menu) ||
      Array.isArray((contentJson as any).dishes) ||
      (contentJson as any).groupedCard;
    if (hasItems) {
      return contentJson;
    }
  }

  if (structured) {
    return structured;
  }

  if (contentJson) {
    return contentJson;
  }

  return resObj;
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
    const structured = (obj.structuredContent && typeof obj.structuredContent === "object")
      ? (obj.structuredContent as Record<string, unknown>)
      : (obj.result && typeof obj.result === "object" && (obj.result as any).structuredContent && typeof (obj.result as any).structuredContent === "object")
      ? ((obj.result as any).structuredContent as Record<string, unknown>)
      : undefined;

    if (structured && Array.isArray(structured.restaurants)) {
      list = structured.restaurants;
    } else if (Array.isArray(obj.restaurants)) {
      list = obj.restaurants;
    } else if (obj.data && typeof obj.data === "object" && Array.isArray((obj.data as any).restaurants)) {
      list = (obj.data as any).restaurants;
    } else if (obj.result && typeof obj.result === "object" && Array.isArray((obj.result as any).restaurants)) {
      list = (obj.result as any).restaurants;
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
 * Handles flat item arrays, categories, Swiggy regular card groups, carousel, and card.info envelopes.
 */
export function extractFoodMenuItemsFromMcp(data: unknown): RawSwiggyFoodMenuItem[] {
  if (!data) return [];

  const rawList: { item: Record<string, unknown>; categoryName?: string }[] = [];
  const visited = new Set<unknown>();

  function collectFrom(source: unknown, currentCategory?: string): void {
    if (!source || visited.has(source)) return;
    if (typeof source === "string") {
      const parsed = tryParseJson(source);
      if (parsed) collectFrom(parsed, currentCategory);
      return;
    }
    if (typeof source !== "object") return;
    visited.add(source);

    if (Array.isArray(source)) {
      for (const el of source) {
        collectFrom(el, currentCategory);
      }
      return;
    }

    const obj = source as Record<string, unknown>;

    // 1. Envelopes
    if (obj.structuredContent) collectFrom(obj.structuredContent, currentCategory);
    if (obj.result) collectFrom(obj.result, currentCategory);
    if (obj.data) collectFrom(obj.data, currentCategory);
    if (Array.isArray(obj.content)) {
      for (const c of obj.content) {
        if (c && typeof c === "object" && typeof (c as any).text === "string") {
          const parsed = tryParseJson((c as any).text);
          if (parsed) {
            collectFrom(parsed, currentCategory);
          }
        }
      }
    }

    // 2. Swiggy groupedCard & REGULAR card groups
    const groupedCard =
      obj.groupedCard ||
      (obj.card as any)?.card?.groupedCard ||
      (obj.card as any)?.groupedCard;
    if (groupedCard && typeof groupedCard === "object") {
      const cardGroupMap = (groupedCard as any).cardGroupMap;
      if (cardGroupMap && typeof cardGroupMap === "object") {
        const regular = cardGroupMap.REGULAR || cardGroupMap.regular;
        if (regular && Array.isArray((regular as any).cards)) {
          collectFrom((regular as any).cards, currentCategory);
        }
      }
    }
    if (obj.cardGroupMap && typeof obj.cardGroupMap === "object") {
      const regular = (obj.cardGroupMap as any).REGULAR || (obj.cardGroupMap as any).regular;
      if (regular && Array.isArray((regular as any).cards)) {
        collectFrom((regular as any).cards, currentCategory);
      }
    }

    // 3. Category cards in Swiggy REGULAR envelope
    const innerCard = (obj.card as any)?.card || obj.card || obj;
    const catTitle =
      cleanString(innerCard.title) ||
      cleanString(innerCard.name) ||
      cleanString(innerCard.categoryName) ||
      currentCategory;

    // 4. itemCards
    if (Array.isArray(innerCard.itemCards)) {
      for (const ic of innerCard.itemCards) {
        if (ic && typeof ic === "object") {
          rawList.push({ item: ic as Record<string, unknown>, categoryName: catTitle });
        }
      }
    }

    // 5. carousel (e.g. Top Picks, Recommended carousel)
    if (Array.isArray(innerCard.carousel)) {
      for (const carItem of innerCard.carousel) {
        if (carItem && typeof carItem === "object") {
          rawList.push({ item: carItem as Record<string, unknown>, categoryName: catTitle });
        }
      }
    }

    // 6. categories (nested categories)
    if (Array.isArray(innerCard.categories)) {
      for (const nestedCat of innerCard.categories) {
        if (nestedCat && typeof nestedCat === "object") {
          const nestedTitle = cleanString(nestedCat.title) || cleanString(nestedCat.name) || catTitle;
          collectFrom(nestedCat, nestedTitle);
        }
      }
    }

    // 7. Direct items / dishes / menu / menuItems / products arrays
    if (Array.isArray(obj.items)) {
      for (const it of obj.items) {
        if (it && typeof it === "object") {
          rawList.push({ item: it as Record<string, unknown>, categoryName: catTitle });
        }
      }
    }
    if (Array.isArray(obj.dishes)) {
      for (const it of obj.dishes) {
        if (it && typeof it === "object") {
          rawList.push({ item: it as Record<string, unknown>, categoryName: catTitle });
        }
      }
    }
    if (Array.isArray(obj.menuItems)) {
      for (const it of obj.menuItems) {
        if (it && typeof it === "object") {
          rawList.push({ item: it as Record<string, unknown>, categoryName: catTitle });
        }
      }
    }
    if (Array.isArray(obj.menu)) {
      for (const m of obj.menu) {
        collectFrom(m, catTitle);
      }
    }
    if (Array.isArray(obj.cards)) {
      for (const c of obj.cards) {
        collectFrom(c, catTitle);
      }
    }

    // 8. If candidate itself looks like a leaf item (has id/dishId/itemId and name/price)
    if (
      (obj.id != null || obj.item_id != null || obj.itemId != null || obj.dishId != null) &&
      (obj.name != null || obj.itemName != null || obj.item_name != null || obj.price != null || obj.defaultPrice != null)
    ) {
      rawList.push({ item: obj, categoryName: catTitle });
    }
  }

  collectFrom(data);

  const results: RawSwiggyFoodMenuItem[] = [];
  const seenIds = new Set<string>();

  for (const entry of rawList) {
    let it = entry.item;
    const catName = entry.categoryName;

    // Unpack card/dish envelope:
    // { card: { card: { info: { ... } } } }
    // { card: { info: { ... } } }
    // { dish: { info: { ... } } }
    // { dish: { ... } }
    // { info: { ... } }
    if (it.card && typeof it.card === "object") {
      const c = it.card as Record<string, unknown>;
      if (c.card && typeof c.card === "object") {
        const cc = c.card as Record<string, unknown>;
        it = (cc.info && typeof cc.info === "object" ? cc.info : cc) as Record<string, unknown>;
      } else if (c.info && typeof c.info === "object") {
        it = c.info as Record<string, unknown>;
      } else {
        it = c;
      }
    } else if (it.dish && typeof it.dish === "object") {
      const d = it.dish as Record<string, unknown>;
      it = (d.info && typeof d.info === "object" ? d.info : d) as Record<string, unknown>;
    } else if (it.info && typeof it.info === "object") {
      it = it.info as Record<string, unknown>;
    }

    const rawId = it.id ?? it.item_id ?? it.itemId ?? it.dishId ?? it.dish_id;
    if (rawId == null) continue;
    const idStr = String(rawId).trim();
    if (!idStr || seenIds.has(idStr)) continue;
    seenIds.add(idStr);

    const finalItem: RawSwiggyFoodMenuItem = {
      ...it,
      category: cleanString(it.category as string) || cleanString(it.categoryName as string) || catName,
    };

    results.push(finalItem);
  }

  // Fallback: If no structured items found, inspect text content for line items
  if (results.length === 0 && data && typeof data === "object") {
    const textSources: string[] = [];
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.content)) {
      for (const c of obj.content) {
        if (c && typeof (c as any).text === "string") textSources.push((c as any).text);
      }
    } else if (typeof obj.text === "string") {
      textSources.push(obj.text);
    }

    let lineIdx = 1;
    for (const text of textSources) {
      const lines = text.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        const match = trimmed.match(
          /^(?:(?:\d+\.|\*|\-)\s+)?([A-Za-z0-9\s&',.\-]+?)(?:\s*(?:[-–—:]|\()\s*(?:₹|Rs\.?\s*)?(\d+(?:\.\d+)?)\)?)?$/i
        );
        if (match) {
          const rawName = match[1].trim();
          if (
            rawName.length > 2 &&
            !rawName.toLowerCase().startsWith("menu for") &&
            !rawName.toLowerCase().startsWith("categories") &&
            !rawName.toLowerCase().startsWith("found ") &&
            !rawName.toLowerCase().includes("restaurant")
          ) {
            const rawPrice = match[2] ? Number(match[2]) : undefined;
            const itemId = `text_item_${lineIdx++}`;
            if (!seenIds.has(itemId)) {
              seenIds.add(itemId);
              results.push({
                id: itemId,
                name: rawName,
                price: rawPrice,
              });
            }
          }
        }
      }
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
