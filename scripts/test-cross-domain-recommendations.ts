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
      const indexTs = path.join(target, 'index.ts');
      if (fs.existsSync(indexTs)) {
        return nextResolve(pathToFileURL(indexTs).href, context);
      }
      const indexJs = path.join(target, 'index.js');
      if (fs.existsSync(indexJs)) {
        return nextResolve(pathToFileURL(indexJs).href, context);
      }
    }
  }
  return nextResolve(specifier, context);
}
`;

register(`data:text/javascript,${encodeURIComponent(hookCode)}`, pathToFileURL(import.meta.filename).href);

const {
  executeSharedRecommendation,
  RecommendationRequestSchema,
  RecommendationResponseSchema,
  FoodRecommendationResponseSchema,
  InstamartRecommendationResponseSchema,
  DineoutRecommendationResponseSchema,
  normalizeSwiggyFoodRestaurant,
  normalizeSwiggyFoodMenuItem,
  normalizeSwiggyInstamartProduct,
  normalizeSwiggyDineoutRestaurant,
  buildProfileContextFromProfile,
  buildCurrentRequestContext,
  evaluateCandidateEligibility,
  evaluateCandidateMatch,
  rankCandidates,
} = await import("../lib/api-zod/src/index.ts");

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log("=== Running NutriFlow Phase 3 Part 5 Cross-Domain Recommendation Tests ===\n");

// ─── Test Fixtures ─────────────────────────────────────────────────────────────

const mockUserProfile: any = {
  id: "usr_cross_domain_1",
  name: "Ananya Iyer",
  email: "ananya@example.com",
  swiggyUserId: "swiggy_usr_ananya",
  onboardingCompleted: true,
  age: 28,
  gender: "female",
  height: 168,
  weight: 62,
  activityLevel: "moderate",
  goal: "Weight Loss",
  secondaryGoals: ["High Fiber"],
  dietaryPreferences: ["Vegetarian", "South Indian", "North Indian"],
  allergies: ["peanuts"],
  dislikedFoods: ["mushrooms"],
  cuisinePreferences: ["South Indian", "North Indian"],
  wellnessScore: 84,
  streak: 12,
};

const profileContext = buildProfileContextFromProfile(mockUserProfile);

// Food Raw Fixture
const rawFoodRestaurant = {
  id: "rst_food_101",
  name: "Adyar Ananda Bhavan",
  cuisines: ["South Indian"],
  avgRating: 4.5,
  costForTwo: 350,
  isOpen: true,
  isVeg: true,
  locality: "Koramangala",
};

const rawFoodMenuItem = {
  id: "item_food_201",
  name: "Masala Dosa with Chutney",
  restaurantId: "rst_food_101",
  restaurantName: "Adyar Ananda Bhavan",
  price: 110,
  isVeg: true,
  inStock: true,
  category: "Breakfast",
  ingredients: ["rice", "urad dal", "potatoes", "spices"],
};

const rawFoodPeanutItem = {
  id: "item_food_peanut",
  name: "Peanut Chutney Thali",
  restaurantId: "rst_food_101",
  price: 180,
  isVeg: true,
  inStock: true,
  allergens: ["peanuts"],
  ingredients: ["peanuts", "rice", "sambar"],
};

// Instamart Raw Fixture
const rawInstamartProduct = {
  id: "im_prod_301",
  name: "Saffola Oats 1kg",
  brand: "Saffola",
  price: 180,
  mrp: 210,
  inStock: true,
  category: "Breakfast & Cereals",
  spin_id: "spin_saffola_1kg",
  quantity: "1 kg",
  rating: 4.6,
  isVeg: true,
  tags: ["High Fiber", "Breakfast"],
};

const rawInstamartPeanutProduct = {
  id: "im_prod_peanut",
  name: "Roasted Salted Peanuts 200g",
  brand: "Tong Garden",
  price: 90,
  mrp: 100,
  inStock: true,
  category: "Snacks",
  spin_id: "spin_peanut_200g",
  allergens: ["peanuts"],
  ingredients: ["peanuts", "salt", "oil"],
  isVeg: true,
};

// Dineout Raw Fixture
const rawDineoutRestaurant = {
  id: "dine_rst_401",
  name: "Gramin - Vegetarian Rural Dining",
  cuisine: ["North Indian", "Homestyle"],
  avg_rating: 4.6,
  costForTwo: 800,
  isOpen: true,
  isVeg: true,
  locality: "Koramangala 7th Block",
  distance: "1.8 km",
  offers: ["10% off total bill"],
  availableSlots: ["19:30", "20:00", "20:30"],
};

const rawDineoutNonVegRestaurant = {
  id: "dine_rst_nonveg",
  name: "Empire Restaurant",
  cuisine: ["North Indian", "Mughlai", "Biryani"],
  avg_rating: 4.2,
  costForTwo: 900,
  isOpen: true,
  isVeg: false,
  locality: "Koramangala",
};

let passedCount = 0;
function test(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    try {
      await fn();
      passedCount++;
      console.log(`  ✓ Test ${passedCount}: ${name}`);
    } catch (err: any) {
      console.error(`  ✗ Test FAILED: ${name}`);
      console.error(err);
      process.exit(1);
    }
  })();
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

await test("1. Food candidate enters shared recommendation service", () => {
  const normFood = normalizeSwiggyFoodRestaurant(rawFoodRestaurant);
  const result = executeSharedRecommendation(profileContext, {
    domain: "food",
    candidates: [normFood],
  });

  assert(result.domain === "food", "Result domain must be food");
  assert(result.recommendations.length === 1, "Food candidate must be recommended");
  assert(result.recommendations[0].candidate.id === "food-rst-rst_food_101", "ID must match Food candidate");
});

await test("2. Instamart candidate enters shared recommendation service", () => {
  const normIm = normalizeSwiggyInstamartProduct(rawInstamartProduct);
  const result = executeSharedRecommendation(profileContext, {
    domain: "instamart",
    candidates: [normIm],
  });

  assert(result.domain === "instamart", "Result domain must be instamart");
  assert(result.recommendations.length === 1, "Instamart candidate must be recommended");
  assert(result.recommendations[0].candidate.id === "insta-prod-im_prod_301", "ID must match Instamart candidate");
});

await test("3. Dineout candidate enters shared recommendation service", () => {
  const normDine = normalizeSwiggyDineoutRestaurant(rawDineoutRestaurant);
  const result = executeSharedRecommendation(profileContext, {
    domain: "dineout",
    candidates: [normDine],
  });

  assert(result.domain === "dineout", "Result domain must be dineout");
  assert(result.recommendations.length === 1, "Dineout candidate must be recommended");
  assert(result.recommendations[0].candidate.id === "dine-rst-dine_rst_401", "ID must match Dineout candidate");
});

await test("4. Domain is strictly preserved in candidate and response", () => {
  const foodCand = normalizeSwiggyFoodMenuItem(rawFoodMenuItem);
  const imCand = normalizeSwiggyInstamartProduct(rawInstamartProduct);
  const dineCand = normalizeSwiggyDineoutRestaurant(rawDineoutRestaurant);

  assert(foodCand.domain === "food", "Food candidate domain must be food");
  assert(imCand.domain === "instamart", "Instamart candidate domain must be instamart");
  assert(dineCand.domain === "dineout", "Dineout candidate domain must be dineout");

  const foodRes = executeSharedRecommendation(profileContext, { domain: "food", candidates: [foodCand] });
  const imRes = executeSharedRecommendation(profileContext, { domain: "instamart", candidates: [imCand] });
  const dineRes = executeSharedRecommendation(profileContext, { domain: "dineout", candidates: [dineCand] });

  assert(foodRes.domain === "food", "Food response domain must be food");
  assert(imRes.domain === "instamart", "Instamart response domain must be instamart");
  assert(dineRes.domain === "dineout", "Dineout response domain must be dineout");
});

await test("5. Safety filtering remains consistent across domains", () => {
  // Ananya is allergic to peanuts and is strictly Vegetarian.
  const foodPeanut = normalizeSwiggyFoodMenuItem(rawFoodPeanutItem);
  const imPeanut = normalizeSwiggyInstamartProduct(rawInstamartPeanutProduct);
  const dineNonVeg = normalizeSwiggyDineoutRestaurant(rawDineoutNonVegRestaurant);

  const foodRes = executeSharedRecommendation(profileContext, { domain: "food", candidates: [foodPeanut] });
  const imRes = executeSharedRecommendation(profileContext, { domain: "instamart", candidates: [imPeanut] });
  const dineRes = executeSharedRecommendation(profileContext, { domain: "dineout", candidates: [dineNonVeg] });

  // All must be excluded by safety rules
  assert(foodRes.recommendations.length === 0, "Food peanut item must not be recommended");
  assert(foodRes.excludedCandidates.length === 1, "Food peanut item must be in excludedCandidates");
  assert(foodRes.excludedCandidates[0].exclusionReasonCodes.includes("ALLERGEN_MATCH"), "Exclusion reason must be ALLERGEN_MATCH");

  assert(imRes.recommendations.length === 0, "Instamart peanut product must not be recommended");
  assert(imRes.excludedCandidates.length === 1, "Instamart peanut product must be in excludedCandidates");
  assert(imRes.excludedCandidates[0].exclusionReasonCodes.includes("ALLERGEN_MATCH"), "Exclusion reason must be ALLERGEN_MATCH");

  assert(dineRes.recommendations.length === 0, "Dineout non-veg restaurant must not be recommended for vegetarian");
  assert(dineRes.excludedCandidates.length === 1, "Dineout non-veg restaurant must be in excludedCandidates");
  assert(dineRes.excludedCandidates[0].exclusionReasonCodes.includes("DIETARY_MISMATCH"), "Exclusion reason must be DIETARY_MISMATCH");
});

await test("6. Preference matching remains consistent across domains", () => {
  // Candidate matching preferred South Indian cuisine
  const normFood = normalizeSwiggyFoodRestaurant(rawFoodRestaurant);
  const matchFood = evaluateCandidateMatch(profileContext, normFood.matchData);
  assert(matchFood.cuisineMatch === "positive", "Preferred cuisine must yield positive match in Food");

  // Dineout matching preferred North Indian cuisine
  const normDine = normalizeSwiggyDineoutRestaurant(rawDineoutRestaurant);
  const matchDine = evaluateCandidateMatch(profileContext, normDine.matchData);
  assert(matchDine.cuisineMatch === "positive", "Preferred cuisine must yield positive match in Dineout");
});

await test("7. Ranking remains deterministic across domains", () => {
  const normFood = normalizeSwiggyFoodRestaurant(rawFoodRestaurant);
  const normIm = normalizeSwiggyInstamartProduct(rawInstamartProduct);
  const normDine = normalizeSwiggyDineoutRestaurant(rawDineoutRestaurant);

  const res1 = executeSharedRecommendation(profileContext, { domain: "food", candidates: [normFood] });
  const res2 = executeSharedRecommendation(profileContext, { domain: "food", candidates: [normFood] });
  assert(JSON.stringify(res1) === JSON.stringify(res2), "Food recommendation must be 100% deterministic");

  const resIm1 = executeSharedRecommendation(profileContext, { domain: "instamart", candidates: [normIm] });
  const resIm2 = executeSharedRecommendation(profileContext, { domain: "instamart", candidates: [normIm] });
  assert(JSON.stringify(resIm1) === JSON.stringify(resIm2), "Instamart recommendation must be 100% deterministic");

  const resDine1 = executeSharedRecommendation(profileContext, { domain: "dineout", candidates: [normDine] });
  const resDine2 = executeSharedRecommendation(profileContext, { domain: "dineout", candidates: [normDine] });
  assert(JSON.stringify(resDine1) === JSON.stringify(resDine2), "Dineout recommendation must be 100% deterministic");
});

await test("8. Limits remain respected across domains", () => {
  const cands = [
    normalizeSwiggyInstamartProduct({ id: "p1", name: "Item 1", price: 10 }),
    normalizeSwiggyInstamartProduct({ id: "p2", name: "Item 2", price: 20 }),
    normalizeSwiggyInstamartProduct({ id: "p3", name: "Item 3", price: 30 }),
  ];

  const result = executeSharedRecommendation(profileContext, {
    domain: "instamart",
    candidates: cands,
    limit: 2,
  });

  assert(result.recommendations.length === 2, "Limit 2 must be strictly respected");
  assert(result.metadata.totalCandidates === 3, "totalCandidates must reflect input count");
  assert(result.metadata.returnedCount === 2, "returnedCount must be 2");
});

await test("9. Missing fields do not create false positives", () => {
  const bareCand = normalizeSwiggyDineoutRestaurant({ id: "bare_dine_99" });
  const match = evaluateCandidateMatch(profileContext, bareCand.matchData);

  assert(match.cuisineMatch === "unknown", "Missing cuisine must remain unknown");
  assert(match.goalMatch === "unknown", "Missing goal data must remain unknown");
});

await test("10. Unknown safety data remains unknown across domains", () => {
  // If candidate has no dietary/allergen info and user is vegetarian
  const unkSafetyCand = {
    id: "unk_1",
    name: "Mysterious Dish",
    domain: "food" as const,
    dietaryClassification: undefined,
    allergens: undefined,
    ingredients: undefined,
    safetyDataSource: "swiggy_food_menu" as const,
  };

  const safetyResult = evaluateCandidateEligibility(profileContext, unkSafetyCand);
  assert(safetyResult.status === "unknown", "Candidate without data must be UNKNOWN, not ELIGIBLE");
  assert(safetyResult.reasons.some((r) => r.severity === "unknown"), "Must flag unknown severity");
});

await test("11. No token leakage across any domain response", () => {
  const sensitiveToken = "SWIGGY_AUTH_BEARER_SECRET_TOKEN_XYZ_123";

  // Simulate responses from all 3 domains
  const foodRes = executeSharedRecommendation(profileContext, {
    domain: "food",
    candidates: [normalizeSwiggyFoodRestaurant(rawFoodRestaurant)],
  });
  const imRes = executeSharedRecommendation(profileContext, {
    domain: "instamart",
    candidates: [normalizeSwiggyInstamartProduct(rawInstamartProduct)],
  });
  const dineRes = executeSharedRecommendation(profileContext, {
    domain: "dineout",
    candidates: [normalizeSwiggyDineoutRestaurant(rawDineoutRestaurant)],
  });

  for (const res of [foodRes, imRes, dineRes]) {
    const jsonStr = JSON.stringify(res);
    assert(!jsonStr.includes("token"), "Response must not contain 'token'");
    assert(!jsonStr.includes("secret"), "Response must not contain 'secret'");
    assert(!jsonStr.includes(sensitiveToken), "Response must not contain sensitive bearer token");
  }
});

await test("12. Current request context remains ephemeral across all domains", () => {
  const profileBefore = JSON.stringify(profileContext);

  const reqFood = buildCurrentRequestContext({ craving: "Biryani", budget: "high" });
  const reqIm = buildCurrentRequestContext({ craving: "Ice Cream", budget: "low", mealType: "snack" });
  const reqDine = buildCurrentRequestContext({ craving: "Buffet", partySize: 6 });

  executeSharedRecommendation(profileContext, {
    domain: "food",
    currentRequest: reqFood,
    candidates: [normalizeSwiggyFoodRestaurant(rawFoodRestaurant)],
  });

  executeSharedRecommendation(profileContext, {
    domain: "instamart",
    currentRequest: reqIm,
    candidates: [normalizeSwiggyInstamartProduct(rawInstamartProduct)],
  });

  executeSharedRecommendation(profileContext, {
    domain: "dineout",
    currentRequest: reqDine,
    candidates: [normalizeSwiggyDineoutRestaurant(rawDineoutRestaurant)],
  });

  const profileAfter = JSON.stringify(profileContext);
  assert(profileBefore === profileAfter, "ProfileContext MUST NOT be mutated by ephemeral request context");
});

await test("13. Domain-specific data does not contaminate another domain", () => {
  // Food candidate cannot be sent under Instamart domain without strict schema validation
  const foodCand = normalizeSwiggyFoodRestaurant(rawFoodRestaurant);
  const imCand = normalizeSwiggyInstamartProduct(rawInstamartProduct);
  const dineCand = normalizeSwiggyDineoutRestaurant(rawDineoutRestaurant);

  assert(foodCand.domain === "food", "Food candidate must be food domain");
  assert(imCand.domain === "instamart", "Instamart candidate must be instamart domain");
  assert(dineCand.domain === "dineout", "Dineout candidate must be dineout domain");

  // Category tags check
  assert(foodCand.categoryTags === undefined || !foodCand.categoryTags.includes("dineout_restaurant"), "Food candidate must not have dineout tags");
  assert(dineCand.categoryTags?.includes("dineout_restaurant"), "Dineout candidate has explicit dineout tag");
  assert(imCand.categoryTags?.includes("Breakfast & Cereals"), "Instamart candidate has grocery category");
});

await test("14. Absence of structured nutrition in Dineout does not get promoted to health claims", () => {
  const dineCand = normalizeSwiggyDineoutRestaurant(rawDineoutRestaurant);
  assert(dineCand.safetyData.allergens === undefined, "Allergens must be undefined");
  assert(dineCand.safetyData.ingredients === undefined, "Ingredients must be undefined");
  assert(dineCand.matchData.goalSignals === undefined, "Goal signals must be undefined");

  const result = executeSharedRecommendation(profileContext, {
    domain: "dineout",
    candidates: [dineCand],
  });

  const topRec = result.recommendations[0];
  const signals = topRec.candidate.matchResult.signals;
  assert(!signals.some((s) => s.type === "goal" && s.code === "GOAL_ALIGNMENT"), "Must not invent GOAL_ALIGNMENT for Dineout without structured data");
});

await test("15. Response schemas validate with 100% adherence across all three domains", () => {
  const foodRes = {
    ...executeSharedRecommendation(profileContext, { domain: "food", candidates: [normalizeSwiggyFoodRestaurant(rawFoodRestaurant)] }),
    mode: "restaurants" as const,
    addressUsed: { id: "addr_1", name: "Home" },
  };
  const parsedFood = FoodRecommendationResponseSchema.safeParse(foodRes);
  assert(parsedFood.success === true, `Food schema failure: ${JSON.stringify((parsedFood as any).error?.errors)}`);

  const imRes = {
    ...executeSharedRecommendation(profileContext, { domain: "instamart", candidates: [normalizeSwiggyInstamartProduct(rawInstamartProduct)] }),
    addressUsed: { id: "addr_1", name: "Home" },
  };
  const parsedIm = InstamartRecommendationResponseSchema.safeParse(imRes);
  assert(parsedIm.success === true, `Instamart schema failure: ${JSON.stringify((parsedIm as any).error?.errors)}`);

  const dineRes = {
    ...executeSharedRecommendation(profileContext, { domain: "dineout", candidates: [normalizeSwiggyDineoutRestaurant(rawDineoutRestaurant)] }),
    locationUsed: { id: "loc_1", name: "Koramangala" },
  };
  const parsedDine = DineoutRecommendationResponseSchema.safeParse(dineRes);
  assert(parsedDine.success === true, `Dineout schema failure: ${JSON.stringify((parsedDine as any).error?.errors)}`);
});

await test("16. Disliked food penalty applies across domains without becoming safety violation", () => {
  // Ananya dislikes mushrooms
  const profileWithDisliked = {
    ...profileContext,
    dietary: {
      ...profileContext.dietary,
      dislikedFoods: ["mushrooms"],
    },
  };

  const mushroomItem = normalizeSwiggyFoodMenuItem({
    id: "item_mush_1",
    name: "Mushroom Masala",
    restaurantId: "rst_food_101",
    price: 150,
    isVeg: true,
    inStock: true,
    ingredients: ["mushrooms", "onion", "spices"],
  });

  const mushroomProduct = normalizeSwiggyInstamartProduct({
    id: "im_mush_1",
    name: "Fresh Button Mushrooms 200g",
    brand: "Fresh Produce",
    price: 50,
    inStock: true,
    isVeg: true,
    tags: ["mushrooms"],
  });

  const resFood = executeSharedRecommendation(profileWithDisliked, { domain: "food", candidates: [mushroomItem] });
  const resIm = executeSharedRecommendation(profileWithDisliked, { domain: "instamart", candidates: [mushroomProduct] });

  // Must NOT be in excludedCandidates (safety violation)
  assert(resFood.excludedCandidates.length === 0, "Disliked food must NOT be in excludedCandidates for Food");
  assert(resIm.excludedCandidates.length === 0, "Disliked food must NOT be in excludedCandidates for Instamart");

  // Must have negative/penalty signal in matchResult
  assert(resFood.recommendations[0].candidate.matchResult.dislikedFoodMatch === "negative", "Must have dislikedFoodMatch: negative in Food");
  assert(resIm.recommendations[0].candidate.matchResult.dislikedFoodMatch === "negative", "Must have dislikedFoodMatch: negative in Instamart");
});

await test("17. Contextual budget sensitivity applies when candidate price is supplied", () => {
  const cheapItem = normalizeSwiggyInstamartProduct({ id: "p_cheap", name: "Bread", price: 30 });
  const expensiveItem = normalizeSwiggyInstamartProduct({ id: "p_exp", name: "Premium Saffron", price: 1200 });

  const lowBudgetReq = buildCurrentRequestContext({ budget: "low" });
  const result = executeSharedRecommendation(profileContext, {
    domain: "instamart",
    currentRequest: lowBudgetReq,
    candidates: [expensiveItem, cheapItem],
  });

  // Cheap item must rank higher than expensive item under low budget
  assert(result.recommendations[0].candidate.id === "insta-prod-p_cheap", "Cheaper item must rank first when user requests low budget");
});

await test("18. Simultaneous multi-domain recommendation for same user produces isolated results", () => {
  const foodCand = normalizeSwiggyFoodRestaurant(rawFoodRestaurant);
  const imCand = normalizeSwiggyInstamartProduct(rawInstamartProduct);
  const dineCand = normalizeSwiggyDineoutRestaurant(rawDineoutRestaurant);

  const [foodRes, imRes, dineRes] = [
    executeSharedRecommendation(profileContext, { domain: "food", candidates: [foodCand] }),
    executeSharedRecommendation(profileContext, { domain: "instamart", candidates: [imCand] }),
    executeSharedRecommendation(profileContext, { domain: "dineout", candidates: [dineCand] }),
  ];

  assert(foodRes.domain === "food" && foodRes.recommendations[0].candidate.id === "food-rst-rst_food_101", "Food isolated");
  assert(imRes.domain === "instamart" && imRes.recommendations[0].candidate.id === "insta-prod-im_prod_301", "Instamart isolated");
  assert(dineRes.domain === "dineout" && dineRes.recommendations[0].candidate.id === "dine-rst-dine_rst_401", "Dineout isolated");
});

await test("19. Rejection of invalid domain at the shared service boundary", () => {
  let threw = false;
  try {
    RecommendationRequestSchema.parse({
      domain: "travel", // Invalid domain
      candidates: [],
    });
  } catch {
    threw = true;
  }
  assert(threw === true, "Must throw Zod validation error for unsupported domain");
});

await test("20. Shared ranking tie-breaking is identical and deterministic", () => {
  const candA = normalizeSwiggyInstamartProduct({ id: "item_a", name: "Item A", price: 50, rating: 4.5 });
  const candB = normalizeSwiggyInstamartProduct({ id: "item_b", name: "Item B", price: 50, rating: 4.5 });

  const res1 = executeSharedRecommendation(profileContext, { domain: "instamart", candidates: [candA, candB] });
  const res2 = executeSharedRecommendation(profileContext, { domain: "instamart", candidates: [candB, candA] });

  // Deterministic order regardless of input permutation
  const order1 = res1.recommendations.map((r) => r.candidate.id).join(",");
  const order2 = res2.recommendations.map((r) => r.candidate.id).join(",");
  assert(order1 === order2, `Tie-breaking must produce identical order regardless of input array order: ${order1} vs ${order2}`);
});

console.log(`\n🎉 All ${passedCount} Cross-Domain Recommendation Integration tests passed successfully!\n`);
