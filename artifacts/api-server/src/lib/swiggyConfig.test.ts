import { loadSwiggyConfig, isValidUrl, getSanitizedSwiggyConfig } from "./swiggyConfig";

function runSwiggyConfigTests() {
  console.log("▶ Running TASK-003 Swiggy Configuration Verification Tests...\n");

  // Test 1: Load default configuration
  const config = loadSwiggyConfig({});
  if (config.clientId !== "nutriflow-ai") throw new Error("Test 1 Failed: default clientId");
  if (config.registerUrl !== "https://mcp.swiggy.com/auth/register") throw new Error("Test 1 Failed: default registerUrl");
  if (config.authorizationUrl !== "https://mcp.swiggy.com/auth/authorize") throw new Error("Test 1 Failed: default authorizationUrl");
  if (config.tokenUrl !== "https://mcp.swiggy.com/auth/token") throw new Error("Test 1 Failed: default tokenUrl");
  if (config.foodMcpUrl !== "https://mcp.swiggy.com/food") throw new Error("Test 1 Failed: default foodMcpUrl");
  if (config.instamartMcpUrl !== "https://mcp.swiggy.com/im") throw new Error("Test 1 Failed: default instamartMcpUrl");
  if (config.dineoutMcpUrl !== "https://mcp.swiggy.com/dineout") throw new Error("Test 1 Failed: default dineoutMcpUrl");
  if (config.redirectUri !== "https://nutriflow-ai.vercel.app/auth/callback/") throw new Error("Test 1 Failed: default redirectUri");
  console.log("✔ Test 1 PASS: Default configuration loaded successfully.");

  // Test 2: Custom environment overrides
  const custom = loadSwiggyConfig({
    SWIGGY_CLIENT_ID: "custom-client",
    SWIGGY_CLIENT_SECRET: "sec-123",
    SWIGGY_REDIRECT_URI: "https://nutriflow-ai.vercel.app/auth/callback/",
    SWIGGY_REGISTER_URL: "https://mcp.swiggy.com/auth/register",
    SWIGGY_FOOD_MCP_URL: "https://mcp.swiggy.com/food",
    SWIGGY_INSTAMART_MCP_URL: "https://mcp.swiggy.com/im",
    SWIGGY_DINEOUT_MCP_URL: "https://mcp.swiggy.com/dineout",
  });
  if (custom.clientId !== "custom-client") throw new Error("Test 2 Failed: custom clientId");
  if (custom.clientSecret !== "sec-123") throw new Error("Test 2 Failed: custom clientSecret");
  console.log("✔ Test 2 PASS: Custom environment overrides loaded successfully.");

  // Test 3: URL Validation
  if (!isValidUrl("https://mcp.swiggy.com/food")) throw new Error("Test 3 Failed: valid URL rejected");
  if (isValidUrl("not-a-valid-url")) throw new Error("Test 3 Failed: invalid URL accepted");
  console.log("✔ Test 3 PASS: URL validation function works correctly.");

  // Test 4: Malformed URL Rejection
  try {
    loadSwiggyConfig({ SWIGGY_AUTHORIZATION_URL: "invalid_url_string" });
    throw new Error("Test 4 Failed: malformed URL was not rejected");
  } catch (err: any) {
    if (!err.message.includes("Malformed URL")) throw err;
    console.log("✔ Test 4 PASS: Malformed URLs rejected with fatal error.");
  }

  // Test 5: Dynamic Client Registration configuration (No mandatory client secret required)
  const prodConfig = loadSwiggyConfig({ NODE_ENV: "production", SWIGGY_CLIENT_SECRET: "" });
  if (prodConfig.registerUrl !== "https://mcp.swiggy.com/auth/register") throw new Error("Test 5 Failed: registerUrl mismatch");
  console.log("✔ Test 5 PASS: Dynamic Client Registration configuration loaded without client secret requirement.");

  // Test 6: Sanitized config redacts secrets
  const sanitized = getSanitizedSwiggyConfig(custom);
  if (sanitized.clientSecret.includes("sec-123")) throw new Error("Test 6 Failed: secret was exposed in sanitized config");
  if (!sanitized.clientSecret.includes("REDACTED")) throw new Error("Test 6 Failed: secret missing REDACTED tag");
  console.log("✔ Test 6 PASS: Sanitized config redacts secrets safely.");

  console.log("\n🎉 All TASK-003 Swiggy Configuration Tests PASSED!");
}

runSwiggyConfigTests();
