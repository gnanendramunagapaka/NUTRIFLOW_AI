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

const { evaluateCandidateEligibility } = await import("../lib/api-zod/src/safetyEligibility.ts");
const { buildProfileContextFromProfile } = await import("../lib/api-zod/src/profileContext.ts");
import type { CandidateSafetyData, EligibilityResult } from "../lib/api-zod/src/safetyEligibility.ts";
import type { ProfileContext, CurrentRequestContext } from "../lib/api-zod/src/profileContext.ts";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log("=== Running NutriFlow Phase 2 Part 2 Safety & Eligibility Tests ===\n");

// Base profile template
function createTestProfile(overrides: Partial<Parameters<typeof buildProfileContextFromProfile>[0]> = {}): ProfileContext {
  return buildProfileContextFromProfile({
    id: "test-user-uuid",
    name: "Test User",
    age: 28,
    weight: 70,
    height: 175,
    goal: "Stay Healthy",
    dietaryPreferences: ["Vegetarian"],
    allergies: ["None"],
    ...overrides,
  });
}

// ─── Test 1: Vegetarian user + explicitly vegetarian candidate → ELIGIBLE ───
console.log("Test 1: Vegetarian user + explicitly vegetarian candidate");
const vegProfile = createTestProfile({ dietaryPreferences: ["Vegetarian"] });
const vegCandidate: CandidateSafetyData = {
  id: "meal-101",
  name: "Steamed Vegetable Idli Sambar",
  dietaryClassification: {
    vegetarian: true,
    vegan: true,
    containsEgg: false,
    containsMeat: false,
    containsSeafood: false,
  },
  allergens: [],
  ingredients: ["rice", "urad dal", "lentils", "vegetables", "mustard seeds"],
};

const res1 = evaluateCandidateEligibility(vegProfile, vegCandidate);
assert(res1.status === "eligible", `Expected eligible, got ${res1.status}`);
assert(res1.reasons.length === 0, `Expected 0 reasons, got ${res1.reasons.length}`);
console.log("  ✓ Test 1 passed.\n");

// ─── Test 2: Vegetarian user + explicitly non-vegetarian candidate → INELIGIBLE ───
console.log("Test 2: Vegetarian user + explicitly non-vegetarian candidate");
const nonVegCandidate: CandidateSafetyData = {
  id: "meal-102",
  name: "Grilled Chicken Bowl",
  dietaryClassification: {
    vegetarian: false,
    containsMeat: true,
    containsSeafood: false,
  },
  allergens: [],
  ingredients: ["chicken breast", "brown rice", "broccoli"],
};

const res2 = evaluateCandidateEligibility(vegProfile, nonVegCandidate);
assert(res2.status === "ineligible", `Expected ineligible, got ${res2.status}`);
assert(res2.reasons.some((r) => r.code === "DIETARY_MISMATCH"), "Expected DIETARY_MISMATCH reason");
assert(res2.reasons.some((r) => r.constraint === "Vegetarian"), "Expected Vegetarian constraint");
console.log("  ✓ Test 2 passed.\n");

// ─── Test 3: Vegan user + explicitly dairy-containing candidate → INELIGIBLE ───
console.log("Test 3: Vegan user + explicitly dairy-containing candidate");
const veganProfile = createTestProfile({ dietaryPreferences: ["Vegan"] });
const dairyCandidate: CandidateSafetyData = {
  id: "meal-103",
  name: "Paneer Butter Masala",
  dietaryClassification: {
    vegetarian: true,
    vegan: false,
    containsDairy: true,
  },
  allergens: ["Dairy"],
  ingredients: ["paneer", "butter", "cream", "tomatoes", "cashews"],
};

const res3 = evaluateCandidateEligibility(veganProfile, dairyCandidate);
assert(res3.status === "ineligible", `Expected ineligible, got ${res3.status}`);
assert(res3.reasons.some((r) => r.code === "DIETARY_MISMATCH" && r.constraint === "Vegan"), "Expected Vegan DIETARY_MISMATCH");
console.log("  ✓ Test 3 passed.\n");

// ─── Test 4: User with peanut allergy + candidate explicitly containing peanuts → INELIGIBLE ───
console.log("Test 4: User with peanut allergy + candidate explicitly containing peanuts");
const peanutAllergyProfile = createTestProfile({
  dietaryPreferences: ["No Specific Preference"],
  allergies: ["Peanuts"],
});
const peanutCandidate: CandidateSafetyData = {
  id: "snack-104",
  name: "Roasted Peanut Chikki",
  allergens: ["Peanuts"],
  ingredients: ["peanuts", "jaggery"],
};

const res4 = evaluateCandidateEligibility(peanutAllergyProfile, peanutCandidate);
assert(res4.status === "ineligible", `Expected ineligible, got ${res4.status}`);
assert(res4.reasons.some((r) => r.code === "ALLERGEN_MATCH" && r.constraint === "Peanuts"), "Expected ALLERGEN_MATCH for Peanuts");
console.log("  ✓ Test 4 passed.\n");

// ─── Test 5: User with peanut allergy + candidate with no allergen/ingredient data → UNKNOWN ───
console.log("Test 5: User with peanut allergy + candidate with no allergen/ingredient data");
const noDataCandidate: CandidateSafetyData = {
  id: "item-105",
  name: "Chef Special Curry",
  // allergens and ingredients are undefined
};

const res5 = evaluateCandidateEligibility(peanutAllergyProfile, noDataCandidate);
assert(res5.status === "unknown", `Expected unknown, got ${res5.status}`);
assert(res5.reasons.some((r) => r.code === "INSUFFICIENT_SAFETY_DATA" && r.type === "allergy"), "Expected INSUFFICIENT_SAFETY_DATA reason");
console.log("  ✓ Test 5 passed.\n");

