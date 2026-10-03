import {
  normalizeSwiggyFoodRestaurant,
  normalizeSwiggyFoodMenuItem,
  normalizeSwiggyInstamartProduct,
  normalizeSwiggyDineoutRestaurant,
  SwiggySourceMetadataSchema,
  NormalizedSwiggyCandidateSchema,
  type SwiggySourceMetadata,
  type NormalizedSwiggyCandidate,
  type RawSwiggyFoodRestaurant,
  type RawSwiggyFoodMenuItem,
  type RawSwiggyInstamartProduct,
  type RawSwiggyDineoutRestaurant,
} from "@workspace/api-zod";

/**
 * Re-export Swiggy adapter normalizers, schemas, and types for backend services,
 * upcoming Phase 3 domain MCP flows, and recommendation pipelines.
 */
export {
  normalizeSwiggyFoodRestaurant,
  normalizeSwiggyFoodMenuItem,
  normalizeSwiggyInstamartProduct,
  normalizeSwiggyDineoutRestaurant,
  SwiggySourceMetadataSchema,
  NormalizedSwiggyCandidateSchema,
  type SwiggySourceMetadata,
  type NormalizedSwiggyCandidate,
  type RawSwiggyFoodRestaurant,
  type RawSwiggyFoodMenuItem,
  type RawSwiggyInstamartProduct,
  type RawSwiggyDineoutRestaurant,
};
