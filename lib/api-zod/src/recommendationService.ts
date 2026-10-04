import { z } from "zod";
import {
  type ProfileContext,
  ProfileContextSchema,
  CurrentRequestContextSchema,
} from "./profileContext";
import {
  CandidateSafetyDataSchema,
  evaluateCandidateEligibility,
} from "./safetyEligibility";
import {
  CandidateMatchDataSchema,
} from "./goalPreferenceMatching";
import {
  buildCurrentRequestContext,
} from "./currentContext";
import {
  AvailabilityStatusSchema,
  RankedRecommendationCandidateSchema,
  ExcludedRecommendationCandidateSchema,
  evaluateAndRankCandidates,
} from "./recommendationRanking";

// ─── 1. Candidate Input Schema ────────────────────────────────────────────────

export const RecommendationCandidateItemSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  domain: z.enum(["food", "instamart", "dineout"]).optional(),
  safetyData: CandidateSafetyDataSchema,
  matchData: CandidateMatchDataSchema,
  availability: AvailabilityStatusSchema.optional(),
  price: z.number().positive().optional(),
  contextTags: z.array(z.string()).optional(),
  mealOccasions: z.array(z.string()).optional(),
  categoryTags: z.array(z.string()).optional(),
  matchableAttributes: z.record(z.string(), z.array(z.string())).optional(),
  sourceMetadata: z.record(z.string(), z.unknown()).optional(),
});

export type RecommendationCandidateItem = z.infer<typeof RecommendationCandidateItemSchema>;

// ─── 2. Request Contract ──────────────────────────────────────────────────────

export const RecommendationRequestSchema = z.object({
  domain: z.enum(["food", "instamart", "dineout"]),
  currentRequest: CurrentRequestContextSchema.optional(),
  candidates: z.array(RecommendationCandidateItemSchema),
  limit: z.number().int().positive().max(100).optional(),
});

export type RecommendationRequest = z.infer<typeof RecommendationRequestSchema>;

// ─── 3. Response Contract ─────────────────────────────────────────────────────

export const RecommendationMetadataSchema = z.object({
  totalCandidates: z.number(),
  rankedCount: z.number(),
  excludedCount: z.number(),
  returnedCount: z.number(),
});

export type RecommendationMetadata = z.infer<typeof RecommendationMetadataSchema>;

export const RecommendationResponseSchema = z.object({
  domain: z.enum(["food", "instamart", "dineout"]),
  recommendations: z.array(RankedRecommendationCandidateSchema),
  excludedCandidates: z.array(ExcludedRecommendationCandidateSchema),
  metadata: RecommendationMetadataSchema,
});

export type RecommendationResponse = z.infer<typeof RecommendationResponseSchema>;

// ─── 4. Shared Recommendation Service Orchestrator ────────────────────────────

/**
 * Pure deterministic shared recommendation orchestrator.
 *
 * Orchestration Order:
 * 1. Authenticated ProfileContext (loaded by server session, never overridden by client)
 * 2. CurrentRequestContext (normalized ephemeral context)
 * 3. Safety Eligibility (Part 2 hard safety constraints)
 * 4. Goal & Preference Matching (Part 3 signals)
 * 5. Deterministic Ranking Engine (Part 5 weighted ranking & tie-breaking)
 * 6. Result Limiting (applied strictly after ranking)
 *
 * Guarantees:
 * - Deterministic, stateless, and pure function.
 * - Does NOT mutate inputs.
 * - Ineligible candidates are never returned in recommendations.
 * - Excluded candidates are preserved in excludedCandidates for observability.
 * - Transparent signal breakdowns and reason codes are fully preserved.
 */
export function executeSharedRecommendation(
  profile: ProfileContext,
  request: RecommendationRequest
): RecommendationResponse {
  const validatedProfile = ProfileContextSchema.parse(profile);
  const validatedRequest = RecommendationRequestSchema.parse(request);

  const normalizedCurrentRequest = validatedRequest.currentRequest
    ? buildCurrentRequestContext(validatedRequest.currentRequest)
    : undefined;

  const pipelineResult = evaluateAndRankCandidates(
    validatedProfile,
    validatedRequest.candidates,
    normalizedCurrentRequest
  );

  const totalRanked = pipelineResult.rankedCandidates.length;
  const limit = validatedRequest.limit;
  const recommendations =
    typeof limit === "number" && limit > 0
      ? pipelineResult.rankedCandidates.slice(0, limit)
      : pipelineResult.rankedCandidates;

  return {
    domain: validatedRequest.domain,
    recommendations,
    excludedCandidates: pipelineResult.excludedCandidates,
    metadata: {
      totalCandidates: validatedRequest.candidates.length,
      rankedCount: totalRanked,
      excludedCount: pipelineResult.excludedCandidates.length,
      returnedCount: recommendations.length,
    },
  };
}

