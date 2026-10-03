import { register } from "node:module";
import { pathToFileURL } from "node:url";

const hookCode = `
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const parentURL = context.parentURL;
    if (parentURL && parentURL.startsWith('file:')) {
      const parentDir = path.dirname(fileURLToPath(parentURL));
      const target = path.resolve(parentDir, specifier);
      if (fs.existsSync(target) && fs.statSync(target).isFile()) {
        return nextResolve(specifier, context);
      }
      if (fs.existsSync(target + '.ts')) {
        return nextResolve(pathToFileURL(target + '.ts').href, context);
      }
    }
  }
  return nextResolve(specifier, context);
}
`;

register(`data:text/javascript,${encodeURIComponent(hookCode)}`, pathToFileURL(import.meta.filename).href);

const {
  rankRecommendationCandidates,
  evaluateAndRankCandidates,
  RANKING_WEIGHTS,
} = await import("../lib/api-zod/src/recommendationRanking.ts");
const { buildProfileContextFromProfile } = await import("../lib/api-zod/src/profileContext.ts");
const { buildCurrentRequestContext } = await import("../lib/api-zod/src/currentContext.ts");

import type { RankingCandidateInput } from "../lib/api-zod/src/recommendationRanking.ts";
import type { ProfileContext } from "../lib/api-zod/src/profileContext.ts";
import type { CurrentRequestContext } from "../lib/api-zod/src/currentContext.ts";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log("=== Running NutriFlow Phase 2 Part 5 Recommendation Ranking Tests ===\n");

function createBaseProfile(): ProfileContext {
  return buildProfileContextFromProfile({
    id: "user-part5-test",
    name: "Part 5 User",
    age: 27,
    weight: 70,
    height: 175,
    goal: "Build Muscle",
    dietaryPreferences: ["South Indian", "Vegetarian"],
    allergies: ["Peanuts"],
  });
}

function createNeutralMatchResult(candidateId: string) {
  return {
    candidateId,
    goalMatch: "neutral" as const,
    cuisineMatch: "neutral" as const,
    dietaryMatch: "neutral" as const,
    likedFoodMatch: "neutral" as const,
    dislikedFoodMatch: "neutral" as const,
    signals: [],
  };
}

function createEligibleSafetyResult(candidateId: string) {
  return {
    candidateId,
    status: "eligible" as const,
    reasons: [],
  };
}

function createIneligibleSafetyResult(candidateId: string) {
  return {
    candidateId,
    status: "ineligible" as const,
    reasons: [
      {
        code: "ALLERGEN_MATCH" as const,
        type: "allergy" as const,
        constraint: "Peanuts",
        message: "Explicitly contains peanuts.",
        severity: "ineligible" as const,
      },
    ],
  };
}

function createUnknownSafetyResult(candidateId: string) {
  return {
    candidateId,
    status: "unknown" as const,
    reasons: [
      {
        code: "INSUFFICIENT_SAFETY_DATA" as const,
        type: "allergy" as const,
        constraint: "Peanuts",
        message: "Missing allergen data.",
        severity: "unknown" as const,
      },
    ],
  };
}

// ─── Test 1: Eligible candidate can be ranked ───
console.log("Test 1: Eligible candidate can be ranked");
const cand1: RankingCandidateInput = {
  id: "cand-1",
  name: "Vegetable Idli",
  safetyResult: createEligibleSafetyResult("cand-1"),
  matchResult: createNeutralMatchResult("cand-1"),
};
const res1 = rankRecommendationCandidates([cand1]);
assert(res1.rankedCandidates.length === 1, "Cand 1 is in ranked candidates");
assert(res1.excludedCandidates.length === 0, "Cand 1 is not excluded");
assert(res1.rankedCandidates[0].rank === 1, "Rank is 1");
assert(res1.rankedCandidates[0].reasonCodes.includes("SAFETY_ELIGIBLE"), "Has SAFETY_ELIGIBLE reason code");
console.log("  ✓ Test 1 passed.\n");

