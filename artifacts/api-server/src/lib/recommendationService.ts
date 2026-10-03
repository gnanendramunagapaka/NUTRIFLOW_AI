import {
  RecommendationCandidateItemSchema,
  RecommendationRequestSchema,
  RecommendationMetadataSchema,
  RecommendationResponseSchema,
  executeSharedRecommendation,
  FoodRecommendationRequestSchema,
  FoodRecommendationResponseSchema,
  SwiggyAddressSchema,
  type RecommendationCandidateItem,
  type RecommendationRequest,
  type RecommendationMetadata,
  type RecommendationResponse,
  type FoodRecommendationRequest,
  type FoodRecommendationResponse,
  type SwiggyAddress,
} from "@workspace/api-zod";
import { executeFoodRecommendation } from "./foodRecommendationService";

/**
 * Re-export recommendation service schemas, contracts, and orchestrators for backend routes
 * and future orchestration handlers.
 */
export {
  RecommendationCandidateItemSchema,
  RecommendationRequestSchema,
  RecommendationMetadataSchema,
  RecommendationResponseSchema,
  executeSharedRecommendation,
  FoodRecommendationRequestSchema,
  FoodRecommendationResponseSchema,
  SwiggyAddressSchema,
  executeFoodRecommendation,
  type RecommendationCandidateItem,
  type RecommendationRequest,
  type RecommendationMetadata,
  type RecommendationResponse,
  type FoodRecommendationRequest,
  type FoodRecommendationResponse,
  type SwiggyAddress,
};

