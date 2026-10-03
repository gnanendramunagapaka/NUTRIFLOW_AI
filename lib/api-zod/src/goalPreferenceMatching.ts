import { z } from "zod";
import { type ProfileContext } from "./profileContext";

// ─── 1. Candidate Match Data Contract ─────────────────────────────────────────

/**
 * Normalized domain-agnostic candidate matching data contract.
 * Used to evaluate how well an eligible candidate matches a user's goals and preferences.
 * Unknown or unavailable fields must remain undefined rather than assumed.
 */
export const CandidateMatchDataSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  goalSignals: z.array(z.string()).optional(),
  cuisineTags: z.array(z.string()).optional(),
  foodTags: z.array(z.string()).optional(),
  dietaryTags: z.array(z.string()).optional(),
  categoryTags: z.array(z.string()).optional(),
  matchableAttributes: z.record(z.string(), z.array(z.string())).optional(),
});

export type CandidateMatchData = z.infer<typeof CandidateMatchDataSchema>;

// ─── 2. Match Signals and Reasons ─────────────────────────────────────────────

export const MatchSignalSchema = z.enum(["positive", "neutral", "negative", "unknown"]);
export type MatchSignal = z.infer<typeof MatchSignalSchema>;

export const MatchReasonCodeSchema = z.enum([
  "GOAL_MATCH",
  "CUISINE_MATCH",
  "CUISINE_MISMATCH",
  "LIKED_FOOD_MATCH",
  "DISLIKED_FOOD_MATCH",
  "DIETARY_ALIGNMENT",
  "MATCH_DATA_UNAVAILABLE",
]);
export type MatchReasonCode = z.infer<typeof MatchReasonCodeSchema>;

export const MatchSignalTypeSchema = z.enum([
  "goal",
  "cuisine",
  "dietary",
  "liked_food",
  "disliked_food",
  "data_availability",
]);
export type MatchSignalType = z.infer<typeof MatchSignalTypeSchema>;

export const MatchReasonSchema = z.object({
  code: MatchReasonCodeSchema,
  type: MatchSignalTypeSchema,
  attribute: z.string(),
  message: z.string(),
});
export type MatchReason = z.infer<typeof MatchReasonSchema>;

export const MatchResultSchema = z.object({
  candidateId: z.string(),
  goalMatch: MatchSignalSchema,
  cuisineMatch: MatchSignalSchema,
  dietaryMatch: MatchSignalSchema,
  likedFoodMatch: MatchSignalSchema,
  dislikedFoodMatch: MatchSignalSchema,
  signals: z.array(MatchReasonSchema),
});
export type MatchResult = z.infer<typeof MatchResultSchema>;

// ─── 3. Matching Helpers ──────────────────────────────────────────────────────

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Checks for token-aware word or substring matches between a target string and a candidate list.
 */
function matchesWordOrSubstring(target: string, candidateList?: string[]): string | null {
  if (!candidateList || candidateList.length === 0) return null;
  const normalizedTarget = normalizeText(target);
  if (!normalizedTarget) return null;

  for (const item of candidateList) {
    const normalizedItem = normalizeText(item);
    if (!normalizedItem) continue;

    // Exact match
    if (normalizedItem === normalizedTarget) {
      return item;
    }

    // Substring with word boundaries
    const regex = new RegExp(`\\b${normalizedTarget}\\b`, "i");
    if (regex.test(normalizedItem)) {
      return item;
    }

    // Plural/singular normalization
    if (normalizedTarget.endsWith("s") && normalizedTarget.slice(0, -1) === normalizedItem) {
      return item;
    }
    if (normalizedItem.endsWith("s") && normalizedItem.slice(0, -1) === normalizedTarget) {
      return item;
    }
  }

  return null;
}

/**
 * Evaluates goal signals against the user's primary goal.
 * Uses explicit metadata token matching; never makes subjective nutritional assumptions.
 */
