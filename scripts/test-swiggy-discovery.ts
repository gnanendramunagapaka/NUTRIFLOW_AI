import { register } from "node:module";
import { pathToFileURL } from "node:url";
import assert from "node:assert";

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

const { buildProfileContextFromProfile } = await import("../lib/api-zod/src/profileContext.ts");
const { executeSwiggyDiscovery } = await import("../lib/api-zod/src/recommendationService.ts");
import type { RecommendationCandidateInput } from "../lib/api-zod/src/recommendationService.ts";

console.log("=== Running Phase 3 Part 1 Swiggy Live Discovery Tests ===\n");

// 1. Authoritative Profile Context using standard helper
const profile = buildProfileContextFromProfile({
  id: "user-phase3-part1",
  name: "Phase3 Test User",
  age: 28,
  weight: 70,
  height: 175,
  goal: "Muscle & Strength",
  dietaryPreferences: ["South Indian", "Vegetarian"],
  allergies: ["Peanuts"],
});

// 2. Mock Live Swiggy Candidates
// Candidate 1: North Indian, not matching primary goal or cuisine, but safe vegetarian
const cand1: RecommendationCandidateInput = {
  id: "cand_swiggy_1",
  name: "Punjab Grill Restaurant",
  domain: "food",
  safetyData: {
    id: "cand_swiggy_1",
    dietaryClassification: { vegetarian: true },
    allergens: [],
  },
  matchData: {
    id: "cand_swiggy_1",
    cuisineTags: ["North Indian"],
  },
  price: 350,
};

// Candidate 2: Contains peanuts -> MUST be excluded by hard safety gate
const cand2: RecommendationCandidateInput = {
  id: "cand_swiggy_2",
  name: "Peanut Chaat Special",
  domain: "food",
  safetyData: {
    id: "cand_swiggy_2",
    dietaryClassification: { vegetarian: true },
    allergens: ["Peanuts"],
  },
  matchData: {
    id: "cand_swiggy_2",
    cuisineTags: ["Street Food"],
  },
  price: 120,
};

// Candidate 3: Non-veg -> MUST be excluded for vegetarian user
const cand3: RecommendationCandidateInput = {
  id: "cand_swiggy_3",
  name: "Chicken Biryani Palace",
  domain: "food",
  safetyData: {
    id: "cand_swiggy_3",
    dietaryClassification: { nonVegetarian: true, vegetarian: false },
    allergens: [],
  },
  matchData: {
    id: "cand_swiggy_3",
    cuisineTags: ["Hyderabadi"],
  },
  price: 400,
};

// Candidate 4: Unknown safety data -> eligible with SAFETY_UNKNOWN, preserves Swiggy ranking
const cand4: RecommendationCandidateInput = {
  id: "cand_swiggy_4",
  name: "Artisan Coffee & Bakery",
  domain: "food",
  safetyData: {
    id: "cand_swiggy_4",
  },
  matchData: {
    id: "cand_swiggy_4",
    cuisineTags: ["Cafe"],
  },
  price: 250,
};

// Candidate 5: Safe vegetarian item
const cand5: RecommendationCandidateInput = {
  id: "cand_swiggy_5",
  name: "Udupi Idli Bhavan",
  domain: "food",
  safetyData: {
    id: "cand_swiggy_5",
    dietaryClassification: { vegetarian: true },
    allergens: [],
  },
  matchData: {
    id: "cand_swiggy_5",
    cuisineTags: ["South Indian"],
  },
  price: 150,
};