// ─── Test 2: Ineligible candidate is excluded ───
console.log("Test 2: Ineligible candidate is excluded");
const cand2: RankingCandidateInput = {
  id: "cand-2",
  name: "Peanut Chutney",
  safetyResult: createIneligibleSafetyResult("cand-2"),
  matchResult: createNeutralMatchResult("cand-2"),
};
const res2 = rankRecommendationCandidates([cand2]);
assert(res2.rankedCandidates.length === 0, "Ineligible candidate not in rankedCandidates");
assert(res2.excludedCandidates.length === 1, "Ineligible candidate is in excludedCandidates");
assert(res2.excludedCandidates[0].eligibility === "ineligible", "Excluded eligibility is ineligible");
assert(res2.excludedCandidates[0].exclusionReasonCodes.includes("ALLERGEN_MATCH"), "Has ALLERGEN_MATCH code");
console.log("  ✓ Test 2 passed.\n");

// ─── Test 3: Unknown safety is not treated as safe ───
console.log("Test 3: Unknown safety is not treated as safe");
const cand3: RankingCandidateInput = {
  id: "cand-3",
  name: "Mystery Soup",
  safetyResult: createUnknownSafetyResult("cand-3"),
  matchResult: createNeutralMatchResult("cand-3"),
};
const res3 = rankRecommendationCandidates([cand3]);
assert(res3.rankedCandidates.length === 1, "Unknown safety enters ranking pool");
assert(res3.rankedCandidates[0].eligibility === "unknown", "Preserves eligibility as unknown");
assert(!res3.rankedCandidates[0].reasonCodes.includes("SAFETY_ELIGIBLE"), "Does NOT receive SAFETY_ELIGIBLE");
assert(res3.rankedCandidates[0].reasonCodes.includes("SAFETY_UNKNOWN"), "Receives SAFETY_UNKNOWN code");
console.log("  ✓ Test 3 passed.\n");

// ─── Test 4: Goal positive signal improves ranking ───
console.log("Test 4: Goal positive signal improves ranking");
const candGoalPos: RankingCandidateInput = {
  id: "cand-goal-pos",
  name: "Protein Bowl",
  safetyResult: createEligibleSafetyResult("cand-goal-pos"),
  matchResult: { ...createNeutralMatchResult("cand-goal-pos"), goalMatch: "positive" },
};
const candGoalNeutral: RankingCandidateInput = {
  id: "cand-goal-neu",
  name: "Plain Rice",
  safetyResult: createEligibleSafetyResult("cand-goal-neu"),
  matchResult: { ...createNeutralMatchResult("cand-goal-neu"), goalMatch: "neutral" },
};
const res4 = rankRecommendationCandidates([candGoalNeutral, candGoalPos]);
assert(res4.rankedCandidates[0].candidate.id === "cand-goal-pos", "Goal match candidate ranks first");
assert(res4.rankedCandidates[0].signalBreakdown.goalScore === RANKING_WEIGHTS.goalMatch, "Goal score applied");
console.log("  ✓ Test 4 passed.\n");

// ─── Test 5: Cuisine positive signal improves ranking ───
console.log("Test 5: Cuisine positive signal improves ranking");
const candCuisinePos: RankingCandidateInput = {
  id: "cand-c-pos",
  name: "Dosa",
  safetyResult: createEligibleSafetyResult("cand-c-pos"),
  matchResult: { ...createNeutralMatchResult("cand-c-pos"), cuisineMatch: "positive" },
};
const candCuisineNeg: RankingCandidateInput = {
  id: "cand-c-neg",
  name: "Burrito",
  safetyResult: createEligibleSafetyResult("cand-c-neg"),
  matchResult: { ...createNeutralMatchResult("cand-c-neg"), cuisineMatch: "negative" },
};
const res5 = rankRecommendationCandidates([candCuisineNeg, candCuisinePos]);
assert(res5.rankedCandidates[0].candidate.id === "cand-c-pos", "Cuisine positive ranks first");
assert(res5.rankedCandidates[1].candidate.id === "cand-c-neg", "Cuisine negative ranks second");
assert(res5.rankedCandidates[1].signalBreakdown.cuisineScore === RANKING_WEIGHTS.cuisineMismatchPenalty, "Cuisine mismatch penalty applied");
console.log("  ✓ Test 5 passed.\n");

