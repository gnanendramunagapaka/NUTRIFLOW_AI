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
  productionEnvelopeAddresses?: any;
  menuEnvelope?: any;
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
      if (options?.productionEnvelopeAddresses) {
        return new Response(
          JSON.stringify(options.productionEnvelopeAddresses),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
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
      if (options?.menuEnvelope) {
        return new Response(JSON.stringify(options.menuEnvelope), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
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

// ─── Test 31: Regression: Production Swiggy MCP get_addresses Envelope Parsing ─
console.log("31. Testing Regression: Production Swiggy MCP get_addresses structuredContent Parsing");
const productionMcpAddressResponse = {
  jsonrpc: "2.0",
  id: 1727942800000,
  result: {
    content: [
      {
        type: "text",
        text: "Found 4 saved addresses (page 1 of 1, showing 4):\n1. [Home] Flat 101, Sunshine Apts, Indiranagar\n2. [Work] Tech Park, Building 3, Outer Ring Road\n3. [Other] House 12, Koramangala 4th Block\n4. [Home] Villa 7, Whitefield",
      },
    ],
    structuredContent: {
      addresses: [
        {
          id: "addr_prod_101",
          addressLine: "Flat 101, Sunshine Apts, Indiranagar",
          addressCategory: "Home",
          addressTag: "Home",
          phoneNumber: "9876543210",
          city: "Bengaluru",
          latitude: 12.9716,
          longitude: 77.5946,
        },
        {
          id: "addr_prod_102",
          addressLine: "Tech Park, Building 3, Outer Ring Road",
          addressCategory: "Work",
          addressTag: "Work",
          phoneNumber: "9876543210",
          city: "Bengaluru",
          latitude: 12.9352,
          longitude: 77.6946,
        },
        {
          id: "addr_prod_103",
          addressLine: "House 12, Koramangala 4th Block",
          addressCategory: "Other",
          addressTag: "Other",
          phoneNumber: "9876543210",
          city: "Bengaluru",
          latitude: 12.9345,
          longitude: 77.6265,
        },
        {
          id: "addr_prod_104",
          addressLine: "Villa 7, Whitefield",
          addressCategory: "Home",
          addressTag: "Home",
          phoneNumber: "9876543210",
          city: "Bengaluru",
          latitude: 12.9698,
          longitude: 77.75,
        },
      ],
      total: 4,
      resolution: {
        defaultAddressId: "addr_prod_101",
        needsUserClarification: true,
        candidateAddressIds: ["addr_prod_101", "addr_prod_102", "addr_prod_103", "addr_prod_104"],
      },
    },
  },
};

{
  // 1. Verify extractSwiggyMcpContent preserves structuredContent even when content[0].text is prose markdown
  const unwrapped: any = extractSwiggyMcpContent(productionMcpAddressResponse);
  assert(unwrapped && typeof unwrapped === "object", "Unwrapped content is object");
  assert(Array.isArray(unwrapped.addresses), "Unwrapped addresses array exists");
  assert(unwrapped.addresses.length === 4, "Extracted 4 addresses in structuredContent");

  // 2. Verify extractSwiggyAddresses extracts from production envelope directly
  const addrsFromRaw = extractSwiggyAddresses(productionMcpAddressResponse);
  assert(addrsFromRaw.length === 4, "Direct extraction found all 4 addresses");
  assert(addrsFromRaw[0].id === "addr_prod_101", "Preserves ID of first address");
  assert(addrsFromRaw[0].address === "Flat 101, Sunshine Apts, Indiranagar", "Maps addressLine to address");
  assert(addrsFromRaw[0].name === "Home", "Maps addressCategory/addressTag to name");
  assert(addrsFromRaw[0].city === "Bengaluru", "Preserves city");
  assert(addrsFromRaw[0].lat === 12.9716, "Preserves latitude");
  assert(addrsFromRaw[0].lng === 77.5946, "Preserves longitude");

  // 3. Verify extractSwiggyAddresses extracts from unwrapped structuredContent
  const addrsFromUnwrapped = extractSwiggyAddresses(unwrapped);
  assert(addrsFromUnwrapped.length === 4, "Extraction from unwrapped structuredContent found 4 addresses");
  console.log("   ✓ Production Swiggy MCP get_addresses response with markdown prose and structuredContent correctly parsed");
}

// ─── Test 32: Regression: Multiple Ambiguous Addresses Require Clarification ───
console.log("32. Testing Regression: Ambiguous multiple addresses trigger clarification");
{
  const addrs = extractSwiggyAddresses(productionMcpAddressResponse);
  // When no addressId is requested and needsUserClarification is true
  const resolved = resolveSwiggyAddress(addrs);
  assert(resolved.success === false, "Does not silently pick arbitrary address");
  assert(resolved.clarificationNeeded === true, "Clarification is flagged as true");
  assert(resolved.availableAddresses?.length === 4, "All 4 available addresses returned for user choice");
  console.log("   ✓ Multiple addresses with clarification flag correctly trigger clarification without guessing");
}

// ─── Test 33: Regression: Explicit addressId Resolves Successfully ────────────
console.log("33. Testing Regression: Explicit addressId selection from production addresses");
{
  const addrs = extractSwiggyAddresses(productionMcpAddressResponse);
  const resolved = resolveSwiggyAddress(addrs, "addr_prod_102");
  assert(resolved.success === true, "Explicit addressId resolved successfully");
  assert(resolved.address?.id === "addr_prod_102", "Matched exact requested address ID");
  assert(resolved.address?.name === "Work", "Matched address name");
  assert(resolved.clarificationNeeded === false, "Clarification not needed when explicit ID provided");
  console.log("   ✓ Explicit addressId correctly selects requested address from production MCP list");
}

// ─── Test 34: Regression: Zero Addresses Produces Controlled Error ────────────
console.log("34. Testing Regression: Zero addresses still produces controlled error");
{
  const resolved = resolveSwiggyAddress([]);
  assert(resolved.success === false, "Zero addresses yields failure");
  assert(resolved.clarificationNeeded === false, "Clarification is not triggered for empty list");
  assert(
    resolved.error === "No delivery addresses found on your Swiggy account. Please add an address on Swiggy.",
    "Exact error message returned"
  );
  console.log("   ✓ Zero addresses correctly produces controlled error without false positive behavior");
}

// ─── Test 35: Regression: End-to-End executeFoodRecommendation with Production Envelope
console.log("35. Testing Regression: executeFoodRecommendation with production MCP get_addresses envelope");
{
  const client = createMockMcpClient({
    productionEnvelopeAddresses: productionMcpAddressResponse,
  });

  // Flow A: Request WITHOUT addressId should return HTTP 200 with clarificationNeeded: true (TEST B scenario)
  const resClarify = await executeFoodRecommendation(
    mockProfileUser,
    { mode: "restaurants", query: "biryani" },
    { mcpClient: client, getTokenFn: async () => "valid_token" }
  );
  assert(resClarify.status === 200, "Ambiguous request returns HTTP 200 (not 400 error)");
  const clarifyData = resClarify.data as any;
  assert(clarifyData.clarificationNeeded === true, "Returns clarificationNeeded: true");
  assert(clarifyData.availableAddresses?.length === 4, "Returns 4 available addresses");
  assert(clarifyData.availableAddresses[0].id === "addr_prod_101", "First address ID matches");

  // Flow B: Request WITH explicit addressId should resolve and return HTTP 200 recommendations (TEST C scenario)
  const resWithAddress = await executeFoodRecommendation(
    mockProfileUser,
    { mode: "restaurants", query: "biryani", addressId: "addr_prod_102" },
    { mcpClient: client, getTokenFn: async () => "valid_token" }
  );
  assert(resWithAddress.status === 200, "Explicit addressId returns HTTP 200");
  const recData = resWithAddress.data as any;
  assert(recData.clarificationNeeded !== true, "Does not need clarification");
  assert(recData.addressUsed?.id === "addr_prod_102", "Used requested address addr_prod_102");
  assert(recData.recommendations.length > 0, "Returned food recommendations");

  console.log("   ✓ End-to-end recommendation flow handles production MCP envelope with both clarification and explicit address selection");
}

// ─── Test 36: Real Swiggy Image Fields Normalization into sourceMetadata.imageUrl
console.log("36. Testing Real Swiggy Image Fields Normalization (cloudinaryImageId, imageId, image, imageUrl)");
{
  const r1 = normalizeSwiggyFoodRestaurant({
    id: "rst_img_1",
    name: "Meghana Biryani",
    cloudinaryImageId: "fl_lossy,f_auto,q_auto/meghana_123",
  });
  assert(r1.sourceMetadata.imageUrl?.includes("meghana_123"), "Must normalize cloudinaryImageId into media CDN URL");

  const r2 = normalizeSwiggyFoodRestaurant({
    id: "rst_img_2",
    name: "Truffles",
    imageUrl: "https://media-assets.swiggy.com/swiggy/image/upload/truffles_456.jpg",
  });
  assert(r2.sourceMetadata.imageUrl === "https://media-assets.swiggy.com/swiggy/image/upload/truffles_456.jpg", "Must preserve full imageUrl");

  const r3 = normalizeSwiggyFoodRestaurant({
    id: "rst_img_3",
    name: "Corner House",
    imageId: "corner_789",
  });
  assert(r3.sourceMetadata.imageUrl?.includes("corner_789"), "Must normalize imageId");

  const r4 = normalizeSwiggyFoodRestaurant({
    id: "rst_img_4",
    name: "No Image Cafe",
  });
  assert(r4.sourceMetadata.imageUrl === undefined, "Missing image must honestly remain undefined without fabrication");

  console.log("   ✓ Real Swiggy restaurant image fields correctly normalized into sourceMetadata.imageUrl without fabrication");
}

// ─── Test 37: Menu Item Normalization Fidelity ─────────────────────────────────
console.log("37. Testing Menu Item Normalization Fidelity (names, prices, images, categories, no fake fallbacks)");
{
  // Test name extraction from various Swiggy candidate fields
  const names = [
    { input: { id: "m1", name: "Paneer Tikka" }, expected: "Paneer Tikka" },
    { input: { id: "m2", item_name: "Dal Makhani" }, expected: "Dal Makhani" },
    { input: { id: "m3", itemName: "Butter Naan" }, expected: "Butter Naan" },
    { input: { id: "m4", display_name: "Garlic Kulcha" }, expected: "Garlic Kulcha" },
    { input: { id: "m5", displayName: "Lassi" }, expected: "Lassi" },
    { input: { id: "m6", title: "Gulab Jamun" }, expected: "Gulab Jamun" },
    { input: { id: "m7", dish_name: "Rasmalai" }, expected: "Rasmalai" },
    { input: { id: "m8", dishName: "Kulfi" }, expected: "Kulfi" },
  ];
  for (const n of names) {
    const res = normalizeSwiggyFoodMenuItem(n.input);
    assert(res.name === n.expected, `Expected name '${n.expected}', got '${res.name}'`);
  }

  // Truly missing name must remain undefined, NEVER "Menu Item"
  const missingName = normalizeSwiggyFoodMenuItem({ id: "m_empty" });
  assert(missingName.name === undefined, "Missing name must remain undefined");
  assert(missingName.name !== "Menu Item", "Must NEVER generate 'Menu Item' fallback");

  // Price handling: paise vs rupees vs missing
  const p1 = normalizeSwiggyFoodMenuItem({ id: "p1", name: "Dish 1", price_in_paise: 25000 });
  assert(p1.price === 250, "price_in_paise must be converted to rupees (250)");

  const p2 = normalizeSwiggyFoodMenuItem({ id: "p2", name: "Dish 2", priceInPaise: 34000 });
  assert(p2.price === 340, "priceInPaise must be converted to rupees (340)");

  const p3 = normalizeSwiggyFoodMenuItem({ id: "p3", name: "Dish 3", price_in_paise: "38000" });
  assert(p3.price === 380, "string price_in_paise must be converted to rupees (380)");

  const p4 = normalizeSwiggyFoodMenuItem({ id: "p4", name: "Dish 4", price: 180 });
  assert(p4.price === 180, "price in rupees (180) must be preserved as 180");

  const p5 = normalizeSwiggyFoodMenuItem({ id: "p5", name: "Dish 5" });
  assert(p5.price === undefined, "Missing price must remain undefined without fake ₹0");

  // Images handling
  const img1 = normalizeSwiggyFoodMenuItem({ id: "img1", name: "Biryani", imageId: "biryani_cdn_123" });
  assert(img1.sourceMetadata.imageUrl?.includes("biryani_cdn_123"), "Must normalize imageId");

  const img2 = normalizeSwiggyFoodMenuItem({ id: "img2", name: "Biryani 2", cloudinaryImageId: "cloud_img_456" });
  assert(img2.sourceMetadata.imageUrl?.includes("cloud_img_456"), "Must normalize cloudinaryImageId");

  const img3 = normalizeSwiggyFoodMenuItem({ id: "img3", name: "Biryani 3" });
  assert(img3.sourceMetadata.imageUrl === undefined, "Missing image must remain undefined");

  // Category and description preservation
  const itemWithMeta = normalizeSwiggyFoodMenuItem({
    id: "item_meta",
    name: "Special Biryani",
    category: "Biryani Specials",
    description: "Slow cooked basmati rice with exotic spices.",
  });
  assert(itemWithMeta.categoryTags?.includes("Biryani Specials"), "Category must be in categoryTags");
  assert(itemWithMeta.sourceMetadata.category === "Biryani Specials", "Category must be in sourceMetadata");
  assert(itemWithMeta.sourceMetadata.description === "Slow cooked basmati rice with exotic spices.", "Description must be in sourceMetadata");

  console.log("   ✓ Menu item normalization fidelity verified: real names, prices, images, categories preserved without fabrication");
}

// ─── Test 38: Swiggy REGULAR envelope with ItemCategory, NestedItemCategory, and MenuCarousel ───
console.log("38. Testing Swiggy REGULAR envelope with ItemCategory, NestedItemCategory, and MenuCarousel");
{
  const productionMenuEnvelope = {
    cards: [
      {
        card: {
          card: {
            "@type": "type.googleapis.com/swiggy.presentation.food.v2.Restaurant",
            info: { id: "10575", name: "Meghana Foods" },
          },
        },
      },
      {
        groupedCard: {
          cardGroupMap: {
            REGULAR: {
              cards: [
                {
                  card: {
                    card: {
                      "@type": "type.googleapis.com/swiggy.presentation.food.v2.ItemCategory",
                      title: "Recommended",
                      itemCards: [
                        {
                          card: {
                            "@type": "type.googleapis.com/swiggy.presentation.food.v2.Dish",
                            info: {
                              id: "dish_101",
                              name: "Chicken Boneless Biryani",
                              description: "Signature biryani dish",
                              imageId: "meghana_chk_biryani",
                              price: 34000,
                              inStock: 1,
                              itemAttribute: { vegClassifier: "NONVEG" },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  card: {
                    card: {
                      "@type": "type.googleapis.com/swiggy.presentation.food.v2.NestedItemCategory",
                      title: "Starters",
                      categories: [
                        {
                          title: "Chicken Starters",
                          itemCards: [
                            {
                              card: {
                                info: {
                                  id: "dish_102",
                                  name: "Chilli Chicken",
                                  price: 28000,
                                  imageId: "chilli_chk_img",
                                  itemAttribute: { vegClassifier: "NONVEG" },
                                },
                              },
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
                {
                  card: {
                    card: {
                      "@type": "type.googleapis.com/swiggy.presentation.food.v2.MenuCarousel",
                      title: "Top Picks",
                      carousel: [
                        {
                          dish: {
                            info: {
                              id: "dish_103",
                              name: "Paneer 65",
                              price: 24000,
                              imageId: "paneer65_img",
                              itemAttribute: { vegClassifier: "VEG" },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      },
    ],
  };

  const extracted = extractFoodMenuItemsFromMcp(productionMenuEnvelope);
  assert(extracted.length === 3, `Expected 3 extracted menu items, got ${extracted.length}`);

  const item1 = extracted.find((it) => it.id === "dish_101");
  assert(item1 !== undefined, "Extracted dish_101 from ItemCategory");
  assert(item1?.name === "Chicken Boneless Biryani", "Preserved item name");
  assert(item1?.category === "Recommended", `Preserved category name 'Recommended', got '${item1?.category}'`);
  assert(item1?.imageId === "meghana_chk_biryani", "Preserved imageId");

  const item2 = extracted.find((it) => it.id === "dish_102");
  assert(item2 !== undefined, "Extracted dish_102 from NestedItemCategory");
  assert(item2?.name === "Chilli Chicken", "Preserved chilli chicken name");
  assert(item2?.category === "Chicken Starters", "Preserved nested category title");

  const item3 = extracted.find((it) => it.id === "dish_103");
  assert(item3 !== undefined, "Extracted dish_103 from MenuCarousel");
  assert(item3?.name === "Paneer 65", "Preserved paneer 65 name");
  assert(item3?.category === "Top Picks", "Preserved carousel category title");

  console.log("   ✓ Swiggy REGULAR envelope successfully extracted ItemCategory, NestedItemCategory, and MenuCarousel items with categories");
}

// ─── Test 39: Markdown Code-Fenced JSON and Substring JSON Parsing ─────────────
console.log("39. Testing Markdown Code-Fenced JSON Parsing in extractSwiggyMcpContent");
{
  const fencedEnvelope = {
    jsonrpc: "2.0",
    id: 12345,
    result: {
      content: [
        {
          type: "text",
          text: "```json\n{\n  \"menu\": [\n    {\n      \"title\": \"Main Course\",\n      \"items\": [\n        { \"id\": \"fenced_1\", \"name\": \"Butter Chicken\", \"price\": 320 }\n      ]\n    }\n  ]\n}\n```",
        },
      ],
    },
  };

  const content = extractSwiggyMcpContent(fencedEnvelope);
  assert(content !== undefined, "Unwrapped fenced envelope");
  const items = extractFoodMenuItemsFromMcp(content);
  assert(items.length === 1, `Expected 1 item from fenced JSON, got ${items.length}`);
  assert(items[0].id === "fenced_1", "Extracted fenced_1 item");
  assert(items[0].name === "Butter Chicken", "Preserved Butter Chicken name");
  assert(items[0].category === "Main Course", "Preserved Main Course category");

  console.log("   ✓ Markdown code-fenced JSON parsed successfully without throwing or dropping content");
}

// ─── Test 40: End-to-End executeFoodRecommendation in Mode 'menu' with GroupedCard ───
console.log("40. Testing End-to-End executeFoodRecommendation in Menu Mode with Prefix Stripping");
{
  const client = createMockMcpClient({
    menuEnvelope: {
      jsonrpc: "2.0",
      id: 999,
      result: {
        cards: [
          {
            groupedCard: {
              cardGroupMap: {
                REGULAR: {
                  cards: [
                    {
                      card: {
                        card: {
                          title: "Biryani",
                          itemCards: [
                            {
                              card: {
                                info: {
                                  id: "mcp_dish_501",
                                  name: "Special Mutton Biryani",
                                  price_in_paise: 45000,
                                  imageId: "mutton_biryani_img",
                                  description: "Tender mutton cooked in fragrant basmati rice.",
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    },
  });

  const profile = buildProfileContextFromProfile({
    dietary_preferences: ["non-vegetarian"],
    health_goals: ["maintenance"],
  });

  // Call with "food-rst-10575" to verify prefix stripping
  const res = await executeFoodRecommendation(
    { id: "usr_menu_1", profile },
    { mode: "menu", restaurantId: "food-rst-10575", addressId: "addr_home_1" },
    { mcpClient: client, getTokenFn: async () => "valid_token" }
  );

  assert(res.status === 200, `Expected status 200, got ${res.status}`);
  const data = res.data as any;
  assert(data.mode === "menu", "Response mode is 'menu'");
  assert(data.recommendations.length === 1, `Expected 1 recommendation, got ${data.recommendations.length}`);
  assert(data.restaurantInfo?.id === "10575", `Restaurant ID stripped prefix to '10575', got '${data.restaurantInfo?.id}'`);

  const rec = data.recommendations[0];
  assert(rec.candidate.name === "Special Mutton Biryani", `Dish name preserved, got: ${rec.candidate.name}`);
  assert(rec.candidate.price === 450, `Paise converted to rupees (450), got: ${rec.candidate.price}`);
  assert(rec.candidate.sourceMetadata.imageUrl?.includes("mutton_biryani_img"), "Dish image URL preserved in sourceMetadata");
  assert(rec.candidate.sourceMetadata.category === "Biryani", "Dish category preserved in sourceMetadata");
  assert(rec.candidate.sourceMetadata.description?.includes("Tender mutton"), "Dish description preserved in sourceMetadata");

  console.log("   ✓ End-to-end menu recommendation successfully extracted groupedCard menu with prefix stripping, prices, images, and categories");
}

// ─── Test 41: Strict Absence of Fake Food / Menu Fallbacks ─────────────────────
console.log("41. Testing Strict Absence of Fake Food / Menu Fallbacks");
{
  const missingData = normalizeSwiggyFoodMenuItem({
    id: "dish_missing_all",
  });
  assert(missingData.name === undefined, "Missing dish name must be undefined");
  assert(missingData.name !== "Menu Item", "Must NEVER output 'Menu Item'");
  assert(missingData.price === undefined, "Missing dish price must be undefined");
  assert(missingData.sourceMetadata.imageUrl === undefined, "Missing dish image must be undefined");

  console.log("   ✓ Strict absence of fake food/menu fallbacks verified: no 'Menu Item', no fake prices, no fake images");
}

console.log("\n==================================================================");
console.log("🎉 ALL 41 FOOD INTEGRATION TESTS PASSED SUCCESSFULLY!");
console.log("==================================================================\n");


