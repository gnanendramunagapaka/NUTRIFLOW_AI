import { z } from "zod";
import {
  type ProfileContext,
  type CurrentRequestContext,
} from "./profileContext";
import {
  type CandidateSafetyData,
  type EligibilityResult,
  type EligibilityStatus,
  EligibilityResultSchema,
  EligibilityStatusSchema,
  evaluateCandidateEligibility,
} from "./safetyEligibility";
import {
  type CandidateMatchData,
  type MatchResult,
  MatchResultSchema,
  evaluateCandidateMatch,
} from "./goalPreferenceMatching";

// ─── 1. Candidate Ranking Input Contract ──────────────────────────────────────

export const AvailabilityStatusSchema = z.enum(["available", "unavailable", "unknown"]);
export type AvailabilityStatus = z.infer<typeof AvailabilityStatusSchema>;

/**
 * Normalized domain-agnostic candidate ranking input.
 * Consumes the safety and preference matching results from Parts 2 & 3
 * along with explicit contextual signals.
 */
export const RankingCandidateInputSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  domain: z.enum(["food", "instamart", "dineout"]).optional(),
  safetyResult: EligibilityResultSchema,
  matchResult: MatchResultSchema,
  availability: AvailabilityStatusSchema.optional(),
  price: z.number().positive().optional(),
  contextTags: z.array(z.string()).optional(),
  mealOccasions: z.array(z.string()).optional(),
  categoryTags: z.array(z.string()).optional(),
  matchableAttributes: z.record(z.string(), z.array(z.string())).optional(),
});

export type RankingCandidateInput = z.infer<typeof RankingCandidateInputSchema>;

// ─── 2. Transparent Ranking Weights ───────────────────────────────────────────

/**
 * Centralized, named ranking weights.
 *
 * Rationale:
 * - goalMatch (20): Primary health/wellness goal is central to NutriFlow's value proposition.
 * - cuisinePreference (20): Preferred cuisine traditions drive core taste satisfaction.
 * - cuisineMismatchPenalty (-10): Moderate penalty for cuisines not matching user's declared preferences.
 * - likedFood (15): Specific ingredients/dishes explicitly liked by user provide strong positive signals.
 * - dislikedFoodPenalty (-20): Explicit user aversions penalize items without treating them as safety violations.
 * - dietaryAlignment (15): Confirmed dietary tags (e.g. vegan, vegetarian) reinforce dietary pattern adherence.
 * - contextMatch (15): Immediate real-time relevance (craving, meal occasion) drives in-the-moment utility.
 * - availability (10): Confirmed availability/in-stock status ensures actionable recommendations.
 * - unavailabilityPenalty (-10): Penalizes unavailable items so they do not outrank available candidates.
 * - budgetFit (5): Contextual budget compliance provides a gentle nudge towards affordable choices.
 * - budgetMismatchPenalty (-5): Mild penalty when explicit candidate price exceeds temporary budget.
 */
export const RANKING_WEIGHTS = {
  goalMatch: 20,
  cuisinePreference: 20,
  cuisineMismatchPenalty: -10,
  likedFood: 15,
  dislikedFoodPenalty: -20,
  dietaryAlignment: 15,
  contextMatch: 15,
  availability: 10,
  unavailabilityPenalty: -10,
  budgetFit: 5,
  budgetMismatchPenalty: -5,
} as const;

// ─── 3. Ranking Breakdown & Output Types ───────────────────────────────────────

export const SignalBreakdownSchema = z.object({
  goalScore: z.number(),
  cuisineScore: z.number(),
  likedFoodScore: z.number(),
  dislikedFoodScore: z.number(),
  dietaryScore: z.number(),
  contextScore: z.number(),
  availabilityScore: z.number(),
  budgetScore: z.number(),
});

export type SignalBreakdown = z.infer<typeof SignalBreakdownSchema>;

export const RankedRecommendationCandidateSchema = z.object({
  candidate: RankingCandidateInputSchema,
  rank: z.number().int().positive(),
  totalScore: z.number(),
  eligibility: EligibilityStatusSchema,
  signalBreakdown: SignalBreakdownSchema,
  reasonCodes: z.array(z.string()),
  explanation: z.string(),
});

export type RankedRecommendationCandidate = z.infer<typeof RankedRecommendationCandidateSchema>;

export const ExcludedRecommendationCandidateSchema = z.object({
  candidate: RankingCandidateInputSchema,
  eligibility: z.literal("ineligible"),
  exclusionReasonCodes: z.array(z.string()),
  explanation: z.string(),
});

