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

const { buildCurrentRequestContext, buildRecommendationInputContext } = await import(
  "../lib/api-zod/src/currentContext.ts"
);
const { buildProfileContextFromProfile } = await import("../lib/api-zod/src/profileContext.ts");
const { evaluateCandidateEligibility } = await import("../lib/api-zod/src/safetyEligibility.ts");

import type { RawCurrentRequestInput, CurrentRequestContext } from "../lib/api-zod/src/currentContext.ts";
import type { ProfileContext } from "../lib/api-zod/src/profileContext.ts";
import type { CandidateSafetyData } from "../lib/api-zod/src/safetyEligibility.ts";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log("=== Running NutriFlow Phase 2 Part 4 Current Context Tests ===\n");

function createBaseProfile(): ProfileContext {
  return buildProfileContextFromProfile({
    id: "user-part4-test",
    name: "Part 4 Test User",
    age: 28,
    weight: 70,
    height: 175,
    goal: "Stay Fit",
    dietaryPreferences: ["South Indian", "Vegetarian"],
    allergies: ["Peanuts"],
  });
}

// ─── Test 1: Food domain context ───
console.log("Test 1: Food domain context");
const rawFoodReq: RawCurrentRequestInput = {
  domain: "food",
  mealOccasion: "dinner",
  craving: "hot soup and dosa",
  temporaryBudget: {
    maxAmount: 350,
    currency: "INR",
    tier: "mid",
  },
  location: {
    latitude: 12.9716,
    longitude: 77.6412,
    locality: "Indiranagar",
    addressText: "100ft Road, Bengaluru",
  },
};
const foodContext = buildCurrentRequestContext(rawFoodReq);
assert(foodContext !== undefined, "Food context built");
assert(foodContext?.domain === "food", "Domain is food");
assert(foodContext?.mealOccasion === "dinner", "Meal occasion is dinner");
assert(foodContext?.craving === "hot soup and dosa", "Craving preserved");
assert(foodContext?.temporaryBudget?.maxAmount === 350, "Budget maxAmount is 350");
assert(foodContext?.temporaryBudget?.currency === "INR", "Budget currency is INR");
assert(foodContext?.temporaryBudget?.tier === "mid", "Budget tier is mid");
assert(foodContext?.location?.locality === "Indiranagar", "Location locality preserved");
console.log("  ✓ Test 1 passed.\n");

// ─── Test 2: Instamart context ───
console.log("Test 2: Instamart context");
const rawInstaReq: RawCurrentRequestInput = {
  domain: "instamart",
  craving: "fresh fruits and yogurt",
  temporaryBudget: {
    maxAmount: 500,
    tier: "budget",
  },
  location: {
    locality: "Koramangala",
  },
  orderingForOthers: true,
};
const instaContext = buildCurrentRequestContext(rawInstaReq);
assert(instaContext !== undefined, "Instamart context built");
assert(instaContext?.domain === "instamart", "Domain is instamart");
assert(instaContext?.temporaryBudget?.maxAmount === 500, "Budget maxAmount is 500");
assert(instaContext?.temporaryBudget?.currency === "INR", "Currency defaults to INR");
assert(instaContext?.location?.locality === "Koramangala", "Locality preserved");
assert(instaContext?.orderingForOthers === true, "orderingForOthers is true");
assert(instaContext?.mealOccasion === undefined, "mealOccasion undefined when not passed");
console.log("  ✓ Test 2 passed.\n");

// ─── Test 3: Dineout context ───
console.log("Test 3: Dineout context");
const rawDineReq: RawCurrentRequestInput = {
  domain: "dineout",
  partySize: 4,
  mealOccasion: "lunch",
  location: {
    locality: "Lavelle Road",
  },
};
const dineContext = buildCurrentRequestContext(rawDineReq);
assert(dineContext !== undefined, "Dineout context built");
assert(dineContext?.domain === "dineout", "Domain is dineout");
assert(dineContext?.partySize === 4, "Party size is 4");
assert(dineContext?.mealOccasion === "lunch", "Meal occasion is lunch");
assert(dineContext?.location?.locality === "Lavelle Road", "Locality preserved");
console.log("  ✓ Test 3 passed.\n");

