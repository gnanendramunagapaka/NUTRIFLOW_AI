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
    if (Array.isArray(obj.variations)) {
      for (const v of obj.variations) {
        if (v && typeof v === "object") {
          const varObj = v as Record<string, unknown>;
          rawList.push({
            name: obj.name ?? obj.display_name ?? obj.displayName ?? obj.title,
            display_name: obj.display_name ?? obj.displayName ?? obj.name ?? obj.title,
            brand: obj.brand ?? obj.brand_name ?? obj.brandName,
            category: obj.category ?? obj.category_name ?? obj.categoryName ?? obj.superCategory,
            images: obj.images ?? obj.image ?? obj.imageUrl ?? obj.image_url ?? obj.media,
            ...varObj,
          });
        }
      }
    }

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

    // If item has variations array, carefully preserve parent fields while merging variation fields
    if (Array.isArray(it.variations) && it.variations.length > 0) {
      const firstVar = it.variations[0];
      if (firstVar && typeof firstVar === "object") {
        const v = firstVar as Record<string, unknown>;
        it = {
          ...v,
          ...it,
          name: it.name ?? it.display_name ?? it.displayName ?? it.title ?? v.name ?? v.display_name ?? v.displayName ?? v.title,
          display_name: it.display_name ?? it.displayName ?? it.name ?? it.title ?? v.display_name ?? v.displayName ?? v.name ?? v.title,
          brand: it.brand ?? it.brand_name ?? it.brandName ?? v.brand ?? v.brand_name ?? v.brandName,
          images: it.images ?? it.image ?? it.imageUrl ?? it.image_url ?? it.media ?? v.images ?? v.image ?? v.imageUrl ?? v.image_url ?? v.media,
          price: it.price ?? v.price ?? v.store_price ?? v.storePrice ?? v.offer_price ?? v.offerPrice,
          mrp: it.mrp ?? it.mrpPrice ?? it.mrp_price ?? v.mrp ?? v.mrpPrice ?? v.mrp_price,
          spin_id: it.spin_id ?? it.spin ?? v.spin_id ?? v.spin ?? v.id ?? it.id,
          quantity: it.quantity ?? it.weight ?? it.unit ?? it.pack_size ?? it.packSize ?? v.quantity ?? v.weight ?? v.unit ?? v.pack_size ?? v.packSize,
          inStock: it.inStock ?? it.in_stock ?? v.inStock ?? v.in_stock ?? v.inventory,
          inventory: it.inventory ?? v.inventory,
          category: it.category ?? it.category_name ?? it.categoryName ?? v.category ?? v.category_name ?? v.categoryName,
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
