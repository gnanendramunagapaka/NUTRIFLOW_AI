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
  extractDineoutLocations,
  resolveDineoutLocation,
  extractSwiggyMcpContent,
  extractDineoutRestaurantsFromMcp,
  parseDineoutRestaurantsFromText,
  normalizeDineoutRestaurantsBatch,
  DineoutRecommendationRequestSchema,
  DineoutRecommendationResponseSchema,
} = await import("../lib/api-zod/src/dineoutRecommendations.ts");

const {
  DineoutMcpClient,
  SwiggyAuthError,
  SwiggyMcpError,
} = await import("../artifacts/api-server/src/lib/dineoutMcpClient.ts");

const {
  executeDineoutRecommendation,
} = await import("../artifacts/api-server/src/lib/dineoutRecommendationService.ts");

const {
  normalizeSwiggyDineoutRestaurant,
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

console.log("=== Running NutriFlow Phase 3 Part 4 Live Dineout Integration Tests ===\n");

// ─── Test Fixtures ─────────────────────────────────────────────────────────────

const mockProfileUser: any = {
  id: "usr_test_dineout_1",
  name: "Vikram Malhotra",
  email: "vikram@example.com",
  swiggyUserId: "swiggy_usr_dineout_1",
  onboardingCompleted: true,
  age: 32,
  gender: "male",
  height: 180,
  weight: 78,
  activityLevel: "moderate",
  goal: "Maintenance",
  secondaryGoals: ["Heart Health"],
  dietaryPreferences: ["High Protein"],
  allergies: [],
  dislikedFoods: ["bitter gourd"],
  cuisinePreferences: ["North Indian", "Mughlai", "Biryani"],
  wellnessScore: 80,
  streak: 10,
};

const rawLocationList = [
  {
    id: "loc_dine_koramangala",
    name: "Koramangala 5th Block",
    address: "100ft Road, Koramangala 5th Block",
    city: "Bengaluru",
    lat: 12.9352,
    lng: 77.6245,
    isDefault: true,
  },
  {
    id: "loc_dine_indiranagar",
    name: "Indiranagar 100ft Rd",
    address: "12th Main, Indiranagar",
    city: "Bengaluru",
    lat: 12.9719,
    lng: 77.6412,
    isDefault: false,
  },
];

const rawRestaurantList = [
  {
    id: "dine_101",
    name: "Punjab Grill",
    cuisine: ["North Indian", "Mughlai"],
    avg_rating: 4.7,
    costForTwo: 2200,
    isOpen: true,
    isVeg: false,
    locality: "Koramangala",
    distance: "1.2 km",
    offers: ["20% off with Dineout Pay", "Complimentary Dessert"],
    availableSlots: ["19:00", "19:30", "20:00", "20:30"],
  },
  {
    id: "dine_102",
    name: "Sattvam - Pure Vegetarian Fine Dining",
    cuisine: ["North Indian", "South Indian", "Sattvic"],
    avg_rating: 4.6,
    costForTwo: 1400,
    isOpen: true,
    isVeg: true,
    locality: "Sadashivanagar",
    distance: "5.4 km",
    offers: ["15% off buffet"],
    availableSlots: ["12:30", "13:00", "19:30", "20:00"],
  },
  {
    id: "dine_103",
    name: "Toscano",
    cuisine: ["Italian", "Pizza", "Pasta"],
    avg_rating: 4.5,
    costForTwo: 1800,
    isOpen: false,
    isVeg: false,
    locality: "UB City",
    distance: "4.1 km",
    offers: "1+1 on selected wines",
  },
];

// Helper to create mock DineoutMcpClient
function createMockDineoutMcpClient(options?: {
  locations?: any[];
  restaurants?: any[];
  failStatus?: number;
  throwAuthError?: boolean;
  throwMcpError?: boolean;
  captureLastRequest?: (url: string, headers: any, body: any) => void;
  productionEnvelope?: any;
}) {
  const customFetch: typeof fetch = async (url, init): Promise<Response> => {
    const urlStr = String(url);
    const bodyText = typeof init?.body === "string" ? init.body : "{}";
    const bodyJson = JSON.parse(bodyText);

    if (options?.captureLastRequest) {
      options.captureLastRequest(urlStr, init?.headers, bodyJson);
    }

    if (options?.throwAuthError || (init?.headers as any)?.["Authorization"] === "Bearer invalid_expired_token") {
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

    // Direct /get_saved_locations endpoint
    if (urlStr.endsWith("/get_saved_locations")) {
      return new Response(
        JSON.stringify({
          status: "success",
          locations: options?.locations ?? rawLocationList,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // JSON-RPC tools/call
    const toolName = bodyJson?.params?.name;
    const toolArgs = bodyJson?.params?.arguments;

    if (toolName === "get_saved_locations") {
      if (options?.productionEnvelope) {
        return new Response(JSON.stringify(options.productionEnvelope), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: bodyJson.id,
          result: {
            structuredContent: {
              locations: options?.locations ?? rawLocationList,
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (toolName === "search_restaurants_dineout") {
      if (options?.productionEnvelope) {
        return new Response(JSON.stringify(options.productionEnvelope), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: bodyJson.id,
          result: {
            structuredContent: {
              restaurants: options?.restaurants ?? rawRestaurantList,
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (toolName === "get_restaurant_details") {
      const rest = (options?.restaurants ?? rawRestaurantList).find((r) => r.id === toolArgs?.restaurant_id) || rawRestaurantList[0];
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: bodyJson.id,
          result: {
            structuredContent: {
              restaurant: rest,
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (toolName === "get_available_slots") {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: bodyJson.id,
          result: {
            structuredContent: {
              slots: ["19:00", "19:30", "20:00", "20:30"],
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: `Unknown tool: ${toolName}` }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  };

  return new DineoutMcpClient({ fetchFn: customFetch });
}

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

await test("1. Dineout MCP request construction", async () => {
  let capturedUrl = "";
  let capturedHeaders: any = {};
  let capturedBody: any = {};

  const client = createMockDineoutMcpClient({
    captureLastRequest: (url, headers, body) => {
      capturedUrl = url;
      capturedHeaders = headers;
      capturedBody = body;
    },
  });

  await client.searchRestaurantsDineout("secret_dineout_token", {
    query: "buffet",
    location_id: "loc_123",
    lat: 12.93,
    lng: 77.62,
  });

  assert(capturedUrl === "https://mcp.swiggy.com/dineout", "Target URL must be Dineout MCP URL");
  assert(capturedBody.jsonrpc === "2.0", "JSON-RPC 2.0 version required");
  assert(capturedBody.method === "tools/call", "Method must be tools/call");
  assert(capturedBody.params.name === "search_restaurants_dineout", "Tool name must be search_restaurants_dineout");
  assert(capturedBody.params.arguments.query === "buffet", "Query argument must match");
  assert(capturedBody.params.arguments.location_id === "loc_123", "location_id argument must match");
  assert(capturedBody.params.arguments.locationId === "loc_123", "locationId argument must match");
});

await test("2. Correct Dineout service routing", async () => {
  let capturedUrl = "";
  const client = createMockDineoutMcpClient({
    captureLastRequest: (url) => {
      capturedUrl = url;
    },
  });

  await client.getSavedLocations("valid_token");
  assert(capturedUrl === "https://mcp.swiggy.com/dineout", "Must route to https://mcp.swiggy.com/dineout");
});

await test("3. Required Accept header", async () => {
  let capturedHeaders: any = {};
  const client = createMockDineoutMcpClient({
    captureLastRequest: (_url, headers) => {
      capturedHeaders = headers;
    },
  });

  await client.searchRestaurantsDineout("valid_token", { query: "italian" });
  assert(
    capturedHeaders["Accept"] === "application/json, text/event-stream",
    `Accept header must be "application/json, text/event-stream", got ${capturedHeaders["Accept"]}`
  );
  assert(
    capturedHeaders["Content-Type"] === "application/json",
    "Content-Type header must be application/json"
  );
  assert(
    capturedHeaders["Authorization"] === "Bearer valid_token",
    "Authorization header must be Bearer token"
  );
});

await test("4. JSON-RPC tools/call structure", async () => {
  let capturedBody: any = {};
  const client = createMockDineoutMcpClient({
    captureLastRequest: (_url, _headers, body) => {
      capturedBody = body;
    },
  });

  await client.getSavedLocations("valid_token");
  assert(capturedBody.jsonrpc === "2.0", "Must have jsonrpc: 2.0");
  assert(typeof capturedBody.id === "number", "Must have numeric message id");
  assert(capturedBody.method === "tools/call", "Must specify tools/call");
  assert(capturedBody.params?.name === "get_saved_locations", "Must call get_saved_locations tool");
});

await test("5. structuredContent extraction", () => {
  const mcpPayload = {
    result: {
      structuredContent: {
        restaurants: [
          { id: "d1", name: "Barbeque Nation", costForTwo: 1600 },
          { id: "d2", name: "Mainland China", costForTwo: 1800 },
        ],
      },
    },
  };

  const content = extractSwiggyMcpContent(mcpPayload);
  const restaurants = extractDineoutRestaurantsFromMcp(content);
  assert(restaurants.length === 2, "Should extract exactly 2 restaurants");
  assert(restaurants[0].id === "d1" && restaurants[0].name === "Barbeque Nation", "First restaurant mismatch");
  assert(restaurants[1].id === "d2" && restaurants[1].name === "Mainland China", "Second restaurant mismatch");
});

await test("6. content + structuredContent response handling", () => {
  const mcpPayload = {
    result: {
      content: [
        {
          type: "text",
          text: "Here are popular dining restaurants in Koramangala:",
        },
      ],
      structuredContent: {
        restaurants: [
          { id: "d_prose_1", name: "Chili's Grill & Bar", costForTwo: 2000, isOpen: true },
        ],
      },
    },
  };

  const content = extractSwiggyMcpContent(mcpPayload);
  const restaurants = extractDineoutRestaurantsFromMcp(content);
  assert(restaurants.length === 1, "Must not discard structuredContent when content[0].text is prose");
  assert(restaurants[0].name === "Chili's Grill & Bar", "Restaurant name mismatch");
});

await test("7. Saved-location extraction", () => {
  const rawEnvelope = {
    result: {
      structuredContent: {
        locations: [
          {
            id: "loc_1",
            title: "Indiranagar",
            address_line: "100ft Road, Indiranagar",
            city: "Bengaluru",
            latitude: 12.9719,
            longitude: 77.6412,
            is_default: 1,
          },
        ],
      },
    },
  };

  const locations = extractDineoutLocations(rawEnvelope);
  assert(locations.length === 1, "Should extract 1 location");
  assert(locations[0].id === "loc_1", "Location ID mismatch");
  assert(locations[0].name === "Indiranagar", "Location name mismatch");
  assert(locations[0].lat === 12.9719, "Latitude mismatch");
  assert(locations[0].lng === 77.6412, "Longitude mismatch");
  assert(locations[0].isDefault === true, "Default status mismatch");
});

await test("8. Explicit location selection", () => {
  const resExplicit = resolveDineoutLocation(rawLocationList, "loc_dine_indiranagar");
  assert(resExplicit.success === true, "Explicit location selection must succeed");
  assert(resExplicit.location?.id === "loc_dine_indiranagar", "Must select requested location");

  const resNonExistent = resolveDineoutLocation(rawLocationList, "loc_invalid_999");
  assert(resNonExistent.success === false, "Non-existent location must fail");
  assert(resNonExistent.clarificationNeeded === true, "Must flag clarificationNeeded");
});

await test("9. Single-location behavior", () => {
  const single = [{ id: "loc_single", name: "Whitefield" }];
  const res = resolveDineoutLocation(single);
  assert(res.success === true, "Single location must succeed automatically");
  assert(res.location?.id === "loc_single", "Selected location ID must match");
});

await test("10. Multiple-location clarification", () => {
  const ambiguous = [
    { id: "loc_a", name: "Location A", isDefault: false },
    { id: "loc_b", name: "Location B", isDefault: false },
  ];

  const res = resolveDineoutLocation(ambiguous);
  assert(res.success === false, "Ambiguous locations must not auto-select");
  assert(res.clarificationNeeded === true, "clarificationNeeded must be true");
  assert(res.availableLocations?.length === 2, "availableLocations must contain choices");
});

await test("11. No-location handling", () => {
  const res = resolveDineoutLocation([]);
  assert(res.success === false, "Empty locations must fail");
  assert(res.clarificationNeeded === false, "clarificationNeeded must be false when 0 locations");
  assert(typeof res.error === "string" && res.error.includes("No saved locations"), "Must return clear error");
});

await test("12. Restaurant normalization", () => {
  const raw = {
    id: "raw_dine_1",
    name: "Copper Chimney",
    cuisine: ["North Indian", "Mughlai"],
    avg_rating: 4.5,
    costForTwo: 1600,
    isOpen: true,
    isVeg: false,
    locality: "Indiranagar",
    distance: "2.5 km",
  };

  const normalized = normalizeSwiggyDineoutRestaurant(raw);
  assert(normalized.id === "dine-rst-raw_dine_1", "ID must be prefixed with dine-rst-");
  assert(normalized.name === "Copper Chimney", "Name must match");
  assert(normalized.domain === "dineout", "Domain must be dineout");
  assert(normalized.availability === "available", "Availability must be available");
  assert(normalized.price === 1600, "Price must match costForTwo");
  assert(normalized.sourceMetadata.locality === "Indiranagar", "Locality must match");
  assert(normalized.sourceMetadata.distance === "2.5 km", "Distance must match");
});

await test("13. Cuisine preservation", () => {
  const raw = {
    id: "dine_c1",
    name: "Farzi Cafe",
    cuisine: ["Modern Indian", "Tapas", "Fusion"],
  };

  const normalized = normalizeSwiggyDineoutRestaurant(raw);
  assert(Array.isArray(normalized.matchData.cuisineTags), "Cuisine tags must be an array");
  assert(normalized.matchData.cuisineTags?.includes("Modern Indian"), "Must preserve Modern Indian");
  assert(normalized.matchData.cuisineTags?.includes("Tapas"), "Must preserve Tapas");
  assert(normalized.matchData.cuisineTags?.includes("Fusion"), "Must preserve Fusion");
});

await test("14. Rating preservation", () => {
  const raw = {
    id: "dine_r1",
    name: "The Fatty Bao",
    avg_rating: 4.6,
  };

  const normalized = normalizeSwiggyDineoutRestaurant(raw);
  assert(normalized.sourceMetadata.rating === 4.6, "Rating 4.6 must be preserved");
});

await test("15. Cost-for-two preservation", () => {
  const raw = {
    id: "dine_c2",
    name: "Windmills Craftworks",
    cost_for_two: 2500,
  };

  const normalized = normalizeSwiggyDineoutRestaurant(raw);
  assert(normalized.price === 2500, "price must match cost_for_two");
  assert(normalized.sourceMetadata.costForTwo === 2500, "costForTwo must be preserved in sourceMetadata");
});

await test("16. Distance/locality preservation", () => {
  const raw = {
    id: "dine_loc1",
    name: "Smoke House Deli",
    locality: "Lavelle Road",
    distance: "3.8 km",
  };

  const normalized = normalizeSwiggyDineoutRestaurant(raw);
  assert(normalized.sourceMetadata.locality === "Lavelle Road", "Locality must match");
  assert(normalized.sourceMetadata.distance === "3.8 km", "Distance must match");
});

await test("17. Offers/slots metadata preservation", () => {
  const raw = {
    id: "dine_slots1",
    name: "Mamagoto",
    offers: ["20% off bill"],
    availableSlots: ["20:00", "20:30"],
  };

  const normalized = normalizeSwiggyDineoutRestaurant(raw);
  assert(Array.isArray(normalized.sourceMetadata.offers), "Offers must be an array");
  assert(normalized.sourceMetadata.offers?.[0] === "20% off bill", "Offer text must match");
  assert(Array.isArray(normalized.sourceMetadata.availableSlots), "Slots must be an array");
  assert(normalized.sourceMetadata.availableSlots?.includes("20:00"), "Must preserve 20:00 slot");
});

await test("18. Missing optional fields", () => {
  const bare = {
    id: "bare_dine_1",
  };

  const normalized = normalizeSwiggyDineoutRestaurant(bare);
  assert(normalized.id === "dine-rst-bare_dine_1", "ID must be prefixed");
  assert(normalized.name === "Dineout Venue", "Default name must match");
  assert(normalized.price === undefined, "Price must be undefined");
  assert(normalized.availability === undefined, "Availability must be undefined");
  assert(normalized.matchData.cuisineTags === undefined, "Cuisine tags must be undefined");
});

await test("19. Authenticated endpoint execution", async () => {
  const client = createMockDineoutMcpClient();
  const result = await executeDineoutRecommendation(
    mockProfileUser,
    { query: "north indian" },
    {
      mcpClient: client,
      getTokenFn: async () => "valid_token_123",
    }
  );

  assert(result.status === 200, `Expected status 200, got ${result.status}`);
  const data = result.data as any;
  assert(data.domain === "dineout", "Domain must be dineout");
  assert(data.locationUsed?.id === "loc_dine_koramangala", "Location used must match default location");
  assert(Array.isArray(data.recommendations), "Recommendations must be an array");
  assert(data.recommendations.length > 0, "Must have recommendations");
  assert(DineoutRecommendationResponseSchema.safeParse(data).success, "Response must conform to schema");
});

await test("20. Unauthenticated request / missing token", async () => {
  const client = createMockDineoutMcpClient();
  const result = await executeDineoutRecommendation(
    mockProfileUser,
    { query: "north indian" },
    {
      mcpClient: client,
      getTokenFn: async () => null,
    }
  );

  assert(result.status === 401, `Expected status 401, got ${result.status}`);
  const data = result.data as any;
  assert(data.requires_reauth === true, "Must flag requires_reauth");
});

await test("21. Missing/expired token handling", async () => {
  const client = createMockDineoutMcpClient({ throwAuthError: true });
  const result = await executeDineoutRecommendation(
    mockProfileUser,
    { query: "north indian" },
    {
      mcpClient: client,
      getTokenFn: async () => "invalid_expired_token",
    }
  );

  assert(result.status === 401, `Expected status 401 on expired token, got ${result.status}`);
  const data = result.data as any;
  assert(data.requires_reauth === true, "Must flag requires_reauth on upstream 401");
});

await test("22. Upstream MCP errors", async () => {
  const client = createMockDineoutMcpClient({ failStatus: 502 });
  const result = await executeDineoutRecommendation(
    mockProfileUser,
    { query: "north indian" },
    {
      mcpClient: client,
      getTokenFn: async () => "valid_token",
    }
  );

  assert(result.status === 502, `Expected status 502, got ${result.status}`);
  const data = result.data as any;
  assert(typeof data.error === "string", "Error must be string");
  assert(!JSON.stringify(data).includes("valid_token"), "Must not leak user token");
});

await test("23. Empty search results", async () => {
  const client = createMockDineoutMcpClient({ restaurants: [] });
  const result = await executeDineoutRecommendation(
    mockProfileUser,
    { query: "antarctic_ice_cream_cafe" },
    {
      mcpClient: client,
      getTokenFn: async () => "valid_token",
    }
  );

  assert(result.status === 200, `Expected status 200, got ${result.status}`);
  const data = result.data as any;
  assert(data.domain === "dineout", "Domain must be dineout");
  assert(data.recommendations.length === 0, "Recommendations must be empty");
  assert(data.metadata.totalCandidates === 0, "totalCandidates must be 0");
});

await test("24. Integration with Phase 2 recommendation service", async () => {
  // User profile: cuisinePreferences = ["North Indian", "Mughlai", "Biryani"]
  // rawRestaurantList:
  // - Punjab Grill (North Indian, Mughlai -> MATCHES cuisine preferences)
  // - Sattvam (North Indian, Sattvic)
  // - Toscano (Italian, isOpen: false -> unavailable)
  const client = createMockDineoutMcpClient({ restaurants: rawRestaurantList });
  const result = await executeDineoutRecommendation(
    mockProfileUser,
    { query: "north indian" },
    {
      mcpClient: client,
      getTokenFn: async () => "valid_token",
    }
  );

  assert(result.status === 200, `Expected status 200, got ${result.status}`);
  const data = result.data as any;
  assert(data.domain === "dineout", "Domain must be dineout");
  assert(data.recommendations.length > 0, "Should have ranked recommendations");

  const topRec = data.recommendations[0];
  assert(
    topRec.candidate.id === "dine-rst-dine_101" || topRec.candidate.name.includes("Punjab Grill"),
    "Punjab Grill should rank top due to North Indian & Mughlai cuisine alignment"
  );
});

await test("25. Ensure no Swiggy token leaks", async () => {
  const sensitiveToken = "SUPER_SECRET_DINEOUT_OAUTH_TOKEN_778899";
  const client = createMockDineoutMcpClient();

  const successResult = await executeDineoutRecommendation(
    mockProfileUser,
    { query: "north indian" },
    {
      mcpClient: client,
      getTokenFn: async () => sensitiveToken,
    }
  );

  const successJson = JSON.stringify(successResult);
  assert(!successJson.includes(sensitiveToken), "Success response must NOT leak Swiggy access token");

  const failClient = createMockDineoutMcpClient({ failStatus: 502 });
  const failResult = await executeDineoutRecommendation(
    mockProfileUser,
    { query: "north indian" },
    {
      mcpClient: failClient,
      getTokenFn: async () => sensitiveToken,
    }
  );

  const failJson = JSON.stringify(failResult);
  assert(!failJson.includes(sensitiveToken), "Error response must NOT leak Swiggy access token");
});

await test("26. Ensure no invented nutrition fields or health claims", () => {
  const raw = {
    id: "dine_test_nutrition",
    name: "Barbeque Nation",
    cuisine: ["North Indian", "BBQ"],
    costForTwo: 1800,
  };

  const normalized = normalizeSwiggyDineoutRestaurant(raw);

  // Must not invent nutrition or medical claims
  assert(normalized.safetyData.allergens === undefined, "Allergens must be undefined for restaurant-level Dineout");
  assert(normalized.safetyData.ingredients === undefined, "Ingredients must be undefined for restaurant-level Dineout");
  assert(normalized.matchData.goalSignals === undefined, "Goal signals must remain undefined without structured data");

  const jsonStr = JSON.stringify(normalized);
  assert(!jsonStr.includes("calories"), "Must NOT invent calories");
  assert(!jsonStr.includes("protein"), "Must NOT invent protein");
  assert(!jsonStr.includes("vitamins"), "Must NOT invent vitamins");
  assert(!jsonStr.includes("healthy"), "Must NOT invent health claims");
});

await test("27. getRestaurantDetails MCP operation", async () => {
  const client = createMockDineoutMcpClient();
  const details = await client.getRestaurantDetails("valid_token", { restaurant_id: "dine_101" });
  assert(details !== null, "Details should not be null");
  assert(details?.id === "dine_101", "Restaurant ID mismatch");
});

await test("28. getAvailableSlots MCP operation", async () => {
  const client = createMockDineoutMcpClient();
  const slots = await client.getAvailableSlots("valid_token", { restaurant_id: "dine_101" });
  assert(Array.isArray(slots), "Slots must be an array");
  assert(slots.length > 0, "Slots should not be empty");
  assert(slots.includes("19:00"), "Must include 19:00 slot");
});

await test("29. Domain isolation: candidates strictly domain dineout", async () => {
  const client = createMockDineoutMcpClient({ restaurants: rawRestaurantList });
  const result = await executeDineoutRecommendation(
    mockProfileUser,
    { query: "dining" },
    {
      mcpClient: client,
      getTokenFn: async () => "valid_token",
    }
  );

  const data = result.data as any;
  assert(data.domain === "dineout", "Result domain must be dineout");
  for (const rec of data.recommendations) {
    assert(rec.candidate.domain === "dineout", "Candidate domain must be dineout");
    assert(rec.candidate.id.startsWith("dine-rst-"), "Candidate ID must start with dine-rst-");
  }
});

await test("30. Complex nested cards extraction in extractDineoutRestaurantsFromMcp", () => {
  const cardPayload = {
    cards: [
      {
        card: {
          gridElements: {
            infoWithStyle: {
              restaurants: [
                { id: "dine_card_1", name: "The Big Barbeque", costForTwo: 1500 },
                { id: "dine_card_2", name: "Absolute Barbecues", costForTwo: 1400 },
              ],
            },
          },
        },
      },
    ],
  };

  const content = extractSwiggyMcpContent(cardPayload);
  const restaurants = extractDineoutRestaurantsFromMcp(content);
  assert(restaurants.length === 2, `Expected 2 restaurants from nested cards, got ${restaurants.length}`);
  assert(restaurants[0].name === "The Big Barbeque", "First item mismatch");
  assert(restaurants[1].name === "Absolute Barbecues", "Second item mismatch");
});

await test("31. Dineout recommendation response adheres strictly to schema", async () => {
  const client = createMockDineoutMcpClient({ restaurants: rawRestaurantList });
  const result = await executeDineoutRecommendation(
    mockProfileUser,
    { query: "north indian", limit: 2 },
    {
      mcpClient: client,
      getTokenFn: async () => "valid_token",
    }
  );

  const parsed = DineoutRecommendationResponseSchema.safeParse(result.data);
  assert(parsed.success === true, `Response schema validation failed: ${JSON.stringify((parsed as any).error?.errors)}`);
  assert((result.data as any).recommendations.length <= 2, "Limit of 2 respected");
});

await test("32. Real production Swiggy Dineout MCP reachability", async () => {
  // Test direct HTTP reachability of Swiggy Dineout MCP server without tokens (expects 401 unauth)
  // Per rules: Work ONLY on local codebase, no browser, direct fetch check to official MCP URL
  try {
    const res = await fetch("https://mcp.swiggy.com/dineout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name: "get_saved_locations", arguments: {} },
      }),
    });
    // Live endpoint without credentials should return 401 Unauthorized
    assert(res.status === 401, `Live Dineout MCP server returned status ${res.status} (expected 401 unauthorized)`);
  } catch (err: any) {
    console.log("    (Notice: Swiggy Dineout endpoint fetch skipped if offline)");
  }
});

await test("33. A. Valid selected NutriFlow location resolves to the correct Swiggy addressId", () => {
  const rawLocations = [
    {
      id: "cv2sa7jbrd8siovv8m0g__AQ655gT2RswsuAA7kLyhst",
      addressId: "cv2sa7jbrd8siovv8m0g__AQ655gT2RswsuAA7kLyhst",
      name: "Home",
      address: "123 Indiranagar, Bengaluru",
      isDefault: true,
    },
    {
      location_id: "loc_work_456",
      addressId: "addr_work_789",
      name: "Work",
      address: "Tech Park, Whitefield",
      isDefault: false,
    },
  ];

  const extracted = extractDineoutLocations(rawLocations);
  assert(extracted.length === 2, "Should extract 2 locations");
  assert(extracted[0].addressId === "cv2sa7jbrd8siovv8m0g__AQ655gT2RswsuAA7kLyhst", "First location addressId must match");
  assert(extracted[1].addressId === "addr_work_789", "Second location addressId must match");

  const resolved = resolveDineoutLocation(extracted, "cv2sa7jbrd8siovv8m0g__AQ655gT2RswsuAA7kLyhst");
  assert(resolved.success === true, "Must successfully resolve location");
  assert(resolved.location?.addressId === "cv2sa7jbrd8siovv8m0g__AQ655gT2RswsuAA7kLyhst", "Resolved location addressId must match");
});

await test("34. B. search_restaurants_dineout receives the correct addressId and dual fields", async () => {
  let capturedBody: any = {};
  const mockClient = createMockDineoutMcpClient({
    captureLastRequest: (_url, _headers, body) => {
      capturedBody = body;
    },
    locations: [
      {
        id: "cv2sa7jbrd8siovv8m0g__AQ655gT2RswsuAA7kLyhst",
        addressId: "cv2sa7jbrd8siovv8m0g__AQ655gT2RswsuAA7kLyhst",
        name: "Home",
        address: "123 Indiranagar, Bengaluru",
        isDefault: true,
        lat: 12.9716,
        lng: 77.5946,
      },
    ],
  });

  const result = await executeDineoutRecommendation(
    mockProfileUser,
    { query: "biryani", locationId: "cv2sa7jbrd8siovv8m0g__AQ655gT2RswsuAA7kLyhst" },
    {
      mcpClient: mockClient,
      getTokenFn: async () => "valid_token",
    }
  );

  assert(result.status === 200, "Request must succeed with 200");
  assert(capturedBody.params?.name === "search_restaurants_dineout", "Must call search_restaurants_dineout");
  const args = capturedBody.params?.arguments;
  assert(args.addressId === "cv2sa7jbrd8siovv8m0g__AQ655gT2RswsuAA7kLyhst", "search_restaurants_dineout must receive addressId");
  assert(args.address_id === "cv2sa7jbrd8siovv8m0g__AQ655gT2RswsuAA7kLyhst", "search_restaurants_dineout must receive address_id");
  assert(args.locationId === "cv2sa7jbrd8siovv8m0g__AQ655gT2RswsuAA7kLyhst", "search_restaurants_dineout must retain locationId");
  assert(args.query === "biryani", "Query must match");
  assert(args.lat === 12.9716 && args.latitude === 12.9716, "Must pass lat and latitude");
  assert(args.lng === 77.5946 && args.longitude === 77.5946, "Must pass lng and longitude");
});

await test("35. C. Existing clarification behavior still works when multiple locations exist and none selected", async () => {
  const ambiguousLocations = [
    { id: "loc_1", addressId: "addr_1", name: "Location 1", isDefault: false },
    { id: "loc_2", addressId: "addr_2", name: "Location 2", isDefault: false },
  ];
  const mockClient = createMockDineoutMcpClient({ locations: ambiguousLocations });

  const result = await executeDineoutRecommendation(
    mockProfileUser,
    { query: "pasta" },
    {
      mcpClient: mockClient,
      getTokenFn: async () => "valid_token",
    }
  );

  assert(result.status === 200, "Ambiguous locations return 200 clarification prompt");
  const data = result.data as any;
  assert(data.clarificationNeeded === true, "Must flag clarificationNeeded");
  assert(data.availableLocations.length === 2, "Must return available locations");
  assert(data.recommendations.length === 0, "No recommendations before clarification");
});

await test("36. D. Invalid/cross-user location IDs remain rejected", async () => {
  const userLocations = [
    { id: "user_addr_1", addressId: "user_addr_1", name: "User Home", isDefault: true },
  ];
  const mockClient = createMockDineoutMcpClient({ locations: userLocations });

  const result = await executeDineoutRecommendation(
    mockProfileUser,
    { query: "pasta", locationId: "attacker_foreign_location_999" },
    {
      mcpClient: mockClient,
      getTokenFn: async () => "valid_token",
    }
  );

  const data = result.data as any;
  assert(data.clarificationNeeded === true, "Must flag clarificationNeeded when requested location is not user's");
  assert(data.recommendations.length === 0, "No recommendations executed for invalid location");
  assert(data.availableLocations?.length === 1 && data.availableLocations[0].id === "user_addr_1", "Only user's own locations are presented");
  assert(!data.locationUsed, "Attacker location must NOT be used");
});

await test("37. E. Existing Dineout behavior remains intact with addressId resolution and coordinate pass-through", async () => {
  let capturedBody: any = {};
  const mockClient = createMockDineoutMcpClient({
    captureLastRequest: (_url, _headers, body) => {
      capturedBody = body;
    },
    locations: rawLocationList,
    restaurants: rawRestaurantList,
  });

  const result = await executeDineoutRecommendation(
    mockProfileUser,
    { query: "north indian" },
    {
      mcpClient: mockClient,
      getTokenFn: async () => "valid_token",
    }
  );

  assert(result.status === 200, "Default execution must succeed");
  const data = result.data as any;
  assert(data.locationUsed?.id === "loc_dine_koramangala", "Default location must be used");
  assert(data.recommendations.length > 0, "Must have recommendations");
  assert(capturedBody.params?.arguments.addressId === "loc_dine_koramangala", "Outgoing call must have addressId matching default location");
  assert(capturedBody.params?.arguments.lat === 12.9352, "Latitude must be passed");
  assert(capturedBody.params?.arguments.lng === 77.6245, "Longitude must be passed");
});

await test("38. Regression A: Structured Dineout response still works with structuredContent", () => {
  const structuredMcpPayload = {
    result: {
      structuredContent: {
        restaurants: [
          { id: "str_1", name: "Punjab Grill", avg_rating: 4.7, costForTwo: 2200 },
          { id: "str_2", name: "Sattvam", avg_rating: 4.6, costForTwo: 1800 },
        ],
      },
    },
  };

  const content = extractSwiggyMcpContent(structuredMcpPayload);
  const restaurants = extractDineoutRestaurantsFromMcp(content, structuredMcpPayload);
  assert(restaurants.length === 2, `Expected 2 restaurants from structuredContent, got ${restaurants.length}`);
  assert(restaurants[0].id === "str_1" && restaurants[0].name === "Punjab Grill", "First restaurant mismatch");
  assert(restaurants[1].id === "str_2" && restaurants[1].name === "Sattvam", "Second restaurant mismatch");
});

const knownProductionProseResponse = `Found 39 restaurant(s) matching "restaurants", showing 10. 29 more available...

1. Punjab Grill (ID: 101)
   Rating: 4.7
   Cuisine: North Indian, Mughlai
   Cost for two: ₹2200
   Locality: Koramangala
   Distance: 1.2 km

2. Sattvam - Pure Vegetarian Fine Dining (ID: 102)
   Rating: 4.6
   Cuisine: North Indian, South Indian
   Cost for two: ₹1800
   Locality: Sadashiv Nagar
   Distance: 3.5 km

3. Toscano (ID: 103)
   Rating: 4.5
   Cuisine: Italian, Pizza, Pasta
   Cost for two: ₹1800
   Locality: UB City
   Distance: 4.1 km

4. The Black Pearl (ID: 104)
   Rating: 4.4
   Cuisine: BBQ, North Indian
   Cost for two: ₹1500
   Locality: Marathahalli

5. Nagarjuna (ID: 105)
   Rating: 4.6
   Cuisine: Andhra, Biryani
   Cost for two: ₹800
   Locality: Residency Road

6. Truffles (ID: 106)
   Rating: 4.5
   Cuisine: American, Burgers
   Cost for two: ₹900
   Locality: St. Marks Road

7. Vidyarthi Bhavan (ID: 107)
   Rating: 4.4
   Cuisine: South Indian
   Cost for two: ₹300
   Locality: Gandhi Bazaar

8. Empire Restaurant (ID: 108)
   Rating: 4.2
   Cuisine: Mughlai, North Indian
   Cost for two: ₹900
   Locality: Church Street

9. Barbeque Nation (ID: 109)
   Rating: 4.5
   Cuisine: BBQ, North Indian
   Cost for two: ₹1600
   Locality: Indiranagar

10. Mainland China (ID: 110)
    Rating: 4.5
    Cuisine: Chinese, Asian
    Cost for two: ₹1800
    Locality: Whitefield`;

await test("39. Regression B: Text-only Dineout search response with empty structuredContent is parsed correctly", () => {
  const mcpPayloadWithEmptyStructured = {
    jsonrpc: "2.0",
    id: 12345,
    result: {
      content: [
        {
          type: "text",
          text: knownProductionProseResponse,
        },
      ],
      structuredContent: {},
    },
  };

  const content = extractSwiggyMcpContent(mcpPayloadWithEmptyStructured);
  const restaurants = extractDineoutRestaurantsFromMcp(content, mcpPayloadWithEmptyStructured);
  assert(restaurants.length === 10, `Expected 10 restaurants from text-only fallback, got ${restaurants.length}`);
  assert(restaurants[0].id === "101", `First ID mismatch: ${restaurants[0].id}`);
  assert(restaurants[0].name === "Punjab Grill", `First name mismatch: ${restaurants[0].name}`);
  assert(restaurants[0].avg_rating === 4.7, `First rating mismatch: ${restaurants[0].avg_rating}`);
  assert(restaurants[0].costForTwo === 2200, `First cost mismatch: ${restaurants[0].costForTwo}`);
  assert(restaurants[0].locality === "Koramangala", `First locality mismatch: ${restaurants[0].locality}`);
  assert(Array.isArray(restaurants[0].cuisine) && restaurants[0].cuisine.includes("North Indian"), "Cuisine mismatch");
  assert(restaurants[9].id === "110" && restaurants[9].name === "Mainland China", "Tenth restaurant mismatch");
});

await test("40. Regression C: Known 'Found 39 restaurant(s)...' response format produces restaurant candidates in recommendation service", async () => {
  const mcpPayloadWithEmptyStructured = {
    jsonrpc: "2.0",
    id: 12345,
    result: {
      content: [
        {
          type: "text",
          text: knownProductionProseResponse,
        },
      ],
      structuredContent: {},
    },
  };

  const mockClient = createMockDineoutMcpClient({
    productionEnvelope: mcpPayloadWithEmptyStructured,
    locations: rawLocationList,
  });

  const result = await executeDineoutRecommendation(
    mockProfileUser,
    { query: "restaurants", locationId: "loc_dine_koramangala" },
    {
      mcpClient: mockClient,
      getTokenFn: async () => "valid_token",
    }
  );

  assert(result.status === 200, `Expected status 200, got ${result.status}`);
  const data = result.data as any;
  assert(data.domain === "dineout", "Domain must be dineout");
  assert(data.metadata.totalCandidates === 10, `Expected 10 total candidates, got ${data.metadata.totalCandidates}`);
  assert(data.recommendations.length > 0, "Must have non-empty recommendations");
  const parsed = DineoutRecommendationResponseSchema.safeParse(data);
  assert(parsed.success === true, `Response schema failed: ${JSON.stringify((parsed as any).error?.errors)}`);
});

await test("41. Regression D: Restaurant IDs are extracted correctly from text blocks and markdown", () => {
  const customMarkdownProse = `Here are dining options:
1. **The Persian Terrace** [ID: d_pt_77] - Rating: 4.8 - Locality: Malleshwaram - Cuisine: Persian, Mediterranean - ₹3000 for two
2. **O.G. By The Lake** (Restaurant ID: d_og_88)
   - Rating: 4.6★
   - Area: Bellandur
   - Cuisines: Continental, Italian
   - Cost for two: 2000
   - Status: Open now`;

  const parsed = parseDineoutRestaurantsFromText(customMarkdownProse);
  assert(parsed.length === 2, `Expected 2 parsed restaurants, got ${parsed.length}`);
  assert(parsed[0].id === "d_pt_77", `Expected ID d_pt_77, got ${parsed[0].id}`);
  assert(parsed[0].name === "The Persian Terrace", `Expected The Persian Terrace, got ${parsed[0].name}`);
  assert(parsed[0].costForTwo === 3000, `Expected cost 3000, got ${parsed[0].costForTwo}`);
  assert(parsed[1].id === "d_og_88", `Expected ID d_og_88, got ${parsed[1].id}`);
  assert(parsed[1].name === "O.G. By The Lake", `Expected O.G. By The Lake, got ${parsed[1].name}`);
  assert(parsed[1].avg_rating === 4.6, `Expected rating 4.6, got ${parsed[1].avg_rating}`);
  assert(parsed[1].isOpen === true, "Expected isOpen true");
});

await test("42. Regression E: Invalid/malformed text does not create fabricated candidates", () => {
  const malformedText = `Found 0 restaurant(s) matching "unknown_xyz".
Note: No restaurants found nearby.
Please check your location or try another keyword.
1. Just a numbered note without any restaurant identifier or name.
- Another bullet with some random notes.
Warning: Server notice code 502.`;

  const parsed = parseDineoutRestaurantsFromText(malformedText);
  assert(parsed.length === 0, `Expected 0 candidates for malformed text, got ${parsed.length}`);

  const candidates = normalizeDineoutRestaurantsBatch(parsed);
  assert(candidates.length === 0, "No candidates normalized from malformed text");
});

await test("43. Regression F: Existing clarification behavior remains intact", async () => {
  const ambiguousLocations = [
    { id: "loc_x1", addressId: "addr_x1", name: "Location 1", isDefault: false },
    { id: "loc_x2", addressId: "addr_x2", name: "Location 2", isDefault: false },
  ];
  const mockClient = createMockDineoutMcpClient({ locations: ambiguousLocations });

  const result = await executeDineoutRecommendation(
    mockProfileUser,
    { query: "dining" },
    {
      mcpClient: mockClient,
      getTokenFn: async () => "valid_token",
    }
  );

  assert(result.status === 200, "Ambiguous locations return 200 clarification prompt");
  const data = result.data as any;
  assert(data.clarificationNeeded === true, "Must flag clarificationNeeded");
  assert(data.availableLocations.length === 2, "Must return available locations");
  assert(data.recommendations.length === 0, "No recommendations before clarification");
});

await test("44. Regression G: Existing locationId to addressId mapping remains intact", async () => {
  let capturedBody: any = {};
  const mcpPayloadWithEmptyStructured = {
    jsonrpc: "2.0",
    id: 12345,
    result: {
      content: [{ type: "text", text: knownProductionProseResponse }],
      structuredContent: {},
    },
  };

  const mockClient = createMockDineoutMcpClient({
    captureLastRequest: (_url, _headers, body) => {
      capturedBody = body;
    },
    productionEnvelope: mcpPayloadWithEmptyStructured,
    locations: [
      {
        id: "cv2sa7jbrd8siovv8m0g__AQ655gT2RswsuAA7kLyhst",
        addressId: "cv2sa7jbrd8siovv8m0g__AQ655gT2RswsuAA7kLyhst",
        name: "Home",
        isDefault: true,
      },
    ],
  });

  const result = await executeDineoutRecommendation(
    mockProfileUser,
    { query: "restaurants", locationId: "cv2sa7jbrd8siovv8m0g__AQ655gT2RswsuAA7kLyhst" },
    {
      mcpClient: mockClient,
      getTokenFn: async () => "valid_token",
    }
  );

  assert(result.status === 200, "Execution must succeed with 200");
  const args = capturedBody.params?.arguments;
  assert(args.addressId === "cv2sa7jbrd8siovv8m0g__AQ655gT2RswsuAA7kLyhst", "search_restaurants_dineout must receive addressId");
  assert(args.address_id === "cv2sa7jbrd8siovv8m0g__AQ655gT2RswsuAA7kLyhst", "search_restaurants_dineout must receive address_id");
  assert(args.locationId === "cv2sa7jbrd8siovv8m0g__AQ655gT2RswsuAA7kLyhst", "search_restaurants_dineout must retain locationId");
  const data = result.data as any;
  assert(data.recommendations.length > 0, "Must return ranked recommendations from parsed prose");
});

await test("45. Dineout normalizer preserves real Swiggy image URL without fabrication", async () => {
  const normalizedWithImage = normalizeSwiggyDineoutRestaurant({
    id: "rst_img_1",
    name: "Barbeque Nation",
    imageUrl: "https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto/bbq_sample.jpg",
  });
  assert(
    normalizedWithImage.sourceMetadata?.imageUrl?.includes("bbq_sample.jpg") === true,
    "Real Swiggy image URL must be preserved in sourceMetadata"
  );

  const normalizedWithoutImage = normalizeSwiggyDineoutRestaurant({
    id: "rst_img_2",
    name: "Pure Dining",
  });
  assert(
    normalizedWithoutImage.sourceMetadata?.imageUrl === undefined,
    "Missing image must remain undefined and not fabricated"
  );
});

await test("46. Dineout discovery preserves Swiggy returned ordering without Profile Context scoring", async () => {
  const client = createMockDineoutMcpClient({
    restaurants: [
      { id: "swiggy_rest_1", name: "Low Score First", avg_rating: 3.8, cuisine: "Continental" },
      { id: "swiggy_rest_2", name: "Perfect Profile Match", avg_rating: 4.9, cuisine: "North Indian, Mughlai" },
      { id: "swiggy_rest_3", name: "Medium Score Third", avg_rating: 4.2, cuisine: "South Indian" },
    ],
  });

  const result = await executeDineoutRecommendation(
    mockProfileUser,
    { query: "restaurants" },
    {
      mcpClient: client,
      getTokenFn: async () => "valid_token",
    }
  );

  assert(result.status === 200, "Must succeed with 200");
  const data = result.data as any;
  assert(data.recommendations.length === 3, "Must return 3 recommendations");
  assert(data.recommendations[0].candidate.id === "dine-rst-swiggy_rest_1", "Swiggy item 1 must remain 1st");
  assert(data.recommendations[1].candidate.id === "dine-rst-swiggy_rest_2", "Swiggy item 2 must remain 2nd");
  assert(data.recommendations[2].candidate.id === "dine-rst-swiggy_rest_3", "Swiggy item 3 must remain 3rd");
});

await test("47. Dineout search passes explicit user query without injecting Profile Context keywords", async () => {
  let capturedQuery = "";
  const client = createMockDineoutMcpClient({
    captureLastRequest: (_url, _headers, body) => {
      capturedQuery = body.params?.arguments?.query;
    },
  });

  await executeDineoutRecommendation(
    mockProfileUser,
    { query: "pizza" },
    {
      mcpClient: client,
      getTokenFn: async () => "valid_token",
    }
  );

  assert(capturedQuery === "pizza", `Search query must be exactly "pizza", got "${capturedQuery}"`);
  assert(!capturedQuery.includes("High Protein"), "Must not inject dietary preferences");
  assert(!capturedQuery.includes("North Indian"), "Must not inject cuisine preferences");
});

await test("48. Cost for two is preserved without fake ₹1000 fallback", async () => {
  const norm1 = normalizeSwiggyDineoutRestaurant({
    id: "rst_cost_1",
    name: "Fine Dine",
    costForTwo: 2400,
  });
  assert(norm1.sourceMetadata?.costForTwo === 2400, "Real costForTwo must be preserved");

  const norm2 = normalizeSwiggyDineoutRestaurant({
    id: "rst_cost_2",
    name: "Cafe",
  });
  assert(norm2.sourceMetadata?.costForTwo === undefined, "Missing costForTwo must remain undefined");
});

console.log(`\n🎉 All ${passedCount} Phase 3 Part 4 Live Dineout Integration tests passed successfully!\n`);