// ─── Test 4: Temporary budget does not modify persistent profile ───
console.log("Test 4: Temporary budget does not modify persistent profile");
const profile4 = createBaseProfile();
const profileSnapshot4 = JSON.stringify(profile4);
buildRecommendationInputContext(profile4, rawFoodReq);
assert(JSON.stringify(profile4) === profileSnapshot4, "Profile was not modified by temporary budget");
assert(!("temporaryBudget" in profile4), "temporaryBudget not on profile");
console.log("  ✓ Test 4 passed.\n");

// ─── Test 5: Current craving does not modify cuisine preferences ───
console.log("Test 5: Current craving does not modify cuisine preferences");
const profile5 = createBaseProfile();
assert(profile5.dietary.cuisinePreferences.includes("South Indian"), "Initial cuisine is South Indian");
const cravingReq: RawCurrentRequestInput = {
  craving: "authentic spicy Sichuan noodles",
};
const recInput5 = buildRecommendationInputContext(profile5, cravingReq);
assert(recInput5.currentRequest?.craving === "authentic spicy Sichuan noodles", "Craving present in request");
assert(profile5.dietary.cuisinePreferences.length === 1 && profile5.dietary.cuisinePreferences[0] === "South Indian", "Cuisine preferences unchanged");
assert(!profile5.dietary.cuisinePreferences.includes("Sichuan"), "Craving did NOT leak into persistent cuisinePreferences");
console.log("  ✓ Test 5 passed.\n");

// ─── Test 6: Current location does not modify persistent profile ───
console.log("Test 6: Current location does not modify persistent profile");
const profile6 = createBaseProfile();
const locReq: RawCurrentRequestInput = {
  location: {
    locality: "Whitefield, Bengaluru",
    latitude: 12.9698,
    longitude: 77.7500,
  },
};
buildRecommendationInputContext(profile6, locReq);
assert(!("location" in profile6), "Location not attached to persistent ProfileContext");
console.log("  ✓ Test 6 passed.\n");

// ─── Test 7: orderingForOthers does not mutate profile ───
console.log("Test 7: orderingForOthers does not mutate profile");
const profile7 = createBaseProfile();
const forOthersReq: RawCurrentRequestInput = {
  orderingForOthers: true,
};
const recInput7 = buildRecommendationInputContext(profile7, forOthersReq);
assert(recInput7.currentRequest?.orderingForOthers === true, "orderingForOthers recorded in currentRequest");
assert(profile7.dietary.dietaryPattern === "Vegetarian", "Profile dietary pattern intact");
assert(profile7.dietary.allergies.includes("Peanuts"), "Profile allergies intact");
console.log("  ✓ Test 7 passed.\n");

// ─── Test 8: partySize validates correctly ───
console.log("Test 8: partySize validates correctly");
const validPartyReq = buildCurrentRequestContext({ partySize: 6 });
assert(validPartyReq?.partySize === 6, "Positive integer party size accepted");

let caughtNegative = false;
try {
  buildCurrentRequestContext({ partySize: -1 });
} catch {
  caughtNegative = true;
}
assert(caughtNegative, "Negative partySize rejected");

let caughtZero = false;
try {
  buildCurrentRequestContext({ partySize: 0 });
} catch {
  caughtZero = true;
}
assert(caughtZero, "Zero partySize rejected");

let caughtFloat = false;
try {
  buildCurrentRequestContext({ partySize: 3.5 });
} catch {
  caughtFloat = true;
}
assert(caughtFloat, "Float partySize rejected");
console.log("  ✓ Test 8 passed.\n");

// ─── Test 9: Invalid enum values are rejected ───
console.log("Test 9: Invalid enum values are rejected");
let caughtBadDomain = false;
try {
  buildCurrentRequestContext({ domain: "invalid_domain" as any });
} catch {
  caughtBadDomain = true;
}
assert(caughtBadDomain, "Invalid domain rejected");

let caughtBadOccasion = false;
try {
  buildCurrentRequestContext({ mealOccasion: "brunch" as any });
} catch {
  caughtBadOccasion = true;
}
assert(caughtBadOccasion, "Invalid mealOccasion rejected");

let caughtBadTier = false;
try {
  buildCurrentRequestContext({ temporaryBudget: { tier: "super-expensive" as any } });
} catch {
  caughtBadTier = true;
}
assert(caughtBadTier, "Invalid budget tier rejected");
console.log("  ✓ Test 9 passed.\n");