export type ExcludedRecommendationCandidate = z.infer<typeof ExcludedRecommendationCandidateSchema>;

export const RecommendationRankingResultSchema = z.object({
  rankedCandidates: z.array(RankedRecommendationCandidateSchema),
  excludedCandidates: z.array(ExcludedRecommendationCandidateSchema),
});

export type RecommendationRankingResult = z.infer<typeof RecommendationRankingResultSchema>;

// ─── 4. Helper Matching Functions ─────────────────────────────────────────────

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Checks if candidate has an explicit match with current request craving or meal occasion.
 */
function evaluateContextMatch(
  candidate: RankingCandidateInput,
  currentRequest?: CurrentRequestContext
): boolean {
  if (!currentRequest) return false;

  let hasMatch = false;

  // 1. Craving match
  if (currentRequest.craving) {
    const normCraving = normalizeText(currentRequest.craving);
    const cravingTokens = normCraving.split(/[\s_-]+/).filter((t) => t.length > 2);

    const matchPool: string[] = [
      candidate.name || "",
      ...(candidate.contextTags || []),
      ...(candidate.categoryTags || []),
    ];

    for (const item of matchPool) {
      const normItem = normalizeText(item);
      if (!normItem) continue;

      if (normItem.includes(normCraving) || normCraving.includes(normItem)) {
        hasMatch = true;
        break;
      }

      for (const token of cravingTokens) {
        if (normItem.includes(token) || token.includes(normItem)) {
          hasMatch = true;
          break;
        }
      }
      if (hasMatch) break;
    }
  }

  // 2. Meal Occasion match
  if (!hasMatch && currentRequest.mealOccasion) {
    const normOccasion = normalizeText(currentRequest.mealOccasion);
    const occasionsPool = [
      ...(candidate.mealOccasions || []),
      ...(candidate.contextTags || []),
    ];

    for (const occ of occasionsPool) {
      if (normalizeText(occ) === normOccasion) {
        hasMatch = true;
        break;
      }
    }
  }

  return hasMatch;
}

// ─── 5. Deterministic Recommendation Ranking Engine ───────────────────────────

/**
 * Pure deterministic ranking engine.
 *
 * Rules:
 * - Hard Safety Gate: candidates with eligibility === "ineligible" are immediately excluded.
 * - Candidates with eligibility === "unknown" remain rankable, but retain eligibility: "unknown" and are never labeled safe.
 * - Score is computed strictly from transparent, named weights.
 * - Current context only contributes when explicit candidate data matches.
 * - Budget only contributes when temporary budget was explicitly supplied.
 * - Deterministic tie-breaking: totalScore DESC -> reasonCodes count DESC -> id ASC.
 * - Pure function: inputs are NOT mutated.
 */
