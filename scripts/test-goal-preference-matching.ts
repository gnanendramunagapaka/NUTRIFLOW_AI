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

const { evaluateCandidateMatch } = await import("../lib/api-zod/src/goalPreferenceMatching.ts");
const { evaluateCandidateEligibility } = await import("../lib/api-zod/src/safetyEligibility.ts");
const { buildProfileContextFromProfile } = await import("../lib/api-zod/src/profileContext.ts");

import type { CandidateMatchData, MatchResult } from "../lib/api-zod/src/goalPreferenceMatching.ts";
import type { CandidateSafetyData } from "../lib/api-zod/src/safetyEligibility.ts";
import type { ProfileContext } from "../lib/api-zod/src/profileContext.ts";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log("=== Running NutriFlow Phase 2 Part 3 Goal & Preference Matching Tests ===\n");

function createTestProfile(overrides: Partial<Parameters<typeof buildProfileContextFromProfile>[0]> = {}): ProfileContext {
  return buildProfileContextFromProfile({
    id: "test-user-match",
    name: "Match Test User",
    age: 29,
    weight: 72,
    height: 178,
    goal: "Build Muscle",
    dietaryPreferences: ["South Indian", "Pan-Asian", "Vegetarian"],
    allergies: ["None"],
    ...overrides,
  });
}

// ─── Test 1: User goal matches explicit candidate goal signal → positive goal signal ───
console.log("Test 1: User goal matches explicit candidate goal signal");
const muscleProfile = createTestProfile({ goal: "Build Muscle" });
const proteinCandidate: CandidateMatchData = {
  id: "meal-goal-1",
  name: "High Protein Sprouted Moong Bowl",
  goalSignals: ["muscle", "high-protein"],
};
const res1 = evaluateCandidateMatch(muscleProfile, proteinCandidate);
assert(res1.goalMatch === "positive", `Expected positive goalMatch, got ${res1.goalMatch}`);
assert(res1.signals.some((s) => s.code === "GOAL_MATCH" && s.type === "goal"), "Expected GOAL_MATCH signal");
console.log("  ✓ Test 1 passed.\n");

// ─── Test 2: User goal has no candidate goal metadata → goal signal unknown ───
console.log("Test 2: User goal has no candidate goal metadata");
const noGoalCandidate: CandidateMatchData = {
  id: "meal-goal-2",
  name: "Generic Steamed Rice",
  // goalSignals is undefined
};
const res2 = evaluateCandidateMatch(muscleProfile, noGoalCandidate);
assert(res2.goalMatch === "unknown", `Expected unknown goalMatch, got ${res2.goalMatch}`);
assert(res2.signals.some((s) => s.code === "MATCH_DATA_UNAVAILABLE" && s.type === "goal"), "Expected MATCH_DATA_UNAVAILABLE for goal");
console.log("  ✓ Test 2 passed.\n");

// ─── Test 3: Candidate cuisine matches preferred cuisine → positive cuisine signal ───
console.log("Test 3: Candidate cuisine matches preferred cuisine");
const cuisineProfile = createTestProfile({ dietaryPreferences: ["South Indian", "Pan-Asian"] });
const southIndianCandidate: CandidateMatchData = {
  id: "meal-cuisine-1",
  name: "Rava Dosa with Sambar",
  cuisineTags: ["South Indian", "Traditional"],
};
const res3 = evaluateCandidateMatch(cuisineProfile, southIndianCandidate);
assert(res3.cuisineMatch === "positive", `Expected positive cuisineMatch, got ${res3.cuisineMatch}`);
assert(res3.signals.some((s) => s.code === "CUISINE_MATCH" && s.attribute === "South Indian"), "Expected CUISINE_MATCH signal for South Indian");
console.log("  ✓ Test 3 passed.\n");