console.log("Test 1: Preserves Swiggy-provided ordering without deterministic Profile Context scoring");
{
  const result = executeSwiggyDiscovery(profile, {
    domain: "food",
    candidates: [cand1, cand4, cand5],
  });

  assert.strictEqual(result.recommendations.length, 3, "All 3 safe/unknown candidates returned");
  // Order MUST match input order: cand1, then cand4, then cand5
  assert.strictEqual(result.recommendations[0].candidate.id, "cand_swiggy_1", "Rank 1 is cand1");
  assert.strictEqual(result.recommendations[0].rank, 1, "Rank matches 1-based index");
  assert.strictEqual(result.recommendations[1].candidate.id, "cand_swiggy_4", "Rank 2 is cand4");
  assert.strictEqual(result.recommendations[1].rank, 2, "Rank matches 1-based index");
  assert.strictEqual(result.recommendations[2].candidate.id, "cand_swiggy_5", "Rank 3 is cand5");
  assert.strictEqual(result.recommendations[2].rank, 3, "Rank matches 1-based index");

  // totalScore must be 0 (no artificial score totals)
  for (const rec of result.recommendations) {
    assert.strictEqual(rec.totalScore, 0, "No artificial wellness totalScore");
    assert.strictEqual(rec.signalBreakdown.goalScore, 0, "No goalScore calculation");
    assert.strictEqual(rec.signalBreakdown.cuisineScore, 0, "No cuisineScore calculation");
    assert.strictEqual(rec.signalBreakdown.likedFoodScore, 0, "No likedFoodScore calculation");
    assert.strictEqual(rec.signalBreakdown.dislikedFoodScore, 0, "No dislikedFoodScore calculation");
    assert.strictEqual(rec.signalBreakdown.dietaryScore, 0, "No dietaryScore calculation");
    assert(!rec.reasonCodes.includes("GOAL_MATCH"), "No GOAL_MATCH reason code");
    assert(!rec.reasonCodes.includes("CUISINE_MATCH"), "No CUISINE_MATCH reason code");
  }
  console.log("  ✓ Swiggy ordering preserved and deterministic scoring bypassed");
}

console.log("Test 2: Hard safety constraints strictly exclude dangerous candidates");
{
  const result = executeSwiggyDiscovery(profile, {
    domain: "food",
    candidates: [cand1, cand2, cand3, cand4],
  });

  assert.strictEqual(result.recommendations.length, 2, "Only cand1 and cand4 are eligible");
  assert.strictEqual(result.excludedCandidates.length, 2, "cand2 (peanuts) and cand3 (non-veg) are excluded");

  const peanutExclusion = result.excludedCandidates.find((e: any) => e.candidate.id === "cand_swiggy_2");
  assert(peanutExclusion, "Peanut candidate is excluded");
  assert(peanutExclusion.exclusionReasonCodes.includes("ALLERGEN_MATCH"), "Has ALLERGEN_MATCH code");

  const nonVegExclusion = result.excludedCandidates.find((e: any) => e.candidate.id === "cand_swiggy_3");
  assert(nonVegExclusion, "Non-veg candidate is excluded for vegetarian");
  assert(nonVegExclusion.exclusionReasonCodes.includes("DIETARY_MISMATCH"), "Has DIETARY_MISMATCH code");
  console.log("  ✓ Hard safety exclusions strictly enforced without inferring nutritional claims");
}

console.log("Test 3: Limits are respected while preserving Swiggy discovery order");
{
  const result = executeSwiggyDiscovery(profile, {
    domain: "food",
    candidates: [cand1, cand4, cand5],
    limit: 2,
  });

  assert.strictEqual(result.recommendations.length, 2, "Returns limited 2 candidates");
  assert.strictEqual(result.recommendations[0].candidate.id, "cand_swiggy_1", "Rank 1 preserved");
  assert.strictEqual(result.recommendations[1].candidate.id, "cand_swiggy_4", "Rank 2 preserved");
  assert.strictEqual(result.metadata.returnedCount, 2, "Metadata reflects returned count");
  assert.strictEqual(result.metadata.rankedCount, 3, "Metadata reflects total eligible count");
  console.log("  ✓ Limits respected while preserving discovery ordering");
}

console.log("\n🎉 ALL PHASE 3 PART 1 DISCOVERY TESTS PASSED SUCCESSFULLY!\n");