function evaluateGoalSignal(
  primaryGoal: string,
  candidateSignals?: string[]
): { signal: MatchSignal; reason?: MatchReason } {
  if (!candidateSignals || candidateSignals.length === 0) {
    return {
      signal: "unknown",
      reason: {
        code: "MATCH_DATA_UNAVAILABLE",
        type: "goal",
        attribute: primaryGoal,
        message: "Candidate lacks explicit goal signal metadata.",
      },
    };
  }

  const normGoal = normalizeText(primaryGoal);
  const goalTokens = normGoal.split(/[\s_-]+/).filter((t) => t.length > 2);

  for (const sig of candidateSignals) {
    const normSig = normalizeText(sig);
    if (!normSig) continue;

    // Direct substring or equality match
    if (normGoal.includes(normSig) || normSig.includes(normGoal)) {
      return {
        signal: "positive",
        reason: {
          code: "GOAL_MATCH",
          type: "goal",
          attribute: sig,
          message: `Candidate explicitly contains goal signal "${sig}" aligned with user goal "${primaryGoal}".`,
        },
      };
    }

    // Token match (e.g. "muscle" in "Build Muscle")
    for (const token of goalTokens) {
      if (normSig.includes(token) || token.includes(normSig)) {
        return {
          signal: "positive",
          reason: {
            code: "GOAL_MATCH",
            type: "goal",
            attribute: sig,
            message: `Candidate explicitly contains goal signal "${sig}" aligned with user goal "${primaryGoal}".`,
          },
        };
      }
    }
  }

  return { signal: "neutral" };
}

/**
 * Evaluates cuisine tags against user cuisine preferences.
 */
function evaluateCuisineSignal(
  userCuisines: string[],
  candidateCuisines?: string[]
): { signal: MatchSignal; reason?: MatchReason } {
  if (userCuisines.length === 0) {
    return { signal: "neutral" };
  }

  if (!candidateCuisines || candidateCuisines.length === 0) {
    return {
      signal: "unknown",
      reason: {
        code: "MATCH_DATA_UNAVAILABLE",
        type: "cuisine",
        attribute: "cuisineTags",
        message: "Candidate lacks cuisine metadata.",
      },
    };
  }

  for (const userCuisine of userCuisines) {
    const match = matchesWordOrSubstring(userCuisine, candidateCuisines);
    if (match) {
      return {
        signal: "positive",
        reason: {
          code: "CUISINE_MATCH",
          type: "cuisine",
          attribute: match,
          message: `Candidate cuisine "${match}" matches user's preferred cuisine.`,
        },
      };
    }
  }

  return {
    signal: "negative",
    reason: {
      code: "CUISINE_MISMATCH",
      type: "cuisine",
      attribute: candidateCuisines.join(", "),
      message: "Candidate cuisine does not match user's preferred cuisines.",
    },
  };
}

/**
 * Evaluates dietary alignment for eligible candidates when structured dietary tags are present.
 */
function evaluateDietarySignal(
  userPattern: string | null,
  candidateDietaryTags?: string[]
): { signal: MatchSignal; reason?: MatchReason } {
  if (!userPattern || normalizeText(userPattern) === "no specific preference") {
    return { signal: "neutral" };
  }

  if (!candidateDietaryTags || candidateDietaryTags.length === 0) {
    return {
      signal: "unknown",
      reason: {
        code: "MATCH_DATA_UNAVAILABLE",
        type: "dietary",
        attribute: "dietaryTags",
        message: "Candidate lacks explicit dietary tags.",
      },
    };
  }

  const normUserPattern = normalizeText(userPattern);

  const isAligned = candidateDietaryTags.some((tag) => {
    const normTag = normalizeText(tag);
    if (normUserPattern === "vegan") {
      return normTag === "vegan";
    }
    if (normUserPattern === "vegetarian") {
      return normTag === "vegetarian" || normTag === "vegan";
    }
    if (normUserPattern === "eggetarian") {
      return normTag === "eggetarian" || normTag === "vegetarian" || normTag === "vegan";
    }
    return normTag === normUserPattern;
  });

  if (isAligned) {
    return {
      signal: "positive",
      reason: {
        code: "DIETARY_ALIGNMENT",
        type: "dietary",
        attribute: userPattern,
        message: `Candidate explicitly confirms dietary alignment with "${userPattern}".`,
      },
    };
  }

  return { signal: "neutral" };
}

