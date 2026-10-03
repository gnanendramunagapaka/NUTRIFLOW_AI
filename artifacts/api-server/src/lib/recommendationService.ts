import {
  RecommendationCandidateItemSchema,
  RecommendationRequestSchema,
  RecommendationMetadataSchema,
  RecommendationResponseSchema,
  executeSharedRecommendation,
  type RecommendationCandidateItem,
  type RecommendationRequest,
  type RecommendationMetadata,
  type RecommendationResponse,
} from "@workspace/api-zod";

/**
 * Re-export recommendation service schemas, contracts, and orchestrator for backend routes
 * and future orchestration handlers.
 */
export {
  RecommendationCandidateItemSchema,
  RecommendationRequestSchema,
  RecommendationMetadataSchema,
  RecommendationResponseSchema,
  executeSharedRecommendation,
  type RecommendationCandidateItem,
  type RecommendationRequest,
  type RecommendationMetadata,
  type RecommendationResponse,
};