// ─── Test 4: Candidate cuisine does not match preferred cuisine → mismatch signal ───
console.log("Test 4: Candidate cuisine does not match preferred cuisine");
const mexicanCandidate: CandidateMatchData = {
  id: "meal-cuisine-2",
  name: "Bean Burrito",
  cuisineTags: ["Mexican"],
};
const res4 = evaluateCandidateMatch(cuisineProfile, mexicanCandidate);
assert(res4.cuisineMatch === "negative", `Expected negative cuisineMatch, got ${res4.cuisineMatch}`);
assert(res4.signals.some((s) => s.code === "CUISINE_MISMATCH"), "Expected CUISINE_MISMATCH signal");
console.log("  ✓ Test 4 passed.\n");

// ─── Test 5: Candidate has no cuisine metadata → unknown cuisine signal ───
console.log("Test 5: Candidate has no cuisine metadata");
const noCuisineCandidate: CandidateMatchData = {
  id: "meal-cuisine-3",
  name: "Chef Special Plate",
};
const res5 = evaluateCandidateMatch(cuisineProfile, noCuisineCandidate);
assert(res5.cuisineMatch === "unknown", `Expected unknown cuisineMatch, got ${res5.cuisineMatch}`);
assert(res5.signals.some((s) => s.code === "MATCH_DATA_UNAVAILABLE" && s.type === "cuisine"), "Expected MATCH_DATA_UNAVAILABLE for cuisine");
console.log("  ✓ Test 5 passed.\n");

// ─── Test 6: User has liked food and candidate explicitly contains it → positive liked-food signal ───
console.log("Test 6: User has liked food and candidate explicitly contains it");
const likedProfile = createTestProfile();
likedProfile.dietary.likedFoods = ["paneer", "tofu"];
const paneerCandidate: CandidateMatchData = {
  id: "meal-liked-1",
  name: "Grilled Paneer Tikka",
  foodTags: ["paneer", "capsicum", "onion"],
};
const res6 = evaluateCandidateMatch(likedProfile, paneerCandidate);
assert(res6.likedFoodMatch === "positive", `Expected positive likedFoodMatch, got ${res6.likedFoodMatch}`);
assert(res6.signals.some((s) => s.code === "LIKED_FOOD_MATCH" && s.attribute === "paneer"), "Expected LIKED_FOOD_MATCH signal");
console.log("  ✓ Test 6 passed.\n");

// ─── Test 7: User has disliked food and candidate explicitly contains it → negative disliked-food signal ───
console.log("Test 7: User has disliked food and candidate explicitly contains it");
const dislikedProfile = createTestProfile();
dislikedProfile.dietary.dislikedFoods = ["mushroom"];
const mushroomMatchCandidate: CandidateMatchData = {
  id: "meal-disliked-1",
  name: "Creamy Mushroom Pasta",
  foodTags: ["mushroom", "pasta", "parmesan"],
};
const res7 = evaluateCandidateMatch(dislikedProfile, mushroomMatchCandidate);
assert(res7.dislikedFoodMatch === "negative", `Expected negative dislikedFoodMatch, got ${res7.dislikedFoodMatch}`);
assert(res7.signals.some((s) => s.code === "DISLIKED_FOOD_MATCH" && s.attribute === "mushroom"), "Expected DISLIKED_FOOD_MATCH signal");
console.log("  ✓ Test 7 passed.\n");

// ─── Test 8: Disliked food must NOT become a safety violation → no Part 2 ineligible result ───
console.log("Test 8: Disliked food must NOT become a safety violation");
// Check safety evaluator:
const safetyCandidate: CandidateSafetyData = {
  id: "meal-disliked-1",
  name: "Creamy Mushroom Pasta",
  dietaryClassification: {
    vegetarian: true,
  },
  allergens: [],
  ingredients: ["mushroom", "pasta", "cheese"],
};
const safetyRes = evaluateCandidateEligibility(dislikedProfile, safetyCandidate);
// User dislikes mushroom, but is NOT allergic to it and has not added it to foodsToAvoid!
assert(safetyRes.status === "eligible", `Expected eligible safety status despite dislike, got ${safetyRes.status}`);
assert(!safetyRes.reasons.some((r) => r.code === "ALLERGEN_MATCH"), "No allergen match from disliked food");
assert(!safetyRes.reasons.some((r) => r.code === "FOOD_AVOIDANCE_MATCH"), "No food avoidance match without explicit foodsToAvoid");
console.log("  ✓ Test 8 passed: Disliked food is strictly a preference mismatch, never a safety violation.\n");

