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
  extractSwiggyAddresses,
  resolveSwiggyAddress,
  extractSwiggyMcpContent,
  extractFoodRestaurantsFromMcp,
  extractFoodMenuItemsFromMcp,
  normalizeFoodRestaurantsBatch,
  normalizeFoodMenuItemsBatch,
  FoodRecommendationRequestSchema,
  FoodRecommendationResponseSchema,
} = await import("../lib/api-zod/src/foodRecommendations.ts");

const {
  FoodMcpClient,
  SwiggyAuthError,
  SwiggyMcpError,
} = await import("../artifacts/api-server/src/lib/foodMcpClient.ts");

const {
  executeFoodRecommendation,
} = await import("../artifacts/api-server/src/lib/foodRecommendationService.ts");

const {
  normalizeSwiggyFoodRestaurant,
  normalizeSwiggyFoodMenuItem,
} = await import("../lib/api-zod/src/swiggyAdapters.ts");

const {
  executeSharedRecommendation,
} = await import("../lib/api-zod/src/recommendationService.ts");

const {
  buildProfileContextFromProfile,
} = await import("../lib/api-zod/src/profileContext.ts");

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log("=== Running NutriFlow Phase 3 Part 2 Live Food Integration Tests ===\n");

// ─── Test Fixtures ─────────────────────────────────────────────────────────────

const mockProfileUser: any = {
  id: "usr_test_123",
  name: "Arjun Sharma",
  email: "arjun@example.com",
  swiggyUserId: "swiggy_usr_99",
  onboardingCompleted: true,
  age: 29,
  gender: "male",
  height: 178,
  weight: 74,
  activityLevel: "moderate",
  goal: "Muscle Gain",
  secondaryGoals: ["High Protein"],
  dietaryPreferences: ["High Protein"],
  allergies: ["peanuts"],
  dislikedFoods: ["bitter gourd"],
  cuisinePreferences: ["South Indian", "North Indian"],
  mealsPerDay: 3,
  cookingFrequency: "rarely",
  groceryBudget: "medium",
  wellnessScore: 82,
  streak: 5,
};

const vegetarianProfileUser: any = {
  ...mockProfileUser,
  id: "usr_test_veg",
  name: "Pooja Patel",
  dietaryPreferences: ["Vegetarian"],
};

const rawAddressList = [
  {
    id: "addr_home_1",
    name: "Home",
    address: "Flat 402, Green Meadows, HSR Layout",
    city: "Bengaluru",
    lat: 12.9121,
    lng: 77.6446,
    isDefault: true,
  },
  {
    id: "addr_work_2",
    name: "Office",
    address: "7th Floor, Tech Park, Bellandur",
    city: "Bengaluru",
    lat: 12.9304,
    lng: 77.6834,
    isDefault: false,
  },
];

const rawRestaurantList = [
  {
    id: "rst_101",
    name: "A2B - Adyar Ananda Bhavan",
    cuisines: ["South Indian", "Sweets"],
    avgRating: 4.4,
    costForTwo: 350,
    isOpen: true,
    isVeg: true,
    locality: "HSR Layout",
    distance: "1.8 km",
  },
  {
    id: "rst_102",
    name: "Meghana Foods",
    cuisines: ["Biryani", "Andhra", "North Indian"],
    avgRating: 4.6,
    costForTwo: 500,
    isOpen: true,
    isVeg: false,
    locality: "Koramangala",
    distance: "3.2 km",
  },
  {
    id: "rst_103",
    name: "The Bowl Company",
    cuisines: ["Healthy Food", "Bowls", "North Indian"],
    avgRating: 4.3,
    costForTwo: 400,
    isOpen: false,
    isVeg: false,
    locality: "HSR Layout",
    distance: "2.1 km",
  },
];

