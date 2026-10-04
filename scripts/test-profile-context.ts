import {
  buildProfileContextFromProfile,
  ProfileContextSchema,
  CurrentRequestContextSchema,
  RecommendationInputContextSchema,
  type RawProfileInput,
  type CurrentRequestContext,
} from "../lib/api-zod/src/profileContext.ts";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log("=== Running NutriFlow Phase 2 Part 1 Profile Context Tests ===\n");

// Test 1: Complete Realistic User Profile
console.log("Test 1: Complete User Profile Transformation");
const mockUser: RawProfileInput = {
  id: "c4b31a89-2908-410d-a342-99d821213421",
  swiggyUserId: "swiggy_usr_99812",
  name: "Gnanendra Munagapaka",
  email: "user@example.com",
  onboardingCompleted: true,
  age: 26,
  weight: 74.5,
  height: 178,
  goal: "Muscle Building & Strength",
  dietaryPreferences: ["Vegetarian", "South Indian", "Pan-Asian", "High-Protein Bowls"],
  allergies: ["Peanuts", "Gluten", "None"],
  workoutFrequency: "Active (5+ days/week)",
  waterIntake: "2.5 - 3.5L",
  mealHabits: "3 Balanced Meals",
  budget: "Moderate",
  wellnessScore: 88,
  streak: 12,
  avatarUrl: "https://example.com/avatar.jpg",
};

const context1 = buildProfileContextFromProfile(mockUser);
ProfileContextSchema.parse(context1); // Verify schema validity

assert(context1.identity.name === "Gnanendra Munagapaka", "Name matches");
assert(context1.identity.age === 26, "Age matches");
assert(context1.body.weight === 74.5, "Weight matches");
assert(context1.body.height === 178, "Height matches");
assert(context1.goals.primaryGoal === "Muscle Building & Strength", "Primary goal matches");
assert(
  Array.isArray(context1.goals.secondaryGoals) &&
    context1.goals.secondaryGoals.includes("High-Protein Bowls"),
  "Nutrition target 'High-Protein Bowls' mapped to secondaryGoals"
);

// Untangling verification
assert(context1.dietary.dietaryPattern === "Vegetarian", "Dietary pattern isolated from combined array");
assert(
  context1.dietary.cuisinePreferences.includes("South Indian") &&
  context1.dietary.cuisinePreferences.includes("Pan-Asian"),
  "Real cuisines correctly extracted"
);
assert(
  !context1.dietary.cuisinePreferences.includes("High-Protein Bowls"),
  "Nutrition preference 'High-Protein Bowls' is NEVER emitted as cuisine preference"
);
assert(!context1.dietary.cuisinePreferences.includes("Vegetarian"), "Dietary pattern not duplicated in cuisines");

// Allergy normalization (filtering 'None')
assert(context1.dietary.allergies.includes("Peanuts") && context1.dietary.allergies.includes("Gluten"), "Valid allergies kept");
assert(!context1.dietary.allergies.includes("None"), "'None' sentinel filtered out");

// Unsupported fields explicitly empty
assert(Array.isArray(context1.dietary.foodsToAvoid) && context1.dietary.foodsToAvoid.length === 0, "foodsToAvoid is []");
assert(Array.isArray(context1.dietary.likedFoods) && context1.dietary.likedFoods.length === 0, "likedFoods is []");
assert(Array.isArray(context1.dietary.dislikedFoods) && context1.dietary.dislikedFoods.length === 0, "dislikedFoods is []");

// Lifestyle
assert(context1.lifestyle.activityLevel === "Active (5+ days/week)", "Activity level matches");
assert(context1.lifestyle.waterIntake === "2.5 - 3.5L", "Water intake matches");
assert(context1.lifestyle.mealHabits === "3 Balanced Meals", "Meal habits matches");

// Account
assert(context1.account.userId === "c4b31a89-2908-410d-a342-99d821213421", "User ID matches");
assert(context1.account.onboardingCompleted === true, "Onboarding status matches");
console.log("  ✓ Complete Profile Test passed.\n");

// Test 2: Minimal/Null Profile Transformation
console.log("Test 2: Minimal / Empty Profile Transformation");
const minimalUser: RawProfileInput = {
  id: "anon-uuid",
  name: null,
  dietaryPreferences: null,
  allergies: null,
};

const context2 = buildProfileContextFromProfile(minimalUser);
ProfileContextSchema.parse(context2);

assert(context2.identity.name === "Guest User", "Fallback guest name");
assert(context2.identity.age === null, "Age is null");
assert(context2.body.height === null, "Height is null");
assert(context2.body.weight === null, "Weight is null");
assert(context2.dietary.dietaryPattern === null, "Dietary pattern is null");
assert(context2.dietary.cuisinePreferences.length === 0, "Cuisine preferences empty");
assert(context2.dietary.allergies.length === 0, "Allergies empty");
console.log("  ✓ Minimal Profile Test passed.\n");