// ─── Test 6: Liked food improves ranking ───
console.log("Test 6: Liked food improves ranking");
const candLiked: RankingCandidateInput = {
  id: "cand-liked",
  name: "Paneer Tikka",
  safetyResult: createEligibleSafetyResult("cand-liked"),
  matchResult: { ...createNeutralMatchResult("cand-liked"), likedFoodMatch: "positive" },
};
const candNeutral6: RankingCandidateInput = {
  id: "cand-neu-6",
  name: "Steamed Corn",
  safetyResult: createEligibleSafetyResult("cand-neu-6"),
  matchResult: createNeutralMatchResult("cand-neu-6"),
};
const res6 = rankRecommendationCandidates([candNeutral6, candLiked]);
assert(res6.rankedCandidates[0].candidate.id === "cand-liked", "Liked food candidate ranks first");
assert(res6.rankedCandidates[0].signalBreakdown.likedFoodScore === RANKING_WEIGHTS.likedFood, "Liked food score applied");
console.log("  ✓ Test 6 passed.\n");

// ─── Test 7: Disliked food receives penalty ───
console.log("Test 7: Disliked food receives penalty");
const candDisliked: RankingCandidateInput = {
  id: "cand-disliked",
  name: "Mushroom Pasta",
  safetyResult: createEligibleSafetyResult("cand-disliked"),
  matchResult: { ...createNeutralMatchResult("cand-disliked"), dislikedFoodMatch: "negative" },
};
const candNeutral7: RankingCandidateInput = {
  id: "cand-neu-7",
  name: "Tomato Pasta",
  safetyResult: createEligibleSafetyResult("cand-neu-7"),
  matchResult: createNeutralMatchResult("cand-neu-7"),
};
const res7 = rankRecommendationCandidates([candDisliked, candNeutral7]);
assert(res7.rankedCandidates[0].candidate.id === "cand-neu-7", "Neutral item outranks disliked item");
assert(res7.rankedCandidates[1].signalBreakdown.dislikedFoodScore === RANKING_WEIGHTS.dislikedFoodPenalty, "Disliked penalty applied");
assert(res7.rankedCandidates[1].eligibility === "eligible", "Disliked item is penalized, NOT marked ineligible");
console.log("  ✓ Test 7 passed.\n");

// ─── Test 8: Dietary alignment improves ranking ───
console.log("Test 8: Dietary alignment improves ranking");
const candDietAligned: RankingCandidateInput = {
  id: "cand-diet-pos",
  name: "Vegan Tofu Scramble",
  safetyResult: createEligibleSafetyResult("cand-diet-pos"),
  matchResult: { ...createNeutralMatchResult("cand-diet-pos"), dietaryMatch: "positive" },
};
const candDietNeutral: RankingCandidateInput = {
  id: "cand-diet-neu",
  name: "Salad",
  safetyResult: createEligibleSafetyResult("cand-diet-neu"),
  matchResult: createNeutralMatchResult("cand-diet-neu"),
};
const res8 = rankRecommendationCandidates([candDietNeutral, candDietAligned]);
assert(res8.rankedCandidates[0].candidate.id === "cand-diet-pos", "Dietary aligned item ranks first");
assert(res8.rankedCandidates[0].signalBreakdown.dietaryScore === RANKING_WEIGHTS.dietaryAlignment, "Dietary alignment score applied");
console.log("  ✓ Test 8 passed.\n");

