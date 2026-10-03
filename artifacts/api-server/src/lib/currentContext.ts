import {
  buildCurrentRequestContext,
  buildRecommendationInputContext,
  CurrentRequestContextSchema,
  RecommendationInputContextSchema,
  type RawCurrentRequestInput,
  type CurrentRequestContext,
  type RecommendationInputContext,
  type ProfileContext,
} from "@workspace/api-zod";

/**
 * Re-export current context builders, schemas, and types for backend services
 * and API route handlers.
 */
export {
  buildCurrentRequestContext,
  buildRecommendationInputContext,
  CurrentRequestContextSchema,
  RecommendationInputContextSchema,
  type RawCurrentRequestInput,
  type CurrentRequestContext,
  type RecommendationInputContext,
  type ProfileContext,
};