// Test 3: Current Request Context Separation
console.log("Test 3: Ephemeral CurrentRequestContext Separation");
const currentRequest: CurrentRequestContext = {
  domain: "food",
  mealOccasion: "dinner",
  craving: "warm lentil soup with steamed idlis",
  temporaryBudget: {
    maxAmount: 400,
    currency: "INR",
    tier: "mid",
  },
  location: {
    locality: "Indiranagar, Bengaluru",
    latitude: 12.9716,
    longitude: 77.6412,
  },
  orderingForOthers: false,
  partySize: 1,
  requestTimestamp: new Date().toISOString(),
};

CurrentRequestContextSchema.parse(currentRequest);

// Combined Recommendation Input
const recommendationInput = RecommendationInputContextSchema.parse({
  profile: context1,
  currentRequest,
});

assert(recommendationInput.profile.identity.name === "Gnanendra Munagapaka", "Profile preserved in input");
assert(recommendationInput.currentRequest?.craving === "warm lentil soup with steamed idlis", "Request craving preserved");
assert(!("craving" in recommendationInput.profile), "Craving is NOT in persistent profile");
console.log("  ✓ Ephemeral Request Context Separation passed.\n");

// Test 4: Verification of No Fabricated Medical/Nutrition Logic
console.log("Test 4: Verification of Boundary Guardrails");
assert(!("bmi" in (context1 as any)), "No BMI field");
assert(!("calorieTarget" in (context1 as any)), "No calorie target field");
assert(!("tdee" in (context1 as any)), "No TDEE field");
assert(!("macroDistribution" in (context1 as any)), "No macro distribution field");
assert(!("medicalConditions" in (context1 as any)), "No medical diagnosis field");
console.log("  ✓ Boundary Guardrails verified.\n");

// ─── Regression Tests for Onboarding → Profile Context Preference Mapping ──────
import { evaluateCandidateMatch, type CandidateMatchData } from "../lib/api-zod/src/goalPreferenceMatching.ts";

console.log("Test 5: [Requirement A] 'High Protein' is NEVER emitted as a cuisine preference");
const highProteinUser: RawProfileInput = {
  id: "user_hp_1",
  name: "Protein Focused User",
  dietaryPreferences: ["High Protein"],
};
const hpContext = buildProfileContextFromProfile(highProteinUser);
ProfileContextSchema.parse(hpContext);
assert(!hpContext.dietary.cuisinePreferences.includes("High Protein"), "'High Protein' is not in cuisinePreferences");
assert(hpContext.dietary.cuisinePreferences.length === 0, "cuisinePreferences is completely empty for pure nutrition pref");
assert(hpContext.goals.secondaryGoals.includes("High Protein"), "'High Protein' is correctly placed in secondaryGoals");
console.log("  ✓ Test 5 passed: 'High Protein' is never emitted as a cuisine preference.\n");

console.log("Test 6: [Requirement B] Real cuisine selection is emitted as cuisinePreferences");
const cuisineUser: RawProfileInput = {
  id: "user_cuisine_1",
  name: "Cuisine Focused User",
  dietaryPreferences: ["Vegetarian", "South Indian", "North Indian", "High Protein"],
};
const cuisineContext = buildProfileContextFromProfile(cuisineUser);
ProfileContextSchema.parse(cuisineContext);
assert(cuisineContext.dietary.dietaryPattern === "Vegetarian", "Dietary pattern is Vegetarian");
assert(cuisineContext.dietary.cuisinePreferences.includes("South Indian"), "South Indian in cuisinePreferences");
assert(cuisineContext.dietary.cuisinePreferences.includes("North Indian"), "North Indian in cuisinePreferences");
assert(!cuisineContext.dietary.cuisinePreferences.includes("High Protein"), "'High Protein' not in cuisinePreferences");
assert(!cuisineContext.dietary.cuisinePreferences.includes("Vegetarian"), "'Vegetarian' not in cuisinePreferences");
assert(cuisineContext.goals.secondaryGoals.includes("High Protein"), "'High Protein' in secondaryGoals");
console.log("  ✓ Test 6 passed: Real cuisines emitted as cuisinePreferences, nutrition preferences kept separate.\n");

console.log("Test 7: [Requirement C] Allergies remain separate from dietary/nutrition and cuisine preferences");
const allergyUser: RawProfileInput = {
  id: "user_allergy_1",
  name: "Allergic User",
  dietaryPreferences: ["High Protein", "South Indian"],
  allergies: ["Peanuts", "Shellfish", "None"],
};
const allergyContext = buildProfileContextFromProfile(allergyUser);
assert(allergyContext.dietary.allergies.includes("Peanuts"), "Peanuts in allergies");
assert(allergyContext.dietary.allergies.includes("Shellfish"), "Shellfish in allergies");
assert(!allergyContext.dietary.allergies.includes("None"), "'None' sentinel excluded");
assert(!allergyContext.dietary.cuisinePreferences.includes("Peanuts"), "Allergies not in cuisinePreferences");
assert(!allergyContext.dietary.allergies.includes("High Protein"), "Nutrition pref not in allergies");
assert(!allergyContext.dietary.allergies.includes("South Indian"), "Cuisine not in allergies");
console.log("  ✓ Test 7 passed: Allergies remain strictly separate.\n");