// ─── Test 6: User with no allergies + candidate with unknown allergen data → no invented allergy conflict ───
console.log("Test 6: User with no allergies + candidate with unknown allergen data");
const noAllergyProfile = createTestProfile({
  dietaryPreferences: ["No Specific Preference"],
  allergies: ["None"],
});

const res6 = evaluateCandidateEligibility(noAllergyProfile, noDataCandidate);
// User has no dietary restrictions and no allergies, candidate has no data. No conflicts invented!
assert(res6.status === "eligible", `Expected eligible, got ${res6.status}`);
assert(!res6.reasons.some((r) => r.type === "allergy"), "Did not invent any allergy conflicts");
console.log("  ✓ Test 6 passed.\n");

// ─── Test 7: Non-vegetarian user + vegetarian candidate → ELIGIBLE ───
console.log("Test 7: Non-vegetarian user + vegetarian candidate");
const nonVegProfile = createTestProfile({ dietaryPreferences: ["Non-Vegetarian"] });

const res7 = evaluateCandidateEligibility(nonVegProfile, vegCandidate);
assert(res7.status === "eligible", `Expected eligible, got ${res7.status}`);
assert(res7.reasons.length === 0, "Non-vegetarian is not rejected for vegetarian item");
console.log("  ✓ Test 7 passed.\n");

// ─── Test 8: foodsToAvoid populated + candidate explicitly containing avoided ingredient → INELIGIBLE ───
console.log("Test 8: foodsToAvoid populated + candidate explicitly containing avoided ingredient");
const avoidProfile = createTestProfile({ dietaryPreferences: ["No Specific Preference"] });
// Manually populate future-compatible foodsToAvoid
avoidProfile.dietary.foodsToAvoid = ["mushroom", "bell pepper"];

const mushroomCandidate: CandidateSafetyData = {
  id: "meal-108",
  name: "Wild Mushroom Risotto",
  allergens: [],
  ingredients: ["arborio rice", "wild mushroom", "parmesan", "garlic"],
};

const res8 = evaluateCandidateEligibility(avoidProfile, mushroomCandidate);
assert(res8.status === "ineligible", `Expected ineligible, got ${res8.status}`);
assert(res8.reasons.some((r) => r.code === "FOOD_AVOIDANCE_MATCH" && r.constraint === "mushroom"), "Expected FOOD_AVOIDANCE_MATCH for mushroom");
console.log("  ✓ Test 8 passed.\n");

// ─── Test 9: Unknown candidate classification + vegetarian user → UNKNOWN ───
console.log("Test 9: Unknown candidate classification + vegetarian user");
const unclassifiedCandidate: CandidateSafetyData = {
  id: "meal-109",
  name: "Mystery Noodle Bowl",
  allergens: [],
  ingredients: ["noodles", "broth", "oil"],
  // dietaryClassification is undefined
};

const res9 = evaluateCandidateEligibility(vegProfile, unclassifiedCandidate);
assert(res9.status === "unknown", `Expected unknown, got ${res9.status}`);
assert(res9.reasons.some((r) => r.code === "INSUFFICIENT_SAFETY_DATA" && r.type === "dietary_pattern"), "Must not falsely classify as eligible");
console.log("  ✓ Test 9 passed.\n");

// ─── Test 10: Multiple allergies + multiple candidate allergens → deterministic result with all matching reasons ───
console.log("Test 10: Multiple allergies + multiple candidate allergens");
const multiAllergyProfile = createTestProfile({
  dietaryPreferences: ["No Specific Preference"],
  allergies: ["Peanuts", "Gluten", "Dairy"],
});

const multiAllergenCandidate: CandidateSafetyData = {
  id: "snack-110",
  name: "Peanut Butter Wheat Cookies with Milk Chocolate",
  allergens: ["Peanuts", "Gluten", "Dairy"],
  ingredients: ["wheat flour", "peanuts", "milk chocolate", "butter"],
};

const res10 = evaluateCandidateEligibility(multiAllergyProfile, multiAllergenCandidate);
assert(res10.status === "ineligible", `Expected ineligible, got ${res10.status}`);
const allergenMatches = res10.reasons.filter((r) => r.code === "ALLERGEN_MATCH");
assert(allergenMatches.length >= 3, `Expected at least 3 allergen matches, found ${allergenMatches.length}`);
assert(allergenMatches.some((r) => r.constraint === "Peanuts"), "Matches Peanuts");
assert(allergenMatches.some((r) => r.constraint === "Gluten"), "Matches Gluten");
assert(allergenMatches.some((r) => r.constraint === "Dairy"), "Matches Dairy");
console.log("  ✓ Test 10 passed.\n");

// ─── Immutability & Guardrail Checks ───
console.log("Test 11: Immutability and Boundary Verification");
const snapshotBefore = JSON.stringify(multiAllergyProfile);
evaluateCandidateEligibility(multiAllergyProfile, multiAllergenCandidate);
const snapshotAfter = JSON.stringify(multiAllergyProfile);
assert(snapshotBefore === snapshotAfter, "ProfileContext was not mutated during evaluation");

// Verification that output has NO scores, rankings, or medical targets
const keys = Object.keys(res10);
assert(!keys.includes("score"), "No score field in EligibilityResult");
assert(!keys.includes("rank"), "No rank field in EligibilityResult");
assert(!keys.includes("percentage"), "No percentage field in EligibilityResult");
assert(!keys.includes("healthScore"), "No healthScore field in EligibilityResult");
console.log("  ✓ Immutability and Guardrail checks passed.\n");

console.log("🎉 ALL 11 SAFETY & ELIGIBILITY TESTS PASSED WITH 100% SUCCESS!");