// ─── Test 9: Missing match data does not create a false positive ───
console.log("Test 9: Missing match data does not create a false positive");
const candMissingData: RankingCandidateInput = {
  id: "cand-missing",
  name: "Item X",
  safetyResult: createEligibleSafetyResult("cand-missing"),
  matchResult: {
    candidateId: "cand-missing",
    goalMatch: "unknown",
    cuisineMatch: "unknown",
    dietaryMatch: "unknown",
    likedFoodMatch: "unknown",
    dislikedFoodMatch: "neutral",
    signals: [],
  },
};
const res9 = rankRecommendationCandidates([candMissingData]);
assert(res9.rankedCandidates[0].signalBreakdown.goalScore === 0, "Unknown goal gives 0");
assert(res9.rankedCandidates[0].signalBreakdown.cuisineScore === 0, "Unknown cuisine gives 0");
assert(res9.rankedCandidates[0].signalBreakdown.dietaryScore === 0, "Unknown dietary gives 0");
assert(res9.rankedCandidates[0].signalBreakdown.likedFoodScore === 0, "Unknown likedFood gives 0");
assert(res9.rankedCandidates[0].totalScore === 0, "Total score is 0 without matches");
console.log("  ✓ Test 9 passed.\n");

// ─── Test 10: Current context match affects ranking ───
console.log("Test 10: Current context match affects ranking");
const currentReq10 = buildCurrentRequestContext({
  craving: "biryani",
  mealOccasion: "dinner",
});
const candContextMatch: RankingCandidateInput = {
  id: "cand-ctx-pos",
  name: "Veg Hyderabadi Dum Biryani",
  contextTags: ["biryani", "rice", "dinner"],
  mealOccasions: ["dinner"],
  safetyResult: createEligibleSafetyResult("cand-ctx-pos"),
  matchResult: createNeutralMatchResult("cand-ctx-pos"),
};
const candContextNoMatch: RankingCandidateInput = {
  id: "cand-ctx-none",
  name: "Sandwich",
  contextTags: ["snack"],
  mealOccasions: ["morning_snack"],
  safetyResult: createEligibleSafetyResult("cand-ctx-none"),
  matchResult: createNeutralMatchResult("cand-ctx-none"),
};
const res10 = rankRecommendationCandidates([candContextNoMatch, candContextMatch], currentReq10);
assert(res10.rankedCandidates[0].candidate.id === "cand-ctx-pos", "Context matching candidate ranks first");
assert(res10.rankedCandidates[0].signalBreakdown.contextScore === RANKING_WEIGHTS.contextMatch, "Context score applied");
assert(res10.rankedCandidates[0].reasonCodes.includes("CONTEXT_MATCH"), "Has CONTEXT_MATCH reason code");
console.log("  ✓ Test 10 passed.\n");

// ─── Test 11: Missing current context does not create a false match ───
console.log("Test 11: Missing current context does not create a false match");
const res11 = rankRecommendationCandidates([candContextMatch], undefined);
assert(res11.rankedCandidates[0].signalBreakdown.contextScore === 0, "Context score is 0 when no request context");
assert(!res11.rankedCandidates[0].reasonCodes.includes("CONTEXT_MATCH"), "No false CONTEXT_MATCH");
console.log("  ✓ Test 11 passed.\n");

// ─── Test 12: Temporary budget affects ranking only when supplied ───
console.log("Test 12: Temporary budget affects ranking only when supplied");
const budgetReq = buildCurrentRequestContext({
  temporaryBudget: { maxAmount: 250 },
});
const candCheap: RankingCandidateInput = {
  id: "cand-cheap",
  name: "Thali",
  price: 200,
  safetyResult: createEligibleSafetyResult("cand-cheap"),
  matchResult: createNeutralMatchResult("cand-cheap"),
};
const candExpensive: RankingCandidateInput = {
  id: "cand-exp",
  name: "Premium Platter",
  price: 450,
  safetyResult: createEligibleSafetyResult("cand-exp"),
  matchResult: createNeutralMatchResult("cand-exp"),
};
const res12 = rankRecommendationCandidates([candExpensive, candCheap], budgetReq);
assert(res12.rankedCandidates[0].candidate.id === "cand-cheap", "Cheap candidate ranks first within budget");
assert(res12.rankedCandidates[0].signalBreakdown.budgetScore === RANKING_WEIGHTS.budgetFit, "Budget fit applied");
assert(res12.rankedCandidates[1].signalBreakdown.budgetScore === RANKING_WEIGHTS.budgetMismatchPenalty, "Budget mismatch penalty applied");

