import { type ProfileContext } from "./profileContext";
import { type CandidateSafetyData } from "./safetyEligibility";
import { type CandidateMatchData } from "./goalPreferenceMatching";
import {
  type AvailabilityStatus,
  type RankedRecommendationCandidate,
  type ExcludedRecommendationCandidate,
  rankRecommendationCandidates,
  type RankingCandidateInput,
} from "./recommendationRanking";
import { evaluateCandidateEligibility } from "./safetyEligibility";
import { evaluateCandidateMatch } from "./goalPreferenceMatching";
import { buildCurrentRequestContext, type CurrentRequestContext } from "./currentContext";

// ─── 1. Candidate Input Contract ──────────────────────────────────────────────

export interface RecommendationCandidateItem {
  id: string;
  name?: string;
  domain?: "food" | "instamart" | "dineout";
  safetyData: CandidateSafetyData;
  matchData: CandidateMatchData;
  availability?: AvailabilityStatus;
  price?: number;
  contextTags?: string[];
  mealOccasions?: string[];
  categoryTags?: string[];
  matchableAttributes?: Record<string, string[]>;
}

// ─── 2. Request and Response Contracts ────────────────────────────────────────

export interface RecommendationRequest {
  domain: "food" | "instamart" | "dineout";
  currentRequest?: CurrentRequestContext;
  candidates: RecommendationCandidateItem[];
  limit?: number;
}

export interface RecommendationMetadata {
  totalCandidates: number;
  rankedCount: number;
  excludedCount: number;
  returnedCount: number;
}

export interface RecommendationResponse {
  domain: "food" | "instamart" | "dineout";
  recommendations: RankedRecommendationCandidate[];
  excludedCandidates: ExcludedRecommendationCandidate[];
  metadata: RecommendationMetadata;
}

// ─── 3. Client Recommendation Orchestrator Helper ─────────────────────────────

export function executeSharedRecommendation(
  profile: ProfileContext,
  request: RecommendationRequest
): RecommendationResponse {
  const normalizedCurrentRequest = request.currentRequest
    ? buildCurrentRequestContext(request.currentRequest)
    : undefined;

  const rankingInputs: RankingCandidateInput[] = request.candidates.map((item) => {
    const safetyResult = evaluateCandidateEligibility(profile, item.safetyData);
    const matchResult = evaluateCandidateMatch(profile, item.matchData);

    return {
      id: item.id,
      name: item.name,
      domain: item.domain,
      safetyResult,
      matchResult,
      availability: item.availability,
      price: item.price,
      contextTags: item.contextTags,
      mealOccasions: item.mealOccasions,
      categoryTags: item.categoryTags,
      matchableAttributes: item.matchableAttributes,
    };
  });

  const pipelineResult = rankRecommendationCandidates(rankingInputs, normalizedCurrentRequest);

  const totalRanked = pipelineResult.rankedCandidates.length;
  const limit = request.limit;
  const recommendations =
    typeof limit === "number" && limit > 0
      ? pipelineResult.rankedCandidates.slice(0, limit)
      : pipelineResult.rankedCandidates;

  return {
    domain: request.domain,
    recommendations,
    excludedCandidates: pipelineResult.excludedCandidates,
    metadata: {
      totalCandidates: request.candidates.length,
      rankedCount: totalRanked,
      excludedCount: pipelineResult.excludedCandidates.length,
      returnedCount: recommendations.length,
    },
  };
}