console.log("Test 8: [Requirement D] Primary Goal remains separate from nutrition targets and cuisine preferences");
const goalUser: RawProfileInput = {
  id: "user_goal_1",
  name: "Goal User",
  goal: "Weight Loss",
  dietaryPreferences: ["High Protein", "Pan-Asian"],
};
const goalContext = buildProfileContextFromProfile(goalUser);
assert(goalContext.goals.primaryGoal === "Weight Loss", "Primary goal is Weight Loss");
assert(!goalContext.dietary.cuisinePreferences.includes("Weight Loss"), "Primary goal not in cuisinePreferences");
assert(!goalContext.dietary.cuisinePreferences.includes("High Protein"), "Nutrition pref not in cuisinePreferences");
assert(goalContext.dietary.cuisinePreferences.includes("Pan-Asian"), "Pan-Asian in cuisinePreferences");
assert(goalContext.goals.secondaryGoals.includes("High Protein"), "High Protein in secondaryGoals");
console.log("  ✓ Test 8 passed: Goals remain strictly separate.\n");

console.log("Test 9: [Requirement E] Existing profile context fields remain compatible");
const compatUser: RawProfileInput = {
  id: "user_compat_1",
  swiggyUserId: "swiggy_123",
  name: "Compatibility User",
  email: "compat@test.com",
  age: 30,
  weight: 80,
  height: 182,
  goal: "Stay Fit & Lean",
  dietaryPreferences: ["High Protein", "Low Carb", "Keto Friendly"],
  allergies: ["Dairy / Lactose"],
  workoutFrequency: "Moderate (3-4 days/week)",
  waterIntake: "2 - 3 Litres / day",
  mealHabits: "3 Balanced Meals",
  budget: "Moderate",
  wellnessScore: 78,
  streak: 5,
};
const compatContext = buildProfileContextFromProfile(compatUser);
const parsedCompat = ProfileContextSchema.parse(compatContext);
assert(parsedCompat.account.userId === "user_compat_1", "userId compatible");
assert(parsedCompat.account.swiggyUserId === "swiggy_123", "swiggyUserId compatible");
assert(parsedCompat.account.email === "compat@test.com", "email compatible");
assert(parsedCompat.body.weight === 80 && parsedCompat.body.height === 182, "body compatible");
assert(parsedCompat.lifestyle.activityLevel === "Moderate (3-4 days/week)", "lifestyle compatible");
assert(parsedCompat.goals.secondaryGoals.includes("High Protein"), "High Protein in secondaryGoals");
assert(parsedCompat.goals.secondaryGoals.includes("Low Carb"), "Low Carb in secondaryGoals");
assert(parsedCompat.goals.secondaryGoals.includes("Keto Friendly"), "Keto Friendly in secondaryGoals");
assert(parsedCompat.dietary.cuisinePreferences.length === 0, "No cuisine preferences assumed");
console.log("  ✓ Test 9 passed: Full backward compatibility confirmed.\n");

console.log("Test 10: [Requirement F] Recommendation matching no longer produces CUISINE_MISMATCH for 'High Protein' user");
const liveRestaurantCandidate: CandidateMatchData = {
  id: "food-rst-reddys-kitchen",
  name: "Reddy's Kitchen",
  cuisineTags: ["South Indian", "Biryani"],
};
// User only has "High Protein" as dietary preference
const hpMatchResult = evaluateCandidateMatch(hpContext, liveRestaurantCandidate);
assert(hpMatchResult.cuisineMatch === "neutral", `Expected neutral cuisineMatch, got ${hpMatchResult.cuisineMatch}`);
assert(
  !hpMatchResult.signals.some((s) => s.code === "CUISINE_MISMATCH"),
  "CUISINE_MISMATCH must NOT be emitted for user with High Protein"
);
console.log("  ✓ Test 10 passed: Recommendation matching produces neutral cuisine match (NO CUISINE_MISMATCH) for 'High Protein' user.\n");

console.log("Test 11: [Requirement G] Missing cuisine preference remains UNKNOWN/neutral rather than negative");
const candidateWithCuisine: CandidateMatchData = {
  id: "food-rst-any",
  name: "Any Restaurant",
  cuisineTags: ["Continental", "Italian"],
};
const noCuisineUserContext = buildProfileContextFromProfile({
  id: "user_no_cuisine",
  name: "No Cuisine Preference User",
  dietaryPreferences: ["No Specific Preference"],
});
const noCuisineMatchResult = evaluateCandidateMatch(noCuisineUserContext, candidateWithCuisine);
assert(noCuisineMatchResult.cuisineMatch === "neutral", `Expected neutral cuisineMatch, got ${noCuisineMatchResult.cuisineMatch}`);
assert(
  !noCuisineMatchResult.signals.some((s) => s.code === "CUISINE_MISMATCH"),
  "CUISINE_MISMATCH must NOT be produced when user has no cuisine preferences"
);
console.log("  ✓ Test 11 passed: Missing cuisine preference remains neutral rather than negative.\n");

console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