// Without budget in request
const res12NoBudget = rankRecommendationCandidates([candExpensive, candCheap], undefined);
assert(res12NoBudget.rankedCandidates[0].signalBreakdown.budgetScore === 0, "Budget score 0 without request budget");
assert(res12NoBudget.rankedCandidates[1].signalBreakdown.budgetScore === 0, "Budget score 0 without request budget");
console.log("  ✓ Test 12 passed.\n");

// ─── Test 13: Missing candidate price does not create a budget assumption ───
console.log("Test 13: Missing candidate price does not create a budget assumption");
const candNoPrice: RankingCandidateInput = {
  id: "cand-no-price",
  name: "Unpriced Dish",
  safetyResult: createEligibleSafetyResult("cand-no-price"),
  matchResult: createNeutralMatchResult("cand-no-price"),
};
const res13 = rankRecommendationCandidates([candNoPrice], budgetReq);
assert(res13.rankedCandidates[0].signalBreakdown.budgetScore === 0, "Missing price yields 0 budget score");
assert(!res13.rankedCandidates[0].reasonCodes.includes("BUDGET_FIT"), "No false BUDGET_FIT");
console.log("  ✓ Test 13 passed.\n");

// ─── Test 14: Explicit unavailable candidate is not recommended as available ───
console.log("Test 14: Explicit unavailable candidate is not recommended as available");
const candUnavailable: RankingCandidateInput = {
  id: "cand-unavail",
  name: "Sold Out Bowl",
  availability: "unavailable",
  safetyResult: createEligibleSafetyResult("cand-unavail"),
  matchResult: createNeutralMatchResult("cand-unavail"),
};
const candAvailable: RankingCandidateInput = {
  id: "cand-avail",
  name: "In Stock Bowl",
  availability: "available",
  safetyResult: createEligibleSafetyResult("cand-avail"),
  matchResult: createNeutralMatchResult("cand-avail"),
};
const res14 = rankRecommendationCandidates([candUnavailable, candAvailable]);
assert(res14.rankedCandidates[0].candidate.id === "cand-avail", "Available candidate ranks first");
assert(res14.rankedCandidates[1].candidate.id === "cand-unavail", "Unavailable candidate ranks second");
assert(res14.rankedCandidates[1].reasonCodes.includes("UNAVAILABLE"), "Has UNAVAILABLE reason code");
assert(!res14.rankedCandidates[1].reasonCodes.includes("AVAILABLE"), "Does NOT have AVAILABLE reason code");
assert(res14.rankedCandidates[1].signalBreakdown.availabilityScore === RANKING_WEIGHTS.unavailabilityPenalty, "Penalized for unavailability");
console.log("  ✓ Test 14 passed.\n");

// ─── Test 15: Unknown availability does not become available ───
console.log("Test 15: Unknown availability does not become available");
const candUnknownAvail: RankingCandidateInput = {
  id: "cand-unk-avail",
  name: "Unknown Stock Item",
  availability: "unknown",
  safetyResult: createEligibleSafetyResult("cand-unk-avail"),
  matchResult: createNeutralMatchResult("cand-unk-avail"),
};
const res15 = rankRecommendationCandidates([candUnknownAvail]);
assert(res15.rankedCandidates[0].signalBreakdown.availabilityScore === 0, "Unknown availability score is 0");
assert(!res15.rankedCandidates[0].reasonCodes.includes("AVAILABLE"), "Unknown does NOT get AVAILABLE code");
console.log("  ✓ Test 15 passed.\n");