const rawMenuList = [
  {
    id: "item_201",
    name: "Ghee Podi Idli (2 pcs)",
    restaurantId: "rst_101",
    restaurantName: "A2B - Adyar Ananda Bhavan",
    price: 120,
    isVeg: true,
    inStock: true,
    category: "Breakfast",
    ingredients: ["rice", "urad dal", "ghee", "podi spices"],
  },
  {
    id: "item_202",
    name: "Peanut Chutney Special Thali",
    restaurantId: "rst_101",
    restaurantName: "A2B - Adyar Ananda Bhavan",
    price: 220,
    isVeg: true,
    inStock: true,
    category: "Thali",
    ingredients: ["rice", "sambar", "peanuts", "vegetables"],
    allergens: ["peanuts"],
  },
  {
    id: "item_203",
    name: "Meghana Special Chicken Biryani",
    restaurantId: "rst_102",
    restaurantName: "Meghana Foods",
    price: 360,
    isVeg: false,
    inStock: true,
    category: "Biryani",
    ingredients: ["chicken", "basmati rice", "spices"],
  },
];

// Helper to create a mock FoodMcpClient with in-memory responses
function createMockMcpClient(options?: {
  addresses?: any[];
  restaurants?: any[];
  menuItems?: any[];
  searchMenuItems?: any[];
  failStatus?: number;
  throwAuthError?: boolean;
  throwMcpError?: boolean;
}) {
  const customFetch: typeof fetch = async (url, init): Promise<Response> => {
    const urlStr = String(url);
    const bodyText = typeof init?.body === "string" ? init.body : "{}";
    const bodyJson = JSON.parse(bodyText);

    if (options?.throwAuthError || init?.headers?.["Authorization"] === "Bearer invalid_expired_token") {
      return new Response(JSON.stringify({ error: "invalid_token", error_description: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (options?.throwMcpError || options?.failStatus) {
      return new Response(JSON.stringify({ error: "Internal MCP server error" }), {
        status: options?.failStatus || 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Direct /get_addresses endpoint
    if (urlStr.endsWith("/get_addresses")) {
      return new Response(
        JSON.stringify({
          status: "success",
          addresses: options?.addresses ?? rawAddressList,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // JSON-RPC tools/call
    const toolName = bodyJson.params?.name;
    if (toolName === "get_addresses") {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: bodyJson.id,
          result: { content: [{ type: "text", text: JSON.stringify({ addresses: options?.addresses ?? rawAddressList }) }] },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (toolName === "search_restaurants") {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: bodyJson.id,
          result: { content: [{ type: "text", text: JSON.stringify({ restaurants: options?.restaurants ?? rawRestaurantList }) }] },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (toolName === "get_restaurant_menu") {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: bodyJson.id,
          result: { content: [{ type: "text", text: JSON.stringify({ items: options?.menuItems ?? rawMenuList }) }] },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (toolName === "search_menu") {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: bodyJson.id,
          result: { content: [{ type: "text", text: JSON.stringify({ items: options?.searchMenuItems ?? rawMenuList.slice(0, 1) }) }] },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown tool" }), { status: 404 });
  };

  return new FoodMcpClient({ fetchFn: customFetch });
}

// ─── Test 1: extractSwiggyAddresses ───────────────────────────────────────────
console.log("1. Testing extractSwiggyAddresses");
{
  const addrs = extractSwiggyAddresses({ addresses: rawAddressList });
  assert(addrs.length === 2, "Should extract 2 addresses");
  assert(addrs[0].id === "addr_home_1", "Preserves home address ID");
  assert(addrs[0].isDefault === true, "Preserves isDefault");
  assert(addrs[0].city === "Bengaluru", "Preserves city");
  assert(addrs[0].lat === 12.9121, "Preserves latitude");
  console.log("   ✓ Successfully extracts Swiggy addresses from raw structure");
}

// ─── Test 2: resolveSwiggyAddress with explicit ID ────────────────────────────
console.log("2. Testing resolveSwiggyAddress with explicit address ID");
{
  const addrs = extractSwiggyAddresses({ addresses: rawAddressList });
  const resolved = resolveSwiggyAddress(addrs, "addr_work_2");
  assert(resolved.success === true, "Should resolve requested address");
  assert(resolved.address?.id === "addr_work_2", "Resolved work address");
  assert(resolved.clarificationNeeded === false, "No clarification needed");
  console.log("   ✓ Explicit addressId resolved unambiguously");
}

// ─── Test 3: resolveSwiggyAddress auto-selection via default ──────────────────
console.log("3. Testing resolveSwiggyAddress auto-selection via default address");
{
  const addrs = extractSwiggyAddresses({ addresses: rawAddressList });
  const resolved = resolveSwiggyAddress(addrs);
  assert(resolved.success === true, "Auto-resolves default address");
  assert(resolved.address?.id === "addr_home_1", "Home address is marked default");
  assert(resolved.clarificationNeeded === false, "Clarification not needed when default exists");
  console.log("   ✓ Default address auto-resolved when no ID specified");
}

// ─── Test 4: resolveSwiggyAddress clarification when multiple non-default ─────
console.log("4. Testing resolveSwiggyAddress clarification prompt");
{
  const nonDefaultAddrs = rawAddressList.map((a) => ({ ...a, isDefault: false }));
  const resolved = resolveSwiggyAddress(nonDefaultAddrs);
  assert(resolved.success === false, "Should not arbitrarily pick an address");
  assert(resolved.clarificationNeeded === true, "Requires clarification");
  assert(resolved.availableAddresses?.length === 2, "Returns available addresses");
  console.log("   ✓ Preserves clarification behavior without arbitrary picking");
}

// ─── Test 5: resolveSwiggyAddress empty address list ──────────────────────────
console.log("5. Testing resolveSwiggyAddress with empty list");
{
  const resolved = resolveSwiggyAddress([]);
  assert(resolved.success === false, "Fails gracefully with no addresses");
  assert(resolved.clarificationNeeded === false, "No clarification if empty");
  assert(typeof resolved.error === "string", "Returns meaningful error");
  console.log("   ✓ Gracefully handles accounts without addresses");
}

// ─── Test 6: MCP content extraction (MCP standard text block) ─────────────────
console.log("6. Testing extractSwiggyMcpContent");
{
  const mcpEnvelope = {
    jsonrpc: "2.0",
    id: 1234,
    result: {
      content: [
        {
          type: "text",
          text: JSON.stringify({ restaurants: rawRestaurantList }),
        },
      ],
    },
  };
  const unwrapped: any = extractSwiggyMcpContent(mcpEnvelope);
  assert(Array.isArray(unwrapped.restaurants), "Unwraps content text JSON");
  assert(unwrapped.restaurants.length === 3, "Contains 3 restaurants");
  console.log("   ✓ Standard MCP text-wrapped JSON correctly unpacked");
}

// ─── Test 7: Batch Restaurant Normalization ───────────────────────────────────
console.log("7. Testing normalizeFoodRestaurantsBatch");
{
  const normalized = normalizeFoodRestaurantsBatch(rawRestaurantList);
  assert(normalized.length === 3, "Normalized 3 restaurants");
  assert(normalized[0].domain === "food", "Domain is food");
  assert(normalized[0].id === "food-rst-rst_101", "ID is prefixed canonically");
  assert(normalized[0].name === "A2B - Adyar Ananda Bhavan", "Name preserved");
  assert(normalized[0].price === 350, "Cost for two mapped to price");
  assert(normalized[0].availability === "available", "Open restaurant is available");
  assert(normalized[2].availability === "unavailable", "Closed restaurant is unavailable");
  assert(normalized[0].sourceMetadata?.restaurantId === "rst_101", "Source metadata preserved");
  console.log("   ✓ Batch restaurant normalization succeeds without data loss");
}

// ─── Test 8: Batch Menu Items Normalization ───────────────────────────────────
console.log("8. Testing normalizeFoodMenuItemsBatch");
{
  const normalized = normalizeFoodMenuItemsBatch(rawMenuList);
  assert(normalized.length === 3, "Normalized 3 menu items");
  assert(normalized[0].domain === "food", "Domain is food");
  assert(normalized[0].id === "food-item-item_201", "Item ID canonically prefixed");
  assert(normalized[0].price === 120, "Price preserved");
  assert(normalized[0].safetyData.allergens === undefined, "Item 201 has no allergens");
  assert(normalized[1].safetyData.allergens?.[0] === "peanuts", "Item 202 preserves peanut allergen");
  assert(normalized[0].safetyData.dietaryClassification?.vegetarian === true, "Item 201 is veg");
  assert(normalized[2].safetyData.dietaryClassification?.vegetarian === false, "Item 203 is non-veg");
  console.log("   ✓ Batch menu items normalization preserves explicit fields");
}

// ─── Test 9: FoodMcpClient searchRestaurants ──────────────────────────────────
console.log("9. Testing FoodMcpClient searchRestaurants");
{
  const client = createMockMcpClient();
  const res = await client.searchRestaurants("dummy_token", { query: "biryani", address_id: "addr_home_1" });
  assert(res.length === 3, "Returns 3 raw restaurants");
  assert(res[1].name === "Meghana Foods", "Found Meghana Foods");
  console.log("   ✓ FoodMcpClient invokes search_restaurants cleanly");
}

// ─── Test 10: FoodMcpClient getRestaurantMenu ─────────────────────────────────
console.log("10. Testing FoodMcpClient getRestaurantMenu");
{
  const client = createMockMcpClient();
  const res = await client.getRestaurantMenu("dummy_token", { restaurant_id: "rst_101" });
  assert(res.length === 3, "Returns 3 raw menu items");
  assert(res[0].id === "item_201", "Item ID preserved");
  console.log("   ✓ FoodMcpClient invokes get_restaurant_menu cleanly");
}

// ─── Test 11: FoodMcpClient searchMenu ────────────────────────────────────────
console.log("11. Testing FoodMcpClient searchMenu");
{
  const client = createMockMcpClient();
  const res = await client.searchMenu("dummy_token", { query: "idli", restaurant_id: "rst_101" });
  assert(res.length === 1, "Returns filtered search menu item");
  assert(res[0].name === "Ghee Podi Idli (2 pcs)", "Item matched");
  console.log("   ✓ FoodMcpClient invokes search_menu cleanly");
}

// ─── Test 12: End-to-End Restaurant Flow with Personalization ─────────────────
console.log("12. Testing End-to-End Restaurant Flow through Shared Recommendation Service");
{
  const client = createMockMcpClient();
  const profileContext = buildProfileContextFromProfile(mockProfileUser);

  const rawRsts = await client.searchRestaurants("token", { query: "Indian" });
  const candidates = normalizeFoodRestaurantsBatch(rawRsts);

  const result = executeSharedRecommendation(profileContext, {
    domain: "food",
    candidates,
  });

  assert(result.domain === "food", "Domain is food");
  assert(result.recommendations.length > 0, "Returns ranked recommendations");
  assert(result.metadata.totalCandidates === 3, "Evaluated all 3 candidates");
  // Closed restaurant should be ranked lower or handled per availability rules
  const firstRec = result.recommendations[0];
  assert(firstRec.candidate.id.startsWith("food-rst-"), "Candidate is a food restaurant");
  console.log(`   ✓ Ranked ${result.recommendations.length} restaurants. Top: ${firstRec.candidate.name}`);
}

// ─── Test 13: Vegetarian Safety Filtering on Menu Items ───────────────────────
console.log("13. Testing Vegetarian Safety Filtering on Menu Items");
{
  const client = createMockMcpClient();
  const vegProfileContext = buildProfileContextFromProfile(vegetarianProfileUser);

  const rawMenu = await client.getRestaurantMenu("token", { restaurant_id: "rst_101" });
  const candidates = normalizeFoodMenuItemsBatch(rawMenu);

  const result = executeSharedRecommendation(vegProfileContext, {
    domain: "food",
    candidates,
  });

  // Meghana Chicken Biryani (item_203) MUST be excluded for vegetarian user!
  const chickenItem = result.excludedCandidates.find((c) => c.candidate.id === "food-item-item_203");
  assert(chickenItem !== undefined, "Non-vegetarian chicken biryani must be excluded for vegetarian user");
  assert(chickenItem?.eligibility === "ineligible", "Chicken item is marked ineligible");
  assert(chickenItem?.exclusionReasonCodes.includes("DIETARY_MISMATCH"), "Reason code is DIETARY_MISMATCH");

  // Vegetarian items should be eligible (unless excluded for allergy)
  const vegEligible = result.recommendations.find((r) => r.candidate.id === "food-item-item_201");
  assert(vegEligible !== undefined, "Vegetarian Idli is eligible and recommended");
  console.log("   ✓ Non-vegetarian food candidate strictly excluded for vegetarian profile");
}

// ─── Test 14: Allergy Safety Filtering (Peanut allergy) ───────────────────────
console.log("14. Testing Peanut Allergy Safety Filtering");
{
  const client = createMockMcpClient();
  const profileContext = buildProfileContextFromProfile(mockProfileUser); // Has "peanuts" allergy

  const rawMenu = await client.getRestaurantMenu("token", { restaurant_id: "rst_101" });
  const candidates = normalizeFoodMenuItemsBatch(rawMenu);

  const result = executeSharedRecommendation(profileContext, {
    domain: "food",
    candidates,
  });

  // Item 202 contains "peanuts" allergen!
  const peanutItem = result.excludedCandidates.find((c) => c.candidate.id === "food-item-item_202");
  assert(peanutItem !== undefined, "Peanut thali must be excluded for user with peanut allergy");
  assert(peanutItem?.eligibility === "ineligible", "Peanut thali is marked ineligible");
  assert(peanutItem?.exclusionReasonCodes.includes("ALLERGEN_MATCH"), "Reason code is ALLERGEN_MATCH");
  console.log("   ✓ Peanut-containing candidate strictly excluded by safety rules");
}


// ─── Test 15: Empty Swiggy Restaurant Search Results ──────────────────────────
console.log("15. Testing Empty Swiggy Restaurant Search Results");
{
  const client = createMockMcpClient({ restaurants: [] });
  const rawRsts = await client.searchRestaurants("token", { query: "nonexistent_food" });
  const candidates = normalizeFoodRestaurantsBatch(rawRsts);

  const profileContext = buildProfileContextFromProfile(mockProfileUser);
  const result = executeSharedRecommendation(profileContext, {
    domain: "food",
    candidates,
  });

  assert(result.recommendations.length === 0, "No recommendations fabricated");
  assert(result.excludedCandidates.length === 0, "No exclusions");
  assert(result.metadata.totalCandidates === 0, "Total candidates is 0");
  assert(result.metadata.rankedCount === 0, "Ranked count is 0");
  console.log("   ✓ Empty search returns controlled zero-candidate result without fabricating data");
}

// ─── Test 16: Upstream Swiggy 401 Auth Error Handling ─────────────────────────
console.log("16. Testing Upstream Swiggy 401 Auth Error Handling");
{
  const client = createMockMcpClient({ throwAuthError: true });
  let caughtAuthError = false;
  try {
    await client.searchRestaurants("invalid_token", { query: "biryani" });
  } catch (err: any) {
    if (err instanceof SwiggyAuthError && err.requiresReauth) {
      caughtAuthError = true;
    }
  }
  assert(caughtAuthError, "Throws SwiggyAuthError with requiresReauth=true");
  console.log("   ✓ Upstream 401 triggers controlled SwiggyAuthError");
}

// ─── Test 17: Upstream Swiggy 502/500 MCP Error Handling ──────────────────────
console.log("17. Testing Upstream Swiggy 502 MCP Error Handling");
{
  const client = createMockMcpClient({ throwMcpError: true, failStatus: 502 });
  let caughtMcpError = false;
  try {
    await client.searchRestaurants("token", { query: "biryani" });
  } catch (err: any) {
    if (err instanceof SwiggyMcpError && err.status === 502) {
      caughtMcpError = true;
    }
  }
  assert(caughtMcpError, "Throws SwiggyMcpError with status 502");
  console.log("   ✓ Upstream failure throws controlled SwiggyMcpError without fabricating data");
}

// ─── Test 18: No Token Exposure in Output ─────────────────────────────────────
console.log("18. Testing Security: No Token Exposure in Output");
{
  const fakeToken = "secret_bearer_token_xyz_998877";
  const client = createMockMcpClient();
  const rawRsts = await client.searchRestaurants(fakeToken, { query: "biryani" });
  const candidates = normalizeFoodRestaurantsBatch(rawRsts);

  const profileContext = buildProfileContextFromProfile(mockProfileUser);
  const result = executeSharedRecommendation(profileContext, {
    domain: "food",
    candidates,
  });

  const outputString = JSON.stringify(result);
  assert(!outputString.includes("secret_bearer_token"), "Token must never appear in recommendation output");
  assert(!outputString.includes("Bearer"), "Bearer header must never leak");
  console.log("   ✓ Output is completely free of tokens and credentials");
}

// ─── Test 19: Food Request & Response Schema Validation ───────────────────────
console.log("19. Testing Food Recommendation Schemas");
{
  const validRequest = FoodRecommendationRequestSchema.parse({
    mode: "restaurants",
    query: "biryani",
    addressId: "addr_home_1",
    currentRequest: {
      craving: "biryani",
      mealOccasion: "dinner",
    },
    limit: 10,
  });
  assert(validRequest.mode === "restaurants", "Request schema validates mode");

  const validResponse = FoodRecommendationResponseSchema.parse({
    domain: "food",
    mode: "restaurants",
    addressUsed: {
      id: "addr_home_1",
      name: "Home",
      address: "123 Tech Park",
      city: "Bengaluru",
      isDefault: true,
    },
    recommendations: [],
    excludedCandidates: [],
    metadata: {
      totalCandidates: 0,
      rankedCount: 0,
      excludedCount: 0,
      returnedCount: 0,
    },
  });
  assert(validResponse.domain === "food", "Response schema validates domain");
  console.log("   ✓ Zod request and response schemas validate successfully");
}

// ─── Test 20: Deterministic Output Ranking ────────────────────────────────────
console.log("20. Testing Deterministic Output Ranking");
{
  const client = createMockMcpClient();
  const profileContext = buildProfileContextFromProfile(mockProfileUser);

  const rawRsts = await client.searchRestaurants("token", { query: "Indian" });
  const candidates = normalizeFoodRestaurantsBatch(rawRsts);

  const run1 = executeSharedRecommendation(profileContext, { domain: "food", candidates });
  const run2 = executeSharedRecommendation(profileContext, { domain: "food", candidates });

  assert(
    JSON.stringify(run1.recommendations.map((r) => r.candidate.id)) ===
    JSON.stringify(run2.recommendations.map((r) => r.candidate.id)),
    "Subsequent runs must produce identical ranking order"
  );
  console.log("   ✓ Recommendation ranking is 100% deterministic");
}

// ─── Test 21: Real Swiggy Food MCP Network Reachability ───────────────────────
console.log("21. Testing Real Production Swiggy Food MCP Endpoint Reachability");
{
  try {
    const liveRes = await fetch("https://mcp.swiggy.com/food", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/list",
        params: {},
      }),
    });

    assert(
      liveRes.status === 401 || liveRes.status === 200,
      `Real Swiggy Food MCP responded with HTTP ${liveRes.status}`
    );
    const bodyText = await liveRes.text();
    // Live endpoint returns 401 {"error": "invalid_token"} when called without a valid Bearer token
    assert(
      bodyText.includes("invalid_token") || bodyText.includes("jsonrpc") || bodyText.includes("tools"),
      "Response confirms real Swiggy MCP server interaction"
    );
    console.log(`   ✓ Live Swiggy Food MCP endpoint verified (Status: ${liveRes.status}, Response: ${bodyText.slice(0, 80)}...)`);
  } catch (netErr: any) {
    console.warn("   ⚠️ Live network call skipped due to environment connectivity:", netErr?.message);
  }
}

// ─── Test 22: Domain Isolation ────────────────────────────────────────────────
console.log("22. Testing Domain Isolation: Food Only");
{
  const rawRsts = normalizeFoodRestaurantsBatch(rawRestaurantList);
  for (const c of rawRsts) {
    assert(c.domain === "food", "Candidate domain must strictly be food");
    assert(c.sourceMetadata?.domain === "food", "Source metadata domain must be food");
    assert(c.sourceMetadata?.spinId === undefined, "Instamart spinId must not exist on food candidate");
    assert(c.sourceMetadata?.availableSlots === undefined, "Dineout slots must not exist on food candidate");
  }
  console.log("   ✓ Food candidates strictly isolated from Instamart and Dineout domains");
}

// ─── Test 23: executeFoodRecommendation Missing Token (401) ───────────────────
console.log("23. Testing executeFoodRecommendation Missing Token Handling");
{
  const client = createMockMcpClient();
  const res = await executeFoodRecommendation(
    mockProfileUser,
    { mode: "restaurants" },
    { mcpClient: client, getTokenFn: async () => null }
  );
  assert(res.status === 401, "Missing token returns 401 status");
  assert((res.data as any).requires_reauth === true, "Requires reauth flag is set");
  console.log("   ✓ Missing Swiggy token returns controlled 401 requires_reauth");
}

// ─── Test 24: executeFoodRecommendation Address Clarification ─────────────────
console.log("24. Testing executeFoodRecommendation Address Clarification Flow");
{
  const nonDefaultAddrs = rawAddressList.map((a) => ({ ...a, isDefault: false }));
  const client = createMockMcpClient({ addresses: nonDefaultAddrs });
  const res = await executeFoodRecommendation(
    mockProfileUser,
    { mode: "restaurants" },
    { mcpClient: client, getTokenFn: async () => "valid_token" }
  );
  assert(res.status === 200, "Returns 200 with clarification response");
  assert((res.data as any).clarificationNeeded === true, "Clarification needed flag is true");
  assert((res.data as any).availableAddresses?.length === 2, "Returns available addresses");
  assert((res.data as any).recommendations.length === 0, "No recommendations returned before clarification");
  console.log("   ✓ Ambiguous addresses trigger clarification response instead of arbitrary selection");
}

// ─── Test 25: executeFoodRecommendation Restaurants Mode Success ───────────────
console.log("25. Testing executeFoodRecommendation Restaurants Mode Success");
{
  const client = createMockMcpClient();
  const res = await executeFoodRecommendation(
    mockProfileUser,
    { mode: "restaurants", query: "South Indian" },
    { mcpClient: client, getTokenFn: async () => "valid_token" }
  );
  assert(res.status === 200, "Returns 200 success");
  const data = res.data as any;
  assert(data.domain === "food", "Domain is food");
  assert(data.mode === "restaurants", "Mode is restaurants");
  assert(data.addressUsed?.id === "addr_home_1", "Used default address");
  assert(data.recommendations.length > 0, "Returned ranked recommendations");
  assert(data.recommendations[0].candidate.id.startsWith("food-rst-"), "Candidate is a restaurant");
  console.log(`   ✓ Returned ${data.recommendations.length} ranked restaurant recommendations`);
}

// ─── Test 26: executeFoodRecommendation Menu Mode Success ─────────────────────
console.log("26. Testing executeFoodRecommendation Menu Mode Success");
{
  const client = createMockMcpClient();
  const res = await executeFoodRecommendation(
    mockProfileUser,
    { mode: "menu", restaurantId: "rst_101" },
    { mcpClient: client, getTokenFn: async () => "valid_token" }
  );
  assert(res.status === 200, "Returns 200 success");
  const data = res.data as any;
  assert(data.mode === "menu", "Mode is menu");
  assert(data.restaurantInfo?.id === "rst_101", "Preserves restaurantId");
  assert(data.recommendations.length > 0, "Returned menu recommendations");
  assert(data.recommendations[0].candidate.id.startsWith("food-item-"), "Candidate is a menu item");
  console.log(`   ✓ Returned ${data.recommendations.length} menu items for restaurant rst_101`);
}

// ─── Test 27: executeFoodRecommendation Search Menu Mode ──────────────────────
console.log("27. Testing executeFoodRecommendation Search Menu Mode");
{
  const client = createMockMcpClient();
  const res = await executeFoodRecommendation(
    mockProfileUser,
    { mode: "menu", restaurantId: "rst_101", query: "idli" },
    { mcpClient: client, getTokenFn: async () => "valid_token" }
  );
  assert(res.status === 200, "Returns 200 success");
  const data = res.data as any;
  assert(data.recommendations.length === 1, "Returns filtered menu item");
  assert(data.recommendations[0].candidate.name.includes("Idli"), "Found Idli");
  console.log("   ✓ Search menu mode queries search_menu tool and ranks result");
}

// ─── Test 28: executeFoodRecommendation Empty Search Results ──────────────────
console.log("28. Testing executeFoodRecommendation Empty Swiggy Search Results");
{
  const client = createMockMcpClient({ restaurants: [] });
  const res = await executeFoodRecommendation(
    mockProfileUser,
    { mode: "restaurants", query: "xyz123abc" },
    { mcpClient: client, getTokenFn: async () => "valid_token" }
  );
  assert(res.status === 200, "Returns 200 success");
  const data = res.data as any;
  assert(data.recommendations.length === 0, "Zero recommendations fabricated");
  assert(data.metadata.totalCandidates === 0, "Total candidates is 0");
  console.log("   ✓ Empty Swiggy response yields controlled zero-recommendation result");
}

// ─── Test 29: executeFoodRecommendation Swiggy Token Expiry (401) ─────────────
console.log("29. Testing executeFoodRecommendation Swiggy Token Expiry");
{
  const client = createMockMcpClient({ throwAuthError: true });
  const res = await executeFoodRecommendation(
    mockProfileUser,
    { mode: "restaurants" },
    { mcpClient: client, getTokenFn: async () => "expired_token" }
  );
  assert(res.status === 401, "Expired token returns 401");
  assert((res.data as any).requires_reauth === true, "Requires reauth flag is true");
  console.log("   ✓ Upstream 401 converts to controlled 401 requires_reauth");
}

// ─── Test 30: executeFoodRecommendation Swiggy MCP 502 Error ──────────────────
console.log("30. Testing executeFoodRecommendation Swiggy MCP 502 Error");
{
  const client = createMockMcpClient({ throwMcpError: true, failStatus: 502 });
  const res = await executeFoodRecommendation(
    mockProfileUser,
    { mode: "restaurants" },
    { mcpClient: client, getTokenFn: async () => "valid_token" }
  );
  assert(res.status === 502, "Upstream error returns 502");
  assert(typeof (res.data as any).error === "string", "Returns meaningful error message");
  console.log("   ✓ Upstream MCP outage returns controlled 502 without data fabrication");
}

console.log("\n==================================================================");
console.log("🎉 ALL 30 FOOD INTEGRATION TESTS PASSED SUCCESSFULLY!");
console.log("==================================================================\n");

