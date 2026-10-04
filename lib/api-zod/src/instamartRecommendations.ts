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
  type RawSwiggyInstamartProduct,
  normalizeSwiggyInstamartProduct,
} from "./swiggyAdapters";
import {
  SwiggyAddressSchema,
  type SwiggyAddress,
  type AddressResolutionResult,
  extractSwiggyAddresses,
  resolveSwiggyAddress,
  extractSwiggyMcpContent,
} from "./foodRecommendations";

// ─── 1. Request & Response Contracts ──────────────────────────────────────────

export const InstamartRecommendationRequestSchema = z.object({
  query: z.string().optional(),
  addressId: z.string().optional(),
  currentRequest: CurrentRequestContextSchema.optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export type InstamartRecommendationRequest = z.infer<typeof InstamartRecommendationRequestSchema>;

export const InstamartRecommendationResponseSchema = RecommendationResponseSchema.extend({
  addressUsed: SwiggyAddressSchema.optional(),
  clarificationNeeded: z.boolean().optional(),
  availableAddresses: z.array(SwiggyAddressSchema).optional(),
});

export type InstamartRecommendationResponse = z.infer<typeof InstamartRecommendationResponseSchema>;

// ─── 2. MCP Response Extraction ───────────────────────────────────────────────

/**
 * Extracts raw Instamart products from an unwrapped MCP response.
 * Handles structuredContent envelopes, top-level arrays, cards, and items/products arrays.
 */
export function extractInstamartProductsFromMcp(data: unknown): RawSwiggyInstamartProduct[] {
  if (!data) return [];

  const rawList: unknown[] = [];

  const collectItems = (source: unknown) => {
    if (!source) return;
    if (Array.isArray(source)) {
      for (const el of source) {
        collectItems(el);
      }
      return;
    }
    if (typeof source !== "object") return;
    const obj = source as Record<string, unknown>;

    // Dig into structuredContent / result / data envelopes
    if (obj.structuredContent && typeof obj.structuredContent === "object") {
      collectItems(obj.structuredContent);
    }
    if (obj.result && typeof obj.result === "object") {
      collectItems(obj.result);
    }
    if (obj.data && typeof obj.data === "object") {
      collectItems(obj.data);
    }

    // Direct product / item arrays
    if (Array.isArray(obj.products)) rawList.push(...obj.products);
    if (Array.isArray(obj.items)) rawList.push(...obj.items);
    if (Array.isArray(obj.variations)) rawList.push(...obj.variations);

    // Cards / widgets arrays
    if (Array.isArray(obj.cards)) {
      for (const card of obj.cards as any[]) {
        if (card && typeof card === "object") {
          if (Array.isArray(card.items)) rawList.push(...card.items);
          if (Array.isArray(card.products)) rawList.push(...card.products);
          const innerCard = card.card?.card || card.card || card;
          if (Array.isArray(innerCard.items)) rawList.push(...innerCard.items);
          if (Array.isArray(innerCard.products)) rawList.push(...innerCard.products);
          if (Array.isArray(innerCard.gridElements?.infoWithStyle?.items)) {
            rawList.push(...innerCard.gridElements.infoWithStyle.items);
          }
        }
      }
    }
    if (Array.isArray(obj.widgets)) {
      for (const w of obj.widgets as any[]) {
        if (w && typeof w === "object") {
          if (Array.isArray(w.items)) rawList.push(...w.items);
          if (Array.isArray(w.products)) rawList.push(...w.products);
          if (w.data && typeof w.data === "object") {
            if (Array.isArray(w.data.items)) rawList.push(...w.data.items);
            if (Array.isArray(w.data.products)) rawList.push(...w.data.products);
          }
        }
      }
    }

    // Leaf product candidate check (if this object is itself a product)
    if (
      (obj.id != null || obj.productId != null || obj.product_id != null || obj.spin != null || obj.spin_id != null || obj.variant_id != null) &&
      (obj.name != null || obj.display_name != null || obj.price != null || obj.store_price != null || obj.mrp != null)
    ) {
      rawList.push(obj);
    }
  };

  collectItems(data);

  const results: RawSwiggyInstamartProduct[] = [];
  const seenIds = new Set<string>();

  for (const item of rawList) {
    if (!item || typeof item !== "object") continue;
    let it = item as Record<string, unknown>;

    // Unpack Swiggy card envelope if present: { card: { info: { ... } } } or { product: { ... } }
    if (it.card && typeof it.card === "object") {
      const cardObj = it.card as Record<string, unknown>;
      if (cardObj.info && typeof cardObj.info === "object") {
        it = cardObj.info as Record<string, unknown>;
      } else if (cardObj.card && typeof cardObj.card === "object") {
        it = cardObj.card as Record<string, unknown>;
      } else {
        it = cardObj;
      }
    } else if (it.product && typeof it.product === "object") {
      it = it.product as Record<string, unknown>;
    } else if (it.info && typeof it.info === "object") {
      it = it.info as Record<string, unknown>;
    }

    // If item has variations array and top-level misses price or spin, merge variation fields
    if (Array.isArray(it.variations) && it.variations.length > 0) {
      const firstVar = it.variations[0];
      if (firstVar && typeof firstVar === "object") {
        it = {
          ...firstVar,
          ...it,
          price: it.price ?? firstVar.price ?? firstVar.store_price,
          mrp: it.mrp ?? firstVar.mrp,
          spin_id: it.spin_id ?? it.spin ?? firstVar.spin_id ?? firstVar.spin ?? firstVar.id,
        };
      }
    }

    const rawId = it.id ?? it.productId ?? it.product_id ?? it.spin ?? it.spin_id ?? it.variant_id;
    if (rawId == null) continue;
    const idStr = String(rawId).trim();
    if (!idStr || seenIds.has(idStr)) continue;
    seenIds.add(idStr);

    results.push(it as RawSwiggyInstamartProduct);
  }

  return results;
}

// ─── 3. Batch Normalizer ──────────────────────────────────────────────────────

/**
 * Normalizes an array of raw Instamart products into canonical NormalizedSwiggyCandidate items.
 * Structurally invalid items are cleanly skipped to preserve pipeline resilience.
 */
export function normalizeInstamartProductsBatch(
  rawProducts: RawSwiggyInstamartProduct[]
): NormalizedSwiggyCandidate[] {
  const candidates: NormalizedSwiggyCandidate[] = [];

  for (const raw of rawProducts) {
    try {
      const normalized = normalizeSwiggyInstamartProduct(raw);
      candidates.push(normalized);
    } catch {
      // Skip structurally invalid individual items, maintain pipeline integrity
      continue;
    }
  }

  return candidates;
}

// Re-export shared address utilities for convenience
export {
  SwiggyAddressSchema,
  type SwiggyAddress,
  type AddressResolutionResult,
  extractSwiggyAddresses,
  resolveSwiggyAddress,
  extractSwiggyMcpContent,
};