export function rankRecommendationCandidates(
  candidates: RankingCandidateInput[],
  currentRequest?: CurrentRequestContext
): RecommendationRankingResult {
  const rankedCandidates: RankedRecommendationCandidate[] = [];
  const excludedCandidates: ExcludedRecommendationCandidate[] = [];

  for (const candidate of candidates) {
    const safetyStatus = candidate.safetyResult.status;

    // Hard Safety Gate: Ineligible candidates MUST NOT be ranked
    if (safetyStatus === "ineligible") {
      const exclusionCodes = candidate.safetyResult.reasons.map((r) => r.code);
      const explanation = candidate.safetyResult.reasons.length > 0
        ? `Excluded by safety rule: ${candidate.safetyResult.reasons.map((r) => r.message).join(" ")}`
        : "Excluded by hard safety constraint.";

      excludedCandidates.push({
        candidate,
        eligibility: "ineligible",
        exclusionReasonCodes: exclusionCodes,
        explanation,
      });
      continue;
    }

    // Rankable candidates (eligible or unknown)
    const reasonCodes: string[] = [];

    if (safetyStatus === "eligible") {
      reasonCodes.push("SAFETY_ELIGIBLE");
    } else {
      reasonCodes.push("SAFETY_UNKNOWN");
    }

    // A. Goal Match Signal
    let goalScore = 0;
    if (candidate.matchResult.goalMatch === "positive") {
      goalScore = RANKING_WEIGHTS.goalMatch;
      reasonCodes.push("GOAL_MATCH");
    }

    // B. Cuisine Preference Signal
    let cuisineScore = 0;
    if (candidate.matchResult.cuisineMatch === "positive") {
      cuisineScore = RANKING_WEIGHTS.cuisinePreference;
      reasonCodes.push("CUISINE_MATCH");
    } else if (candidate.matchResult.cuisineMatch === "negative") {
      cuisineScore = RANKING_WEIGHTS.cuisineMismatchPenalty;
      reasonCodes.push("CUISINE_MISMATCH");
    }

    // C. Liked Food Signal
    let likedFoodScore = 0;
    if (candidate.matchResult.likedFoodMatch === "positive") {
      likedFoodScore = RANKING_WEIGHTS.likedFood;
      reasonCodes.push("LIKED_FOOD_MATCH");
    }

    // D. Disliked Food Penalty
    let dislikedFoodScore = 0;
    if (candidate.matchResult.dislikedFoodMatch === "negative") {
      dislikedFoodScore = RANKING_WEIGHTS.dislikedFoodPenalty;
      reasonCodes.push("DISLIKED_FOOD_PENALTY");
    }

    // E. Dietary Alignment Signal
    let dietaryScore = 0;
    if (candidate.matchResult.dietaryMatch === "positive") {
      dietaryScore = RANKING_WEIGHTS.dietaryAlignment;
      reasonCodes.push("DIETARY_ALIGNMENT");
    }

    // F. Current Request Context Signal
    let contextScore = 0;
    const hasContextMatch = evaluateContextMatch(candidate, currentRequest);
    if (hasContextMatch) {
      contextScore = RANKING_WEIGHTS.contextMatch;
      reasonCodes.push("CONTEXT_MATCH");
    }

    // G. Availability Signal
    let availabilityScore = 0;
    if (candidate.availability === "available") {
      availabilityScore = RANKING_WEIGHTS.availability;
      reasonCodes.push("AVAILABLE");
    } else if (candidate.availability === "unavailable") {
      availabilityScore = RANKING_WEIGHTS.unavailabilityPenalty;
      reasonCodes.push("UNAVAILABLE");
    }

    // H. Contextual Budget Signal
    let budgetScore = 0;
    if (currentRequest?.temporaryBudget?.maxAmount != null && candidate.price != null) {
      if (candidate.price <= currentRequest.temporaryBudget.maxAmount) {
        budgetScore = RANKING_WEIGHTS.budgetFit;
        reasonCodes.push("BUDGET_FIT");
      } else {
        budgetScore = RANKING_WEIGHTS.budgetMismatchPenalty;
        reasonCodes.push("BUDGET_MISMATCH");
      }
    }

    const totalScore =
      goalScore +
      cuisineScore +
      likedFoodScore +
      dislikedFoodScore +
      dietaryScore +
      contextScore +
      availabilityScore +
      budgetScore;

    const signalBreakdown: SignalBreakdown = {
      goalScore,
      cuisineScore,
      likedFoodScore,
      dislikedFoodScore,
      dietaryScore,
      contextScore,
      availabilityScore,
      budgetScore,
    };

    const explanation = `Total score ${totalScore} based on: ${reasonCodes.join(", ")}.`;

    rankedCandidates.push({
      candidate,
      rank: 1, // Will be set after sorting
      totalScore,
      eligibility: safetyStatus,
      signalBreakdown,
      reasonCodes,
      explanation,
    });
  }

  // Deterministic Tie-Breaking Sort:
  // 1. totalScore DESC
  // 2. reasonCodes count DESC
  // 3. candidate.id ASC
  rankedCandidates.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    if (b.reasonCodes.length !== a.reasonCodes.length) {
      return b.reasonCodes.length - a.reasonCodes.length;
    }
    return a.candidate.id.localeCompare(b.candidate.id);
  });

  // Assign sequential 1-based ranks
  rankedCandidates.forEach((item, index) => {
    item.rank = index + 1;
  });

  return {
    rankedCandidates,
    excludedCandidates,
  };
}

// ─── 6. Pipeline Evaluator Helper ─────────────────────────────────────────────

export interface RawCandidatePipelineItem {
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

/**
 * End-to-end evaluation helper that integrates Parts 2, 3, and 5:
 * 1. Runs safety eligibility evaluator (Part 2)
 * 2. Runs goal & preference matcher (Part 3)
 * 3. Runs recommendation ranking engine (Part 5)
 */
export function evaluateAndRankCandidates(
  profile: ProfileContext,
  candidates: RawCandidatePipelineItem[],
  currentRequest?: CurrentRequestContext
): RecommendationRankingResult {
  const rankingInputs: RankingCandidateInput[] = candidates.map((item) => {
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

  return rankRecommendationCandidates(rankingInputs, currentRequest);
}
