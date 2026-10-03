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
      if (Array.isArray(structured.products)) {
        list = structured.products;
      } else if (Array.isArray(structured.items)) {
        list = structured.items;
      } else if (Array.isArray(structured.variations)) {
        list = structured.variations;
      }
    }

    if (list.length === 0) {
      if (Array.isArray(obj.products)) {
        list = obj.products;
      } else if (Array.isArray(obj.items)) {
        list = obj.items;
      } else if (obj.data && typeof obj.data === "object") {
        const d = obj.data as Record<string, unknown>;
        if (Array.isArray(d.products)) list = d.products;
        else if (Array.isArray(d.items)) list = d.items;
        else if (Array.isArray(d.variations)) list = d.variations;
      } else if (obj.result && typeof obj.result === "object") {
        const r = obj.result as Record<string, unknown>;
        if (Array.isArray(r.products)) list = r.products;
        else if (Array.isArray(r.items)) list = r.items;
        else if (Array.isArray(r.variations)) list = r.variations;
      } else if (Array.isArray(obj.cards)) {
        for (const card of obj.cards as any[]) {
          if (card && typeof card === "object") {
            if (Array.isArray(card.items)) list.push(...card.items);
            else if (Array.isArray(card.products)) list.push(...card.products);
            else if (card.card && typeof card.card === "object") {
              const inner = card.card;
              if (Array.isArray(inner.items)) list.push(...inner.items);
              else if (Array.isArray(inner.products)) list.push(...inner.products);
              else if (inner.gridElements?.infoWithStyle?.items && Array.isArray(inner.gridElements.infoWithStyle.items)) {
                list.push(...inner.gridElements.infoWithStyle.items);
              }
            }
          }
        }
      }
    }
  }

  const results: RawSwiggyInstamartProduct[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    // Check if item has product identifier
    if (
      it.id != null ||
      it.productId != null ||
      it.product_id != null ||
      it.spin != null ||
      it.spin_id != null ||
      it.variant_id != null
    ) {
      results.push(it as RawSwiggyInstamartProduct);
    }
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