/**
 * Phase 3 Live Swiggy Discovery Orchestrator.
 *
 * New Phase 3 Philosophy:
 * - Phase 3 is Live Swiggy Discovery (address + search/filter + live Swiggy MCP).
 * - Does NOT use deterministic Profile Context scoring (no goalMatch, cuisineMatch,
 *   likedFoodMatch, dislikedFoodPenalty, dietaryAlignment, or artificial score totals).
 * - Preserves Swiggy-provided discovery ordering (rank: 1, 2, 3...).
 * - Validates candidate against hard safety constraints (allergies, hard dietary exclusions)
 *   without inventing or inferring wellness scores.
 * - Does NOT replace the engine with another arbitrary ranking formula.
 */
export function executeSwiggyDiscovery(
  profile: ProfileContext,
  request: RecommendationRequest
): RecommendationResponse {
  const validatedProfile = ProfileContextSchema.parse(profile);
  const validatedRequest = RecommendationRequestSchema.parse(request);

  const candidates = validatedRequest.candidates;
  const recommendations: any[] = [];
  const excludedCandidates: any[] = [];

  for (let idx = 0; idx < candidates.length; idx++) {
    const rawCandidate = candidates[idx];
    const safetyResult = evaluateCandidateEligibility(validatedProfile, rawCandidate.safetyData);

    // Hard Safety Gate: Ineligible candidates MUST NOT be displayed in live discovery
    if (safetyResult.status === "ineligible") {
      const exclusionCodes = safetyResult.reasons.map((r) => r.code);
      const explanation = safetyResult.reasons.length > 0
        ? `Excluded by safety rule: ${safetyResult.reasons.map((r) => r.message).join(" ")}`
        : "Excluded by hard safety constraint.";

      excludedCandidates.push({
        candidate: {
          id: rawCandidate.id,
          name: rawCandidate.name,
          domain: rawCandidate.domain,
          safetyResult,
          matchResult: {
            candidateId: rawCandidate.id,
            goalMatch: "unknown",
            cuisineMatch: "unknown",
            likedFoodMatch: "unknown",
            dislikedFoodMatch: "unknown",
            dietaryMatch: "unknown",
            signals: [],
          },
          availability: rawCandidate.availability,
          price: rawCandidate.price,
          contextTags: rawCandidate.contextTags,
          mealOccasions: rawCandidate.mealOccasions,
          categoryTags: rawCandidate.categoryTags,
          matchableAttributes: rawCandidate.matchableAttributes,
          sourceMetadata: (rawCandidate as any).sourceMetadata,
        },
        eligibility: "ineligible",
        exclusionReasonCodes: exclusionCodes,
        explanation,
      });
      continue;
    }

    // Live Swiggy discovery candidate:
    // Preserves Swiggy's returned ordering (rank: 1, 2, 3...)
    // Total score is neutral (0) - no artificial wellness scores or goalMatch claims
    recommendations.push({
      candidate: {
        id: rawCandidate.id,
        name: rawCandidate.name,
        domain: rawCandidate.domain,
        safetyResult,
        matchResult: {
          candidateId: rawCandidate.id,
          goalMatch: "unknown",
          cuisineMatch: "unknown",
          likedFoodMatch: "unknown",
          dislikedFoodMatch: "unknown",
          dietaryMatch: "unknown",
          signals: [],
        },
        availability: rawCandidate.availability,
        price: rawCandidate.price,
        contextTags: rawCandidate.contextTags,
        mealOccasions: rawCandidate.mealOccasions,
        categoryTags: rawCandidate.categoryTags,
        matchableAttributes: rawCandidate.matchableAttributes,
        sourceMetadata: (rawCandidate as any).sourceMetadata,
      },
      rank: recommendations.length + 1,
      totalScore: 0,
      eligibility: safetyResult.status,
      signalBreakdown: {
        goalScore: 0,
        cuisineScore: 0,
        likedFoodScore: 0,
        dislikedFoodScore: 0,
        dietaryScore: 0,
        contextScore: 0,
        availabilityScore: 0,
        budgetScore: 0,
      },
      reasonCodes: safetyResult.status === "eligible" ? ["SAFETY_ELIGIBLE"] : ["SAFETY_UNKNOWN"],
      explanation: rawCandidate.name || "Live Swiggy discovery result",
    });
  }

  const limit = validatedRequest.limit;
  const limitedRecommendations =
    typeof limit === "number" && limit > 0
      ? recommendations.slice(0, limit)
      : recommendations;

  return {
    domain: validatedRequest.domain,
    recommendations: limitedRecommendations,
    excludedCandidates,
    metadata: {
      totalCandidates: candidates.length,
      rankedCount: recommendations.length,
      excludedCount: excludedCandidates.length,
      returnedCount: limitedRecommendations.length,
    },
  };
}
