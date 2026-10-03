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
assert(Array.isArray(context1.goals.secondaryGoals) && context1.goals.secondaryGoals.length === 0, "Secondary goals empty");

// Untangling verification
assert(context1.dietary.dietaryPattern === "Vegetarian", "Dietary pattern isolated from combined array");
assert(
  context1.dietary.cuisinePreferences.includes("South Indian") &&
  context1.dietary.cuisinePreferences.includes("Pan-Asian") &&
  context1.dietary.cuisinePreferences.includes("High-Protein Bowls"),
  "Cuisines correctly extracted"
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

console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