// ─── Test 9: Eligible vegan candidate explicitly tagged vegan → positive dietary alignment ───
console.log("Test 9: Eligible vegan candidate explicitly tagged vegan");
const veganProfile = createTestProfile({ dietaryPreferences: ["Vegan"] });
const veganCandidate: CandidateMatchData = {
  id: "meal-vegan-1",
  name: "Tofu Scramble",
  dietaryTags: ["vegan", "plant-based"],
};
const res9 = evaluateCandidateMatch(veganProfile, veganCandidate);
assert(res9.dietaryMatch === "positive", `Expected positive dietaryMatch, got ${res9.dietaryMatch}`);
assert(res9.signals.some((s) => s.code === "DIETARY_ALIGNMENT"), "Expected DIETARY_ALIGNMENT signal");
console.log("  ✓ Test 9 passed.\n");

// ─── Test 10: Missing dietary tags → unknown, not assumed ───
console.log("Test 10: Missing dietary tags");
const untaggedDietCandidate: CandidateMatchData = {
  id: "meal-vegan-2",
  name: "Green Salad",
  // dietaryTags undefined
};
const res10 = evaluateCandidateMatch(veganProfile, untaggedDietCandidate);
assert(res10.dietaryMatch === "unknown", `Expected unknown dietaryMatch, got ${res10.dietaryMatch}`);
assert(res10.signals.some((s) => s.code === "MATCH_DATA_UNAVAILABLE" && s.type === "dietary"), "Expected MATCH_DATA_UNAVAILABLE for dietary");
console.log("  ✓ Test 10 passed.\n");

// ─── Test 11: Empty preference arrays → no fabricated signals ───
console.log("Test 11: Empty preference arrays");
const emptyProfile = buildProfileContextFromProfile({
  id: "user-empty",
  name: "Empty Preferences User",
  dietaryPreferences: ["No Specific Preference"],
  allergies: ["None"],
});
const plainCandidate: CandidateMatchData = {
  id: "meal-plain-1",
  name: "Plain Cracker",
};
const res11 = evaluateCandidateMatch(emptyProfile, plainCandidate);
assert(res11.likedFoodMatch === "neutral", "Liked food match is neutral when user has no liked foods");
assert(res11.dislikedFoodMatch === "neutral", "Disliked food match is neutral when user has no disliked foods");
assert(res11.cuisineMatch === "neutral", "Cuisine match is neutral when user has no cuisine preferences");
assert(res11.dietaryMatch === "neutral", "Dietary match is neutral when user has no dietary pattern");
assert(!res11.signals.some((s) => s.code === "LIKED_FOOD_MATCH"), "No fabricated liked-food signal");
assert(!res11.signals.some((s) => s.code === "DISLIKED_FOOD_MATCH"), "No fabricated disliked-food signal");
console.log("  ✓ Test 11 passed.\n");

// ─── Test 12: Matcher does not mutate ProfileContext or candidate data ───
console.log("Test 12: Matcher does not mutate ProfileContext or candidate data");
const profileSnapshot = JSON.stringify(muscleProfile);
const candidateSnapshot = JSON.stringify(proteinCandidate);
evaluateCandidateMatch(muscleProfile, proteinCandidate);
assert(JSON.stringify(muscleProfile) === profileSnapshot, "ProfileContext was not mutated");
assert(JSON.stringify(proteinCandidate) === candidateSnapshot, "CandidateMatchData was not mutated");

// Verify result has NO scores, rankings, or health percentages
const resultKeys = Object.keys(res1);
assert(!resultKeys.includes("score"), "No score field in MatchResult");
assert(!resultKeys.includes("rank"), "No rank field in MatchResult");
assert(!resultKeys.includes("healthScore"), "No healthScore field in MatchResult");
assert(!resultKeys.includes("percentage"), "No percentage field in MatchResult");
console.log("  ✓ Test 12 passed: Immutability and guardrails confirmed.\n");

console.log("🎉 ALL 12 GOAL & PREFERENCE MATCHING TESTS PASSED WITH 100% SUCCESS!");