// ─── Test 16: Deterministic tie-breaking ───
console.log("Test 16: Deterministic tie-breaking");
// Candidates with identical score, tie-breaking by ID
const candTieB: RankingCandidateInput = {
  id: "item-b",
  name: "Item B",
  safetyResult: createEligibleSafetyResult("item-b"),
  matchResult: createNeutralMatchResult("item-b"),
};
const candTieA: RankingCandidateInput = {
  id: "item-a",
  name: "Item A",
  safetyResult: createEligibleSafetyResult("item-a"),
  matchResult: createNeutralMatchResult("item-a"),
};
const res16 = rankRecommendationCandidates([candTieB, candTieA]);
assert(res16.rankedCandidates[0].candidate.id === "item-a", "Item A precedes Item B on tie-break");
assert(res16.rankedCandidates[1].candidate.id === "item-b", "Item B follows Item A on tie-break");
console.log("  ✓ Test 16 passed.\n");

// ─── Test 17: Same inputs produce exactly the same ranking ───
console.log("Test 17: Same inputs produce exactly the same ranking");
const pool = [candTieB, candAvailable, candTieA, candGoalPos, candDisliked];
const run1 = rankRecommendationCandidates(pool);
const run2 = rankRecommendationCandidates(pool);
assert(JSON.stringify(run1) === JSON.stringify(run2), "Successive ranking runs produce identical JSON output");
console.log("  ✓ Test 17 passed.\n");

// ─── Test 18: Input objects are not mutated ───
console.log("Test 18: Input objects are not mutated");
const cand18: RankingCandidateInput = {
  id: "cand-18",
  name: "Immutable Test Item",
  safetyResult: createEligibleSafetyResult("cand-18"),
  matchResult: createNeutralMatchResult("cand-18"),
};
const snapshotCand = JSON.stringify(cand18);
rankRecommendationCandidates([cand18], budgetReq);
assert(JSON.stringify(cand18) === snapshotCand, "Input candidate was not mutated");
console.log("  ✓ Test 18 passed.\n");

// ─── Test 19: Food candidate works ───
console.log("Test 19: Food candidate works");
const foodCand: RankingCandidateInput = {
  id: "food-101",
  name: "South Indian Thali",
  domain: "food",
  mealOccasions: ["lunch"],
  contextTags: ["south indian", "thali"],
  safetyResult: createEligibleSafetyResult("food-101"),
  matchResult: { ...createNeutralMatchResult("food-101"), cuisineMatch: "positive" },
};
const res19 = rankRecommendationCandidates([foodCand]);
assert(res19.rankedCandidates[0].candidate.domain === "food", "Food domain preserved");
assert(res19.rankedCandidates[0].rank === 1, "Ranked successfully");
console.log("  ✓ Test 19 passed.\n");

// ─── Test 20: Instamart candidate works ───
console.log("Test 20: Instamart candidate works");
const instaCand: RankingCandidateInput = {
  id: "insta-201",
  name: "Organic Oats 1kg",
  domain: "instamart",
  categoryTags: ["groceries", "breakfast"],
  safetyResult: createEligibleSafetyResult("insta-201"),
  matchResult: { ...createNeutralMatchResult("insta-201"), goalMatch: "positive" },
};
const res20 = rankRecommendationCandidates([instaCand]);
assert(res20.rankedCandidates[0].candidate.domain === "instamart", "Instamart domain preserved");
assert(res20.rankedCandidates[0].rank === 1, "Ranked successfully");
console.log("  ✓ Test 20 passed.\n");

// ─── Test 21: Dineout candidate works ───
console.log("Test 21: Dineout candidate works");
const dineCand: RankingCandidateInput = {
  id: "dine-301",
  name: "Mavalli Tiffin Room",
  domain: "dineout",
  contextTags: ["south indian", "traditional"],
  safetyResult: createEligibleSafetyResult("dine-301"),
  matchResult: { ...createNeutralMatchResult("dine-301"), cuisineMatch: "positive" },
};
const res21 = rankRecommendationCandidates([dineCand]);
assert(res21.rankedCandidates[0].candidate.domain === "dineout", "Dineout domain preserved");
assert(res21.rankedCandidates[0].rank === 1, "Ranked successfully");
console.log("  ✓ Test 21 passed.\n");

