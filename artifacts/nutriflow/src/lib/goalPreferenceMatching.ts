import { ProfileContext } from "./profileContext";

// ─── 1. Candidate Match Data Contract ─────────────────────────────────────────

export interface CandidateMatchData {
  id: string;
  name?: string;
  goalSignals?: string[];
  cuisineTags?: string[];
  foodTags?: string[];
  dietaryTags?: string[];
  categoryTags?: string[];
  matchableAttributes?: Record<string, string[]>;
}

// ─── 2. Match Signals and Reasons ─────────────────────────────────────────────

export type MatchSignal = "positive" | "neutral" | "negative" | "unknown";

export type MatchReasonCode =
  | "GOAL_MATCH"
  | "CUISINE_MATCH"
  | "CUISINE_MISMATCH"
  | "LIKED_FOOD_MATCH"
  | "DISLIKED_FOOD_MATCH"
  | "DIETARY_ALIGNMENT"
  | "MATCH_DATA_UNAVAILABLE";

export type MatchSignalType =
  | "goal"
  | "cuisine"
  | "dietary"
  | "liked_food"
  | "disliked_food"
  | "data_availability";

export interface MatchReason {
  code: MatchReasonCode;
  type: MatchSignalType;
  attribute: string;
  message: string;
}

export interface MatchResult {
  candidateId: string;
  goalMatch: MatchSignal;
  cuisineMatch: MatchSignal;
  dietaryMatch: MatchSignal;
  likedFoodMatch: MatchSignal;
  dislikedFoodMatch: MatchSignal;
  signals: MatchReason[];
}

// ─── 3. Matching Helpers ──────────────────────────────────────────────────────

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

function matchesWordOrSubstring(target: string, candidateList?: string[]): string | null {
  if (!candidateList || candidateList.length === 0) return null;
  const normalizedTarget = normalizeText(target);
  if (!normalizedTarget) return null;

  for (const item of candidateList) {
    const normalizedItem = normalizeText(item);
    if (!normalizedItem) continue;

    if (normalizedItem === normalizedTarget) {
      return item;
    }

    const regex = new RegExp(`\\b${normalizedTarget}\\b`, "i");
    if (regex.test(normalizedItem)) {
      return item;
    }

    if (normalizedTarget.endsWith("s") && normalizedTarget.slice(0, -1) === normalizedItem) {
      return item;
    }
    if (normalizedItem.endsWith("s") && normalizedItem.slice(0, -1) === normalizedTarget) {
      return item;
    }
  }

  return null;
}

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
 * against a user's persistent ProfileContext on the client.
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

  // 5. Disliked Foods Matching
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
