import { type EligibilityStatus } from "./safetyEligibility";
import { type MatchResult } from "./goalPreferenceMatching";
import { type CurrentRequestContext } from "./profileContext";

// ─── 1. Candidate Ranking Input Contract ──────────────────────────────────────

export type AvailabilityStatus = "available" | "unavailable" | "unknown";

export interface RankingCandidateInput {
  id: string;
  name?: string;
  domain?: "food" | "instamart" | "dineout";
  safetyResult: {
    candidateId: string;
    status: EligibilityStatus;
    reasons: Array<{
      code: string;
      type: string;
      constraint: string;
      message: string;
      severity: string;
    }>;
  };
  matchResult: MatchResult;
  availability?: AvailabilityStatus;
  price?: number;
  contextTags?: string[];
  mealOccasions?: string[];
  categoryTags?: string[];
  matchableAttributes?: Record<string, string[]>;
}

// ─── 2. Transparent Ranking Weights ───────────────────────────────────────────

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

export interface SignalBreakdown {
  goalScore: number;
  cuisineScore: number;
  likedFoodScore: number;
  dislikedFoodScore: number;
  dietaryScore: number;
  contextScore: number;
  availabilityScore: number;
  budgetScore: number;
}

export interface RankedRecommendationCandidate {
  candidate: RankingCandidateInput;
  rank: number;
  totalScore: number;
  eligibility: EligibilityStatus;
  signalBreakdown: SignalBreakdown;
  reasonCodes: string[];
  explanation: string;
}

export interface ExcludedRecommendationCandidate {
  candidate: RankingCandidateInput;
  eligibility: "ineligible";
  exclusionReasonCodes: string[];
  explanation: string;
}

export interface RecommendationRankingResult {
  rankedCandidates: RankedRecommendationCandidate[];
  excludedCandidates: ExcludedRecommendationCandidate[];
}

// ─── 4. Client Helpers ────────────────────────────────────────────────────────

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

function evaluateContextMatch(
  candidate: RankingCandidateInput,
  currentRequest?: CurrentRequestContext
): boolean {
  if (!currentRequest) return false;

  let hasMatch = false;

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

export function rankRecommendationCandidates(
  candidates: RankingCandidateInput[],
  currentRequest?: CurrentRequestContext
): RecommendationRankingResult {
  const rankedCandidates: RankedRecommendationCandidate[] = [];
  const excludedCandidates: ExcludedRecommendationCandidate[] = [];

  for (const candidate of candidates) {
    const safetyStatus = candidate.safetyResult.status;

    if (safetyStatus === "ineligible") {
      const exclusionCodes = candidate.safetyResult.reasons.map((r) => r.code);
      const explanation =
        candidate.safetyResult.reasons.length > 0
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

    const reasonCodes: string[] = [];

    if (safetyStatus === "eligible") {
      reasonCodes.push("SAFETY_ELIGIBLE");
    } else {
      reasonCodes.push("SAFETY_UNKNOWN");
    }

    // A. Goal Match
    let goalScore = 0;
    if (candidate.matchResult.goalMatch === "positive") {
      goalScore = RANKING_WEIGHTS.goalMatch;
      reasonCodes.push("GOAL_MATCH");
    }

    // B. Cuisine Preference
    let cuisineScore = 0;
    if (candidate.matchResult.cuisineMatch === "positive") {
      cuisineScore = RANKING_WEIGHTS.cuisinePreference;
      reasonCodes.push("CUISINE_MATCH");
    } else if (candidate.matchResult.cuisineMatch === "negative") {
      cuisineScore = RANKING_WEIGHTS.cuisineMismatchPenalty;
      reasonCodes.push("CUISINE_MISMATCH");
    }

    // C. Liked Food
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

    // E. Dietary Alignment
    let dietaryScore = 0;
    if (candidate.matchResult.dietaryMatch === "positive") {
      dietaryScore = RANKING_WEIGHTS.dietaryAlignment;
      reasonCodes.push("DIETARY_ALIGNMENT");
    }

    // F. Context Match
    let contextScore = 0;
    const hasContextMatch = evaluateContextMatch(candidate, currentRequest);
    if (hasContextMatch) {
      contextScore = RANKING_WEIGHTS.contextMatch;
      reasonCodes.push("CONTEXT_MATCH");
    }

    // G. Availability
    let availabilityScore = 0;
    if (candidate.availability === "available") {
      availabilityScore = RANKING_WEIGHTS.availability;
      reasonCodes.push("AVAILABLE");
    } else if (candidate.availability === "unavailable") {
      availabilityScore = RANKING_WEIGHTS.unavailabilityPenalty;
      reasonCodes.push("UNAVAILABLE");
    }

    // H. Contextual Budget
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
      rank: 1,
      totalScore,
      eligibility: safetyStatus,
      signalBreakdown,
      reasonCodes,
      explanation,
    });
  }

  // Deterministic Tie-Breaking
  rankedCandidates.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    if (b.reasonCodes.length !== a.reasonCodes.length) {
      return b.reasonCodes.length - a.reasonCodes.length;
    }
    return a.candidate.id.localeCompare(b.candidate.id);
  });

  rankedCandidates.forEach((item, index) => {
    item.rank = index + 1;
  });

  return {
    rankedCandidates,
    excludedCandidates,
  };
}
