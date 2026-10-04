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
  extractInstamartProductsFromMcp,
  normalizeInstamartProductsBatch,
  InstamartRecommendationRequestSchema,
  InstamartRecommendationResponseSchema,
} = await import("../lib/api-zod/src/instamartRecommendations.ts");

const {
  InstamartMcpClient,
  SwiggyAuthError,
  SwiggyMcpError,
} = await import("../artifacts/api-server/src/lib/instamartMcpClient.ts");

const {
  executeInstamartRecommendation,
} = await import("../artifacts/api-server/src/lib/instamartRecommendationService.ts");

const {
  normalizeSwiggyInstamartProduct,
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

console.log("=== Running NutriFlow Phase 3 Part 3 Live Instamart Integration Tests ===\n");

// ─── Test Fixtures ─────────────────────────────────────────────────────────────

const mockProfileUser: any = {
  id: "usr_test_insta_1",
  name: "Sneha Reddy",
  email: "sneha@example.com",
  swiggyUserId: "swiggy_usr_im_1",
  onboardingCompleted: true,
  age: 27,
  gender: "female",
  height: 165,
  weight: 60,
  activityLevel: "moderate",
  goal: "Weight Loss",
  secondaryGoals: ["High Fiber"],
  dietaryPreferences: ["Vegetarian"],
  allergies: ["gluten"],
  dislikedFoods: ["mushrooms"],
  cuisinePreferences: ["Indian"],
  wellnessScore: 85,
  streak: 7,
};

const rawAddressList = [
  {
    id: "addr_im_home",
    name: "Home",
    address: "Flat 201, Lotus Towers, Indiranagar",
    city: "Bengaluru",
    lat: 12.9719,
    lng: 77.6412,
    isDefault: true,
  },
  {
    id: "addr_im_work",
    name: "Office",
    address: "Prestige Tech Park, Marathahalli",
    city: "Bengaluru",
    lat: 12.9362,
    lng: 77.6901,
    isDefault: false,
  },
];

const rawProductList = [
  {
    id: "prod_101",
    name: "Quaker Rolled Oats 1kg",
    brand: "Quaker",
    price: 190,
    mrp: 220,
    inStock: true,
    category: "Breakfast & Cereals",
    spin_id: "spin_oats_101",
    quantity: "1 kg",
    rating: 4.6,
    isVeg: true,
    tags: ["High Fiber", "Breakfast", "Healthy"],
  },
  {
    id: "prod_102",
    name: "Gluten Free Multigrain Bread 400g",
    brand: "The Baker's Dozen",
    price: 95,
    mrp: 110,
    inStock: true,
    category: "Bakery",
    spin_id: "spin_bread_102",
    quantity: "400 g",
    rating: 4.4,
    isVeg: true,
    tags: ["Gluten Free", "Bakery"],
    ingredients: ["rice flour", "tapioca starch", "yeast"],
  },
  {
    id: "prod_103",
    name: "Whole Wheat Bread (Contains Gluten)",
    brand: "Britannia",
    price: 45,
    mrp: 50,
    inStock: true,
    category: "Bakery",
    spin_id: "spin_bread_103",
    quantity: "400 g",
    rating: 4.2,
    isVeg: true,
    allergens: ["gluten"],
    ingredients: ["whole wheat flour", "yeast"],
  },
  {
    id: "prod_104",
    name: "Fresh Button Mushrooms 200g",
    brand: "Fresh Produce",
    price: 60,
    mrp: 75,
    inStock: false,
    category: "Vegetables",
    spin_id: "spin_mush_104",
    quantity: "200 g",
    rating: 4.1,
    isVeg: true,
  },
];

// Helper to create mock InstamartMcpClient
function createMockInstamartMcpClient(options?: {
  addresses?: any[];
  products?: any[];
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
    const toolName = bodyJson?.params?.name;
    const toolArgs = bodyJson?.params?.arguments;

    if (toolName === "get_addresses") {
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
              addresses: options?.addresses ?? rawAddressList,
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (toolName === "search_products" || toolName === "your_go_to_items") {
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
              products: options?.products ?? rawProductList,
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

  return new InstamartMcpClient({ fetchFn: customFetch });
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

await test("1. Instamart MCP request construction", async () => {
  let capturedUrl = "";
  let capturedHeaders: any = {};
  let capturedBody: any = {};

  const client = createMockInstamartMcpClient({
    captureLastRequest: (url, headers, body) => {
      capturedUrl = url;
      capturedHeaders = headers;
      capturedBody = body;
    },
  });

  await client.searchProducts("secret_test_token", {
    query: "organic oats",
    address_id: "addr_123",
    lat: 12.97,
    lng: 77.64,
  });

  assert(capturedUrl === "https://mcp.swiggy.com/im", "Target URL must be Instamart MCP URL");
  assert(capturedBody.jsonrpc === "2.0", "JSON-RPC 2.0 version required");
  assert(capturedBody.method === "tools/call", "Method must be tools/call");
  assert(capturedBody.params.name === "search_products", "Tool name must be search_products");
  assert(capturedBody.params.arguments.query === "organic oats", "Query argument must match");
  assert(capturedBody.params.arguments.address_id === "addr_123", "address_id argument must match");
  assert(capturedBody.params.arguments.addressId === "addr_123", "addressId argument must match");
});

await test("2. Correct service routing to Instamart", async () => {
  let capturedUrl = "";
  const client = createMockInstamartMcpClient({
    captureLastRequest: (url) => {
      capturedUrl = url;
    },
  });

  await client.yourGoToItems("valid_token", { address_id: "addr_456" });
  assert(capturedUrl === "https://mcp.swiggy.com/im", "Must route to https://mcp.swiggy.com/im");
});

await test("3. Required Accept header", async () => {
  let capturedHeaders: any = {};
  const client = createMockInstamartMcpClient({
    captureLastRequest: (_url, headers) => {
      capturedHeaders = headers;
    },
  });

  await client.searchProducts("valid_token", { query: "milk" });
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
  const client = createMockInstamartMcpClient({
    captureLastRequest: (_url, _headers, body) => {
      capturedBody = body;
    },
  });

  await client.getAddresses("valid_token");
  assert(capturedBody.jsonrpc === "2.0", "Must have jsonrpc: 2.0");
  assert(typeof capturedBody.id === "number", "Must have numeric message id");
  assert(capturedBody.method === "tools/call", "Must specify tools/call");
  assert(capturedBody.params?.name === "get_addresses", "Must call get_addresses tool");
});

await test("5. structuredContent product extraction", () => {
  const mcpPayload = {
    result: {
      structuredContent: {
        products: [
          { id: "p1", name: "Brown Rice", price: 120 },
          { id: "p2", name: "Almond Milk", price: 250 },
        ],
      },
    },
  };

  const content = extractSwiggyMcpContent(mcpPayload);
  const products = extractInstamartProductsFromMcp(content);
  assert(products.length === 2, "Should extract exactly 2 products");
  assert(products[0].id === "p1" && products[0].name === "Brown Rice", "First product mismatch");
  assert(products[1].id === "p2" && products[1].name === "Almond Milk", "Second product mismatch");
});

await test("6. content/prose + structuredContent response handling", () => {
  const mcpPayload = {
    result: {
      content: [
        {
          type: "text",
          text: "Here are some top grocery items found near Indiranagar for your search:",
        },
      ],
      structuredContent: {
        items: [
          { id: "p_prose_1", name: "Chia Seeds 250g", price: 150, inStock: true },
          { id: "p_prose_2", name: "Greek Yogurt 400g", price: 90, inStock: true },
        ],
      },
    },
  };

  const content = extractSwiggyMcpContent(mcpPayload);
  const products = extractInstamartProductsFromMcp(content);
  assert(products.length === 2, "Must not discard structuredContent when content[0].text is prose");
  assert(products[0].name === "Chia Seeds 250g", "Item name mismatch");
  assert(products[1].name === "Greek Yogurt 400g", "Item name mismatch");
});

await test("7. Product normalization", () => {
  const raw = {
    id: "raw_101",
    name: "Kellogg's Special K 500g",
    brand: "Kellogg's",
    price: 240,
    mrp: 275,
    inStock: true,
    category: "Cereals",
    spin: "spin_k_101",
    quantity: "500 g",
    rating: 4.5,
    isVeg: true,
    tags: ["Breakfast", "High Fiber"],
  };

  const normalized = normalizeSwiggyInstamartProduct(raw);
  assert(normalized.id === "insta-prod-raw_101", "ID must be prefixed with insta-prod-");
  assert(normalized.name === "Kellogg's Special K 500g", "Name must match");
  assert(normalized.domain === "instamart", "Domain must be instamart");
  assert(normalized.availability === "available", "Availability must be available");
  assert(normalized.price === 240, "Price must be 240");
  assert(normalized.sourceMetadata.brand === "Kellogg's", "Brand must match");
  assert(normalized.sourceMetadata.quantity === "500 g", "Quantity must match");
});

await test("8. Price/MRP preservation", () => {
  const rawWithOffer = {
    productId: "offer_99",
    name: "Olive Oil 1L",
    offer_price: 650,
    mrp: 850,
  };

  const normalized = normalizeSwiggyInstamartProduct(rawWithOffer);
  assert(normalized.price === 650, "Offer price should be preserved as candidate price");
  assert(normalized.sourceMetadata.mrp === 850, "MRP must be preserved in sourceMetadata");
});

await test("9. Stock/availability preservation", () => {
  const inStockRaw = { id: "s1", name: "In Stock Item", in_stock: 1 };
  const outOfStockRaw = { id: "s2", name: "Out of Stock Item", in_stock: 0 };
  const inventoryZeroRaw = { id: "s3", name: "Zero Inventory Item", inventory: 0 };

  const normInStock = normalizeSwiggyInstamartProduct(inStockRaw);
  const normOutStock = normalizeSwiggyInstamartProduct(outOfStockRaw);
  const normInvZero = normalizeSwiggyInstamartProduct(inventoryZeroRaw);

  assert(normInStock.availability === "available", "in_stock 1 must be available");
  assert(normOutStock.availability === "unavailable", "in_stock 0 must be unavailable");
  assert(normInvZero.availability === "unavailable", "inventory 0 must be unavailable");
});

await test("10. spinId/variantId preservation", () => {
  const raw = {
    id: "prod_var_1",
    name: "Basmati Rice 5kg",
    spin_id: "spin_rice_5kg_99",
  };

  const normalized = normalizeSwiggyInstamartProduct(raw);
  assert(normalized.sourceMetadata.spinId === "spin_rice_5kg_99", "spinId must match");
  assert(normalized.sourceMetadata.variantId === "spin_rice_5kg_99", "variantId must match");
});

await test("11. Missing optional fields", () => {
  // Bare minimum product
  const bareProduct = {
    id: "bare_min_1",
  };

  const normalized = normalizeSwiggyInstamartProduct(bareProduct);
  assert(normalized.id === "insta-prod-bare_min_1", "ID must be prefixed");
  assert(normalized.name === undefined, "Should leave name undefined if not provided by source");
  assert(normalized.name !== "Grocery Item", "Must NEVER produce fake Grocery Item name");
  assert(normalized.price === undefined, "Price should be undefined if not provided");
  assert(normalized.availability === undefined, "Availability should be undefined if not provided");
  assert(normalized.safetyData.dietaryClassification === undefined, "Must NOT invent dietary classification");
  assert(normalized.safetyData.allergens === undefined, "Must NOT invent allergens");
  assert(normalized.safetyData.ingredients === undefined, "Must NOT invent ingredients");
});

await test("12. Address resolution (single / default auto-selection)", () => {
  // Exactly 1 address
  const single = [{ id: "addr_single", name: "Only Address" }];
  const resSingle = resolveSwiggyAddress(single);
  assert(resSingle.success === true, "Single address must succeed automatically");
  assert(resSingle.address?.id === "addr_single", "Selected address id must match");

  // Multiple addresses with 1 default
  const resDefault = resolveSwiggyAddress(rawAddressList);
  assert(resDefault.success === true, "Default address must succeed automatically");
  assert(resDefault.address?.id === "addr_im_home", "Must select addr_im_home");
});

await test("13. Explicit addressId", () => {
  const resExplicit = resolveSwiggyAddress(rawAddressList, "addr_im_work");
  assert(resExplicit.success === true, "Explicit addressId must succeed");
  assert(resExplicit.address?.id === "addr_im_work", "Must match requested addressId");

  const resNonExistent = resolveSwiggyAddress(rawAddressList, "addr_invalid_404");
  assert(resNonExistent.success === false, "Non-existent addressId must fail");
  assert(resNonExistent.clarificationNeeded === true, "Must flag clarificationNeeded");
});

await test("14. Multiple-address clarification", () => {
  const ambiguousAddresses = [
    { id: "addr_1", name: "Home 1", isDefault: false },
    { id: "addr_2", name: "Home 2", isDefault: false },
  ];

  const res = resolveSwiggyAddress(ambiguousAddresses);
  assert(res.success === false, "Ambiguous addresses must not auto-select");
  assert(res.clarificationNeeded === true, "clarificationNeeded must be true");
  assert(res.availableAddresses?.length === 2, "availableAddresses must contain options");
});

await test("15. No-address error", () => {
  const res = resolveSwiggyAddress([]);
  assert(res.success === false, "Empty address list must fail");
  assert(res.clarificationNeeded === false, "clarificationNeeded should be false when 0 addresses exist");
  assert(typeof res.error === "string" && res.error.includes("No delivery addresses found"), "Must return clear error");
});

await test("16. Authenticated endpoint execution", async () => {
  const client = createMockInstamartMcpClient();
  const result = await executeInstamartRecommendation(
    mockProfileUser,
    { query: "oats" },
    {
      mcpClient: client,
      getTokenFn: async () => "valid_token_123",
    }
  );

  assert(result.status === 200, `Expected status 200, got ${result.status}`);
  const data = result.data as any;
  assert(data.domain === "instamart", "Domain must be instamart");
  assert(data.addressUsed?.id === "addr_im_home", "Address used must match default address");
  assert(Array.isArray(data.recommendations), "Recommendations must be an array");
  assert(data.recommendations.length > 0, "Must have recommendations for valid query");
  assert(InstamartRecommendationResponseSchema.safeParse(data).success, "Response must conform to schema");
});

await test("17. Unauthenticated request / missing profile", async () => {
  // If user has no valid Swiggy token
  const client = createMockInstamartMcpClient();
  const result = await executeInstamartRecommendation(
    mockProfileUser,
    { query: "oats" },
    {
      mcpClient: client,
      getTokenFn: async () => null,
    }
  );

  assert(result.status === 401, `Expected status 401 for missing token, got ${result.status}`);
  const data = result.data as any;
  assert(data.requires_reauth === true, "Must flag requires_reauth: true");
});

await test("18. Missing/expired token handling", async () => {
  const client = createMockInstamartMcpClient({ throwAuthError: true });
  const result = await executeInstamartRecommendation(
    mockProfileUser,
    { query: "oats" },
    {
      mcpClient: client,
      getTokenFn: async () => "invalid_expired_token",
    }
  );

  assert(result.status === 401, `Expected status 401 for expired token, got ${result.status}`);
  const data = result.data as any;
  assert(data.requires_reauth === true, "Must flag requires_reauth on upstream 401");
});

await test("19. Upstream error handling", async () => {
  const client = createMockInstamartMcpClient({ failStatus: 503 });
  const result = await executeInstamartRecommendation(
    mockProfileUser,
    { query: "oats" },
    {
      mcpClient: client,
      getTokenFn: async () => "valid_token",
    }
  );

  assert(result.status === 503 || result.status === 502, `Expected 502 or 503 status, got ${result.status}`);
  const data = result.data as any;
  assert(typeof data.error === "string", "Error message must be a string");
  assert(!JSON.stringify(data).includes("valid_token"), "Must not leak user token");
});

await test("20. Empty search result", async () => {
  const client = createMockInstamartMcpClient({ products: [] });
  const result = await executeInstamartRecommendation(
    mockProfileUser,
    { query: "non_existent_exotic_dragonfruit_soup" },
    {
      mcpClient: client,
      getTokenFn: async () => "valid_token",
    }
  );

  assert(result.status === 200, `Expected status 200 for empty result, got ${result.status}`);
  const data = result.data as any;
  assert(data.domain === "instamart", "Domain must be instamart");
  assert(data.recommendations.length === 0, "Recommendations should be empty");
  assert(data.metadata.totalCandidates === 0, "totalCandidates should be 0");
  assert(data.metadata.returnedCount === 0, "returnedCount should be 0");
});

await test("21. Integration with Phase 2 recommendation service (safety, ranking, exclusions)", async () => {
  // User profile has: allergen: gluten, dislikedFoods: mushrooms
  // rawProductList has:
  // - Quaker Oats (safe, in stock, high fiber)
  // - Gluten Free Bread (safe, in stock)
  // - Whole Wheat Bread (contains gluten -> EXCLUDED by allergen safety)
  // - Mushrooms (disliked, out of stock -> unavailable & excluded)
  const client = createMockInstamartMcpClient({ products: rawProductList });
  const result = await executeInstamartRecommendation(
    mockProfileUser,
    { query: "groceries" },
    {
      mcpClient: client,
      getTokenFn: async () => "valid_token",
    }
  );

  assert(result.status === 200, `Expected status 200, got ${result.status}`);
  const data = result.data as any;
  assert(data.domain === "instamart", "Domain must be instamart");

  // Check exclusion list
  assert(data.excludedCandidates.length > 0, "Excluded candidates should contain safety-blocked items");
  const glutenExcluded = data.excludedCandidates.find((e: any) => e.candidate?.id === "insta-prod-prod_103");
  assert(glutenExcluded !== undefined, "Whole Wheat Bread should be in excludedCandidates");
  assert(
    glutenExcluded.explanation.toLowerCase().includes("gluten") ||
    glutenExcluded.exclusionReasonCodes.includes("ALLERGEN_MATCH"),
    "Exclusion reason must reference allergen"
  );
});

await test("22. Ensure no Swiggy token leaks in responses", async () => {
  const sensitiveToken = "SUPER_SECRET_SWIGGY_BEARER_TOKEN_998877";
  const client = createMockInstamartMcpClient();

  const successResult = await executeInstamartRecommendation(
    mockProfileUser,
    { query: "oats" },
    {
      mcpClient: client,
      getTokenFn: async () => sensitiveToken,
    }
  );

  const successJson = JSON.stringify(successResult);
  assert(!successJson.includes(sensitiveToken), "Successful response must NOT leak Swiggy access token");

  const failClient = createMockInstamartMcpClient({ failStatus: 502 });
  const failResult = await executeInstamartRecommendation(
    mockProfileUser,
    { query: "oats" },
    {
      mcpClient: failClient,
      getTokenFn: async () => sensitiveToken,
    }
  );

  const failJson = JSON.stringify(failResult);
  assert(!failJson.includes(sensitiveToken), "Error response must NOT leak Swiggy access token");
});

await test("23. yourGoToItems fallback when query is omitted", async () => {
  let calledTool = "";
  const client = createMockInstamartMcpClient({
    captureLastRequest: (_url, _headers, body) => {
      calledTool = body?.params?.name;
    },
    products: [rawProductList[0]],
  });

  const result = await executeInstamartRecommendation(
    mockProfileUser,
    {}, // No query
    {
      mcpClient: client,
      getTokenFn: async () => "valid_token",
    }
  );

  assert(result.status === 200, "Should succeed without query");
  assert(calledTool === "your_go_to_items", `Expected tool your_go_to_items, got ${calledTool}`);
  const data = result.data as any;
  assert(data.recommendations.length > 0, "Should return recommendations from your_go_to_items");
});

await test("24. Batch normalizer skips invalid products without throwing", () => {
  const mixedRaw: any[] = [
    null,
    undefined,
    {}, // missing id
    { id: "valid_p1", name: "Apple Juice", price: 100 },
    { missing_id: true, name: "Bad item" },
    { productId: "valid_p2", name: "Orange Juice", price: 120 },
  ];

  const normalized = normalizeInstamartProductsBatch(mixedRaw);
  assert(normalized.length === 2, `Expected 2 valid normalized items, got ${normalized.length}`);
  assert(normalized[0].id === "insta-prod-valid_p1", "First normalized item ID mismatch");
  assert(normalized[1].id === "insta-prod-valid_p2", "Second normalized item ID mismatch");
});

await test("25. Dietary classification and veg tags preservation", () => {
  const vegRaw = { id: "veg_1", name: "Paneer 200g", isVeg: true };
  const nonVegRaw = { id: "nonveg_1", name: "Chicken Sausages", isVeg: false };

  const normVeg = normalizeSwiggyInstamartProduct(vegRaw);
  const normNonVeg = normalizeSwiggyInstamartProduct(nonVegRaw);

  assert(normVeg.safetyData.dietaryClassification?.vegetarian === true, "Veg item must have vegetarian: true");
  assert(normNonVeg.safetyData.dietaryClassification?.vegetarian === false, "Non-veg item must have vegetarian: false");
  assert(normNonVeg.safetyData.dietaryClassification?.containsMeat === true, "Non-veg item must have containsMeat: true");
});

await test("26. Rating preservation", () => {
  const rated = { id: "rate_1", name: "Protein Bar", rating: 4.7 };
  const normalized = normalizeSwiggyInstamartProduct(rated);
  assert(normalized.sourceMetadata.rating === 4.7, "Rating 4.7 must be preserved");
});

await test("27. Domain isolation: candidates strictly instamart", async () => {
  const client = createMockInstamartMcpClient({ products: rawProductList });
  const result = await executeInstamartRecommendation(
    mockProfileUser,
    { query: "groceries" },
    {
      mcpClient: client,
      getTokenFn: async () => "valid_token",
    }
  );

  const data = result.data as any;
  assert(data.domain === "instamart", "Result domain must be instamart");
  for (const rec of data.recommendations) {
    assert(rec.candidate.domain === "instamart", "Every candidate domain must be instamart");
    assert(rec.candidate.id.startsWith("insta-prod-"), "Candidate ID must start with insta-prod-");
  }
});

await test("28. Real production Swiggy Instamart MCP endpoint reachability", async () => {
  // Test direct HTTP reachability of Swiggy Instamart MCP server without tokens (expects 401 unauth)
  // Per rules: Work ONLY on local codebase, no browser, direct fetch check to official MCP URL
  try {
    const res = await fetch("https://mcp.swiggy.com/im", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name: "get_addresses", arguments: {} },
      }),
    });
    // Live endpoint without credentials should return 401 Unauthorized
    assert(res.status === 401, `Live Instamart MCP server returned status ${res.status} (expected 401 unauthorized)`);
  } catch (err: any) {
    // If offline or network unavailable in local environment, pass with notice
    console.log("    (Notice: Swiggy IM endpoint fetch skipped if offline)");
  }
});

await test("29. Complex nested cards extraction in extractInstamartProductsFromMcp", () => {
  const cardPayload = {
    cards: [
      {
        card: {
          gridElements: {
            infoWithStyle: {
              items: [
                { id: "card_item_1", name: "Greek Feta Cheese", price: 320 },
                { id: "card_item_2", name: "Almond Butter", price: 450 },
              ],
            },
          },
        },
      },
    ],
  };

  const content = extractSwiggyMcpContent(cardPayload);
  const products = extractInstamartProductsFromMcp(content);
  assert(products.length === 2, `Expected 2 products from nested cards, got ${products.length}`);
  assert(products[0].name === "Greek Feta Cheese", "First item mismatch");
  assert(products[1].name === "Almond Butter", "Second item mismatch");
});

await test("30. Instamart recommendation response adheres strictly to schema", async () => {
  const client = createMockInstamartMcpClient({ products: rawProductList });
  const result = await executeInstamartRecommendation(
    mockProfileUser,
    { query: "oats", limit: 2 },
    {
      mcpClient: client,
      getTokenFn: async () => "valid_token",
    }
  );

  const parsed = InstamartRecommendationResponseSchema.safeParse(result.data);
  assert(parsed.success === true, `Response schema validation failed: ${JSON.stringify((parsed as any).error?.errors)}`);
  assert((result.data as any).recommendations.length <= 2, "Limit of 2 respected");
});

await test("31. Expanded product name extraction from all real Swiggy fields", () => {
  const testCases = [
    { raw: { id: "n1", name: "Amul Butter 500g" }, expected: "Amul Butter 500g" },
    { raw: { id: "n2", display_name: "Nandini Milk 1L" }, expected: "Nandini Milk 1L" },
    { raw: { id: "n3", displayName: "Aashirvaad Atta 5kg" }, expected: "Aashirvaad Atta 5kg" },
    { raw: { id: "n4", item_name: "Tata Salt 1kg" }, expected: "Tata Salt 1kg" },
    { raw: { id: "n5", itemName: "Fortune Sunlite Oil 1L" }, expected: "Fortune Sunlite Oil 1L" },
    { raw: { id: "n6", product_name: "Maggi 2-Minute Noodles" }, expected: "Maggi 2-Minute Noodles" },
    { raw: { id: "n7", productName: "Britannia Bread 400g" }, expected: "Britannia Bread 400g" },
    { raw: { id: "n8", title: "Dettol Liquid Soap" }, expected: "Dettol Liquid Soap" },
    { raw: { id: "n9", product_title: "Surf Excel Matic 1kg" }, expected: "Surf Excel Matic 1kg" },
    { raw: { id: "n10", variations: [{ display_name: "Organic Honey 250g" }] }, expected: "Organic Honey 250g" },
    { raw: { id: "n11", variations: [{ name: "Organic Jaggery 500g" }] }, expected: "Organic Jaggery 500g" },
  ];

  for (const tc of testCases) {
    const normalized = normalizeSwiggyInstamartProduct(tc.raw);
    assert(normalized.name === tc.expected, `Failed for field: ${JSON.stringify(tc.raw)} (got: ${normalized.name})`);
    assert(normalized.name !== "Grocery Item", "Must NEVER produce Grocery Item fallback");
  }
});

await test("32. Instamart image object array parsing", () => {
  const rawWithUrlObj = {
    id: "img_obj_1",
    name: "Almonds 500g",
    images: [{ url: "https://media-assets.swiggy.com/swiggy/image/upload/almonds_url.jpg" }],
  };
  const n1 = normalizeSwiggyInstamartProduct(rawWithUrlObj);
  assert(n1.sourceMetadata.imageUrl === "https://media-assets.swiggy.com/swiggy/image/upload/almonds_url.jpg", "Must extract direct url");

  const rawWithImageIdObj = {
    id: "img_obj_2",
    name: "Cashews 200g",
    images: [{ imageId: "cashews_hash_123" }],
  };
  const n2 = normalizeSwiggyInstamartProduct(rawWithImageIdObj);
  assert(n2.sourceMetadata.imageUrl?.includes("cashews_hash_123") === true, "Must construct Swiggy CDN URL from imageId object");

  const rawWithImage_IdObj = {
    id: "img_obj_3",
    name: "Walnuts 250g",
    images: [{ image_id: "walnuts_hash_456" }],
  };
  const n3 = normalizeSwiggyInstamartProduct(rawWithImage_IdObj);
  assert(n3.sourceMetadata.imageUrl?.includes("walnuts_hash_456") === true, "Must construct Swiggy CDN URL from image_id object");

  const rawWithIdObj = {
    id: "img_obj_4",
    name: "Pistachios 100g",
    images: [{ id: "pista_hash_789" }],
  };
  const n4 = normalizeSwiggyInstamartProduct(rawWithIdObj);
  assert(n4.sourceMetadata.imageUrl?.includes("pista_hash_789") === true, "Must construct Swiggy CDN URL from id object");
});

await test("33. Real product names survive nested variation extraction", () => {
  const mcpPayload = {
    result: {
      structuredContent: {
        products: [
          {
            id: "parent_prod_1",
            name: "Tata Tea Gold",
            brand: "Tata",
            variations: [
              {
                id: "var_prod_101",
                spin_id: "spin_tea_500g",
                price: 280,
                mrp: 310,
                weight: "500g",
              },
            ],
          },
        ],
      },
    },
  };

  const content = extractSwiggyMcpContent(mcpPayload);
  const products = extractInstamartProductsFromMcp(content);
  assert(products.length >= 1, "Must extract product with variations");
  const normalized = normalizeSwiggyInstamartProduct(products[0]);
  assert(normalized.name === "Tata Tea Gold", "Variation must retain parent product name");
  assert(normalized.sourceMetadata.brand === "Tata", "Variation must retain parent brand");
  assert(normalized.price === 280, "Must have variation price");
});

await test("34. Backend adapter NEVER generates Grocery Item", () => {
  const mixedRaw: any[] = [
    { id: "p_clean_1" },
    { id: "p_clean_2", price: 100 },
    { id: "p_clean_3", inStock: true },
  ];

  for (const raw of mixedRaw) {
    const normalized = normalizeSwiggyInstamartProduct(raw);
    assert(normalized.name !== "Grocery Item", `Must NEVER produce Grocery Item, got: ${normalized.name}`);
    assert(normalized.name === undefined, `Expected undefined name when missing, got: ${normalized.name}`);
  }
});

console.log(`\n🎉 All ${passedCount} Phase 3 Part 3 Live Instamart Integration tests passed successfully!\n`);
