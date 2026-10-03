import {
  rankRecommendationCandidates,
  evaluateAndRankCandidates,
  RANKING_WEIGHTS,
  RankingCandidateInputSchema,
  RankedRecommendationCandidateSchema,
  ExcludedRecommendationCandidateSchema,
  RecommendationRankingResultSchema,
  AvailabilityStatusSchema,
  SignalBreakdownSchema,
  type RankingCandidateInput,
  type RankedRecommendationCandidate,
  type ExcludedRecommendationCandidate,
  type RecommendationRankingResult,
  type AvailabilityStatus,
  type SignalBreakdown,
  type RawCandidatePipelineItem,
} from "@workspace/api-zod";

/**
 * Re-export recommendation ranking engine, transparent weights, schemas, and types
 * for backend services and future recommendation orchestrators.
 */
export {
  rankRecommendationCandidates,
  evaluateAndRankCandidates,
  RANKING_WEIGHTS,
  RankingCandidateInputSchema,
  RankedRecommendationCandidateSchema,
  ExcludedRecommendationCandidateSchema,
  RecommendationRankingResultSchema,
  AvailabilityStatusSchema,
  SignalBreakdownSchema,
  type RankingCandidateInput,
  type RankedRecommendationCandidate,
  type ExcludedRecommendationCandidate,
  type RecommendationRankingResult,
  type AvailabilityStatus,
  type SignalBreakdown,
  type RawCandidatePipelineItem,
};