// ─── 4. Reusable Deterministic Match Evaluator ─────────────────────────────────

/**
 * Pure deterministic evaluator that compares an eligible candidate item's metadata
 * against a user's persistent ProfileContext (goals, cuisines, liked foods, disliked foods, dietary pattern).
 *
 * Rules:
 * - Deterministic, rule-based execution.
 * - NO LLM, NO AI calls, NO weights, NO scoring, NO ranking.
 * - Missing metadata produces "unknown" signal rather than false positive.
 * - Disliked foods produce a negative preference signal, NOT a safety violation.
 * - Pure function: does NOT mutate ProfileContext or candidate data.
 */
export function evaluateCandidateMatch(
  profile: ProfileContext,
  candidate: CandidateMatchData
): MatchResult {
  const signals: MatchReason[] = [];

  // 1. Primary Goal Matching
  const primaryGoal = profile.goals?.primaryGoal || "Stay Healthy";
  const goalResult = evaluateGoalSignal(primaryGoal, candidate.goalSignals);
  if (goalResult.reason) {
    signals.push(goalResult.reason);
  }

  // 2. Cuisine Preference Matching
  const userCuisines = profile.dietary?.cuisinePreferences || [];
  const cuisineResult = evaluateCuisineSignal(userCuisines, candidate.cuisineTags);
  if (cuisineResult.reason) {
    signals.push(cuisineResult.reason);
  }

  // 3. Dietary Alignment Signal
  const userPattern = profile.dietary?.dietaryPattern || null;
  const dietaryResult = evaluateDietarySignal(userPattern, candidate.dietaryTags);
  if (dietaryResult.reason) {
    signals.push(dietaryResult.reason);
  }

  // 4. Liked Foods Matching
  const userLikedFoods = profile.dietary?.likedFoods || [];
  let likedFoodMatch: MatchSignal = "neutral";
  if (userLikedFoods.length > 0) {
    if (!candidate.foodTags || candidate.foodTags.length === 0) {
      likedFoodMatch = "unknown";
    } else {
      for (const liked of userLikedFoods) {
        const match = matchesWordOrSubstring(liked, candidate.foodTags);
        if (match) {
          likedFoodMatch = "positive";
          signals.push({
            code: "LIKED_FOOD_MATCH",
            type: "liked_food",
            attribute: match,
            message: `Candidate explicitly contains liked food "${match}".`,
          });
        }
      }
    }
  }

  // 5. Disliked Foods Matching (Preference mismatch only, NEVER an allergy/safety violation)
  const userDislikedFoods = profile.dietary?.dislikedFoods || [];
  let dislikedFoodMatch: MatchSignal = "neutral";
  if (userDislikedFoods.length > 0 && candidate.foodTags && candidate.foodTags.length > 0) {
    for (const disliked of userDislikedFoods) {
      const match = matchesWordOrSubstring(disliked, candidate.foodTags);
      if (match) {
        dislikedFoodMatch = "negative";
        signals.push({
          code: "DISLIKED_FOOD_MATCH",
          type: "disliked_food",
          attribute: match,
          message: `Candidate explicitly contains disliked food "${match}".`,
        });
      }
    }
  }

  return {
    candidateId: candidate.id,
    goalMatch: goalResult.signal,
    cuisineMatch: cuisineResult.signal,
    dietaryMatch: dietaryResult.signal,
    likedFoodMatch,
    dislikedFoodMatch,
    signals,
  };
}