// ─── Test 10: Missing optional fields remain undefined ───
console.log("Test 10: Missing optional fields remain undefined");
const minimalReq = buildCurrentRequestContext({ domain: "food" });
assert(minimalReq?.domain === "food", "Domain set");
assert(minimalReq?.mealOccasion === undefined, "mealOccasion is undefined");
assert(minimalReq?.craving === undefined, "craving is undefined");
assert(minimalReq?.temporaryBudget === undefined, "temporaryBudget is undefined");
assert(minimalReq?.location === undefined, "location is undefined");
assert(minimalReq?.orderingForOthers === undefined, "orderingForOthers is undefined");
assert(minimalReq?.partySize === undefined, "partySize is undefined");
assert(minimalReq?.requestTimestamp === undefined, "requestTimestamp is undefined");
console.log("  ✓ Test 10 passed.\n");

// ─── Test 11: No fabricated defaults are created ───
console.log("Test 11: No fabricated defaults are created");
const emptyReq = buildCurrentRequestContext({});
assert(emptyReq === undefined, "Empty input yields undefined CurrentRequestContext");
const nullReq = buildCurrentRequestContext(null);
assert(nullReq === undefined, "Null input yields undefined CurrentRequestContext");
console.log("  ✓ Test 11 passed.\n");

// ─── Test 12: CurrentRequestContext remains ephemeral ───
console.log("Test 12: CurrentRequestContext remains ephemeral");
const profile12 = createBaseProfile();
const req12 = buildCurrentRequestContext({ craving: "Chocolate Cake" });
const combined12 = buildRecommendationInputContext(profile12, req12);
assert(combined12.currentRequest?.craving === "Chocolate Cake", "Craving in combined input");
assert(!("craving" in profile12), "Profile does not hold request craving");
console.log("  ✓ Test 12 passed.\n");

// ─── Test 13: RecommendationInputContext correctly combines: profile + currentRequest ───
console.log("Test 13: RecommendationInputContext correctly combines: profile + currentRequest");
const profile13 = createBaseProfile();
const combined13 = buildRecommendationInputContext(profile13, rawFoodReq);
assert(combined13.profile.identity.name === "Part 4 Test User", "Profile context preserved");
assert(combined13.currentRequest?.domain === "food", "Current request context preserved");
assert(combined13.currentRequest?.mealOccasion === "dinner", "Meal occasion preserved");
console.log("  ✓ Test 13 passed.\n");

// ─── Test 14: Current context cannot remove/override allergies ───
console.log("Test 14: Current context cannot remove/override allergies");
const allergyProfile = createBaseProfile();
assert(allergyProfile.dietary.allergies.includes("Peanuts"), "User has Peanut allergy");

// User enters craving: "peanut butter toast"
const peanutCravingReq = buildCurrentRequestContext({
  craving: "peanut butter toast",
});
const combinedInput = buildRecommendationInputContext(allergyProfile, peanutCravingReq);

// Evaluate candidate item containing peanuts
const peanutDish: CandidateSafetyData = {
  id: "dish-peanut-1",
  name: "Peanut Butter Sandwich",
  allergens: ["Peanuts"],
  ingredients: ["bread", "peanuts", "sugar"],
};

// Safety evaluator receives the profile from combinedInput
const safetyResult = evaluateCandidateEligibility(combinedInput.profile, peanutDish);
assert(safetyResult.status === "ineligible", `Item MUST remain ineligible despite craving, got: ${safetyResult.status}`);
assert(safetyResult.reasons.some((r) => r.code === "ALLERGEN_MATCH" && r.constraint === "Peanuts"), "Allergy hard constraint enforced");
console.log("  ✓ Test 14 passed: Current craving CANNOT override persistent allergy safety.\n");

// ─── Test 15: ProfileContext remains immutable ───
console.log("Test 15: ProfileContext remains immutable");
const profile15 = createBaseProfile();
const frozenSnapshot = JSON.stringify(profile15);
buildRecommendationInputContext(profile15, rawFoodReq);
buildRecommendationInputContext(profile15, rawDineReq);
buildRecommendationInputContext(profile15, rawInstaReq);
assert(JSON.stringify(profile15) === frozenSnapshot, "ProfileContext remained 100% immutable across all requests");
console.log("  ✓ Test 15 passed.\n");

console.log("🎉 ALL 15 CURRENT CONTEXT TESTS PASSED WITH 100% SUCCESS!");