// ─── Test 22: Dineout does not receive fabricated nutrition signals ───
console.log("Test 22: Dineout does not receive fabricated nutrition signals");
assert(!("calories" in (res21.rankedCandidates[0] as any)), "No calories field in ranked item");
assert(!("protein" in (res21.rankedCandidates[0] as any)), "No protein field in ranked item");
assert(!("healthScore" in (res21.rankedCandidates[0] as any)), "No healthScore field in ranked item");
console.log("  ✓ Test 22 passed.\n");

// ─── Test 23: Ranking does not create medical/health scoring ───
console.log("Test 23: Ranking does not create medical/health scoring");
for (const ranked of run1.rankedCandidates) {
  assert(!("bmi" in (ranked as any)), "No BMI field");
  assert(!("tdee" in (ranked as any)), "No TDEE field");
  assert(!("medicalSuitability" in (ranked as any)), "No medical suitability field");
  assert(!("clinicalSafety" in (ranked as any)), "No clinical safety field");
}
console.log("  ✓ Test 23 passed.\n");

// ─── Test 24: Ranking does not modify SafetyEligibilityResult ───
console.log("Test 24: Ranking does not modify SafetyEligibilityResult");
const safetyBefore = JSON.stringify(cand1.safetyResult);
rankRecommendationCandidates([cand1]);
assert(JSON.stringify(cand1.safetyResult) === safetyBefore, "SafetyResult untouched");
console.log("  ✓ Test 24 passed.\n");

// ─── Test 25: Ranking does not modify MatchResult ───
console.log("Test 25: Ranking does not modify MatchResult");
const matchBefore = JSON.stringify(cand1.matchResult);
rankRecommendationCandidates([cand1]);
assert(JSON.stringify(cand1.matchResult) === matchBefore, "MatchResult untouched");
console.log("  ✓ Test 25 passed.\n");

// ─── End-to-end Pipeline Verification with evaluateAndRankCandidates ───
console.log("Test 26: End-to-end Pipeline Verification (evaluateAndRankCandidates)");
const profile = createBaseProfile();
const pipelineRes = evaluateAndRankCandidates(
  profile,
  [
    {
      id: "pipe-1",
      name: "Sambar Vada",
      domain: "food",
      safetyData: {
        id: "pipe-1",
        dietaryClassification: { vegetarian: true },
        allergens: [],
        ingredients: ["lentils", "spices"],
      },
      matchData: {
        id: "pipe-1",
        cuisineTags: ["South Indian"],
        goalSignals: ["muscle"],
      },
      availability: "available",
      price: 120,
    },
    {
      id: "pipe-2",
      name: "Peanut Bar",
      domain: "food",
      safetyData: {
        id: "pipe-2",
        allergens: ["Peanuts"],
      },
      matchData: {
        id: "pipe-2",
      },
    },
  ],
  buildCurrentRequestContext({ temporaryBudget: { maxAmount: 150 } })
);
assert(pipelineRes.rankedCandidates.length === 1, "Only eligible candidate is ranked");
assert(pipelineRes.rankedCandidates[0].candidate.id === "pipe-1", "Pipe 1 is ranked");
assert(pipelineRes.excludedCandidates.length === 1, "Peanut bar is excluded");
assert(pipelineRes.excludedCandidates[0].candidate.id === "pipe-2", "Pipe 2 excluded due to allergy");
console.log("  ✓ Test 26 passed: End-to-end pipeline operates deterministically.\n");

console.log("🎉 ALL 26 RECOMMENDATION RANKING TESTS PASSED WITH 100% SUCCESS!");
