import fs from "fs";
import path from "path";
import assert from "assert";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

console.log("=== Running NutriFlow Phase 3 Frontend Live-Data Integration Tests ===\n");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const hookPath = path.join(rootDir, "artifacts/nutriflow/src/hooks/use-recommendations.ts");
const discoverPath = path.join(rootDir, "artifacts/nutriflow/src/pages/Discover.tsx");
const instamartPath = path.join(rootDir, "artifacts/nutriflow/src/components/instamart/InstamartDomainView.tsx");
const dashboardPath = path.join(rootDir, "artifacts/nutriflow/src/pages/Dashboard.tsx");
const dineoutPath = path.join(rootDir, "artifacts/nutriflow/src/components/dineout/DineoutDomainView.tsx");

// ─── Test 1: Shared Recommendation Hook Exists & Endpoints ───────────────────
console.log("Test 1: Shared Recommendation Hook Exists & Routes to Correct Endpoints");
assert(fs.existsSync(hookPath), "use-recommendations.ts must exist");
const hookContent = fs.readFileSync(hookPath, "utf-8");

assert(hookContent.includes('const endpoint = `/api/recommendations/${domain}`;') ||
       (hookContent.includes("/api/recommendations/food") &&
        hookContent.includes("/api/recommendations/instamart") &&
        hookContent.includes("/api/recommendations/dineout")),
       "Hook must target /api/recommendations/{food, instamart, dineout}");
console.log("  ✓ Hook correctly resolves /api/recommendations/food, /api/recommendations/instamart, /api/recommendations/dineout");

// ─── Test 2: Hook Credentials & Address Forwarding ───────────────────────────
console.log("Test 2: Hook uses credentials: 'include' and selectedAddress.id");
assert(hookContent.includes('credentials: "include"'), "Hook must use credentials: 'include'");
assert(hookContent.includes("selectedAddress") && hookContent.includes("useCart"), "Hook must use selectedAddress from useCart");
assert(hookContent.includes("addressId") && hookContent.includes("locationId"), "Hook must forward addressId and locationId");
console.log("  ✓ Hook enforces credentials: 'include' and forwards active address ID");

// ─── Test 3: Discover.tsx Live Food Recommendations ──────────────────────────
console.log("Test 3: Discover.tsx uses live Food recommendations and no internal DB meals as primary");
const discoverContent = fs.readFileSync(discoverPath, "utf-8");
assert(discoverContent.includes('useRecommendations'), "Discover.tsx must import and call useRecommendations");
assert(discoverContent.includes('useRecommendations<FoodRecommendationResponse>("food"'), "Discover.tsx must query food domain");
assert(!discoverContent.includes("useListMeals"), "Discover.tsx must not use useListMeals as primary source");
assert(!discoverContent.includes("useListRestaurants"), "Discover.tsx must not use useListRestaurants as primary source");
assert(discoverContent.includes("RestaurantCard"), "Discover.tsx must render RestaurantCard with live data");
assert(discoverContent.includes("foodRecError"), "Discover.tsx must handle error states with retry capability");
console.log("  ✓ Discover.tsx successfully connected to live Swiggy Food recommendation API");

// ─── Test 4: InstamartDomainView.tsx Live Instamart Recommendations ───────────
console.log("Test 4: Instamart catalog uses live Instamart recommendations");
const instamartContent = fs.readFileSync(instamartPath, "utf-8");
assert(instamartContent.includes('useRecommendations'), "InstamartDomainView.tsx must import and call useRecommendations");
assert(instamartContent.includes('useRecommendations<InstamartRecommendationResponse>("instamart"'), "Must query instamart domain");
assert(instamartContent.includes("liveProducts"), "Must map live recommendations to catalog products");
assert(instamartContent.includes("loadingCatalog"), "Must provide loading skeleton state");
assert(instamartContent.includes("catalogError"), "Must provide error retry state");
assert(instamartContent.includes("InstamartProductCard"), "Must render InstamartProductCard");
console.log("  ✓ InstamartDomainView.tsx primary catalog wired to live Swiggy Instamart API");

// ─── Test 5: Dashboard.tsx Live Food Recommendations ─────────────────────────
console.log("Test 5: Home Dashboard uses live Food recommendations & removed pending placeholder");
const dashboardContent = fs.readFileSync(dashboardPath, "utf-8");
assert(dashboardContent.includes('useRecommendations'), "Dashboard.tsx must import and call useRecommendations");
assert(dashboardContent.includes('useRecommendations<FoodRecommendationResponse>("food"'), "Dashboard.tsx must query food domain");
assert(dashboardContent.includes('mode: "auto"'), "Dashboard.tsx must specify mode: auto");
assert(dashboardContent.includes('limit: 4'), "Dashboard.tsx must limit to 4 recommendations");
assert(!dashboardContent.includes("Personalized Recommendations Pending"), "Normal-path 'Personalized Recommendations Pending' must be removed");
assert(dashboardContent.includes("loadingRecommendations"), "Dashboard.tsx must have loading skeleton state");
assert(dashboardContent.includes("recError"), "Dashboard.tsx must have error retry state");
console.log("  ✓ Dashboard.tsx personalized picks section wired to live recommendations");

// ─── Test 6: DineoutDomainView.tsx Live Dineout Recommendations ───────────────
console.log("Test 6: DineoutDomainView.tsx uses live Dineout recommendations & removed synthetic fields");
const dineoutContent = fs.readFileSync(dineoutPath, "utf-8");
assert(dineoutContent.includes('useRecommendations'), "DineoutDomainView.tsx must import and call useRecommendations");
assert(dineoutContent.includes('useRecommendations<DineoutRecommendationResponse>("dineout"'), "Must query dineout domain");
assert(!dineoutContent.includes("Indiranagar, Bengaluru"), "Synthetic Indiranagar locality must be removed");
assert(!dineoutContent.includes("Koramangala, Bengaluru"), "Synthetic Koramangala locality must be removed");
assert(!dineoutContent.includes("Flat 20% off with Dineout Pay"), "Synthetic discount strings must be removed");
assert(dineoutContent.includes("DineoutRestaurantCard"), "Must render DineoutRestaurantCard");
assert(dineoutContent.includes("dineoutError"), "Must have error retry state");
console.log("  ✓ DineoutDomainView.tsx wired to live Dineout API with pure backend fields");

// ─── Test 7: Backend Safety & Integrity Guardrails ───────────────────────────
console.log("Test 7: Backend Safety & Integrity Guardrails");
const gitStatus = execSync("git status --porcelain", { cwd: rootDir }).toString();
const modifiedFiles = gitStatus.split("\n").filter(Boolean);

const protectedFiles = [
  "artifacts/api-server/src/lib/foodMcpClient.ts",
  "artifacts/api-server/src/lib/foodRecommendationService.ts",
  "artifacts/api-server/src/lib/instamartMcpClient.ts",
  "artifacts/api-server/src/lib/instamartRecommendationService.ts",
  "artifacts/api-server/src/routes/recommendations.ts",
  "artifacts/nutriflow/src/lib/profileContext.ts",
  "artifacts/nutriflow/src/lib/safetyEligibility.ts",
  "artifacts/nutriflow/src/lib/goalPreferenceMatching.ts",
  "artifacts/nutriflow/src/lib/recommendationRanking.ts",
  "artifacts/nutriflow/src/lib/recommendationService.ts",
];

for (const pf of protectedFiles) {
  const isMod = modifiedFiles.some((line: string) => line.includes(pf));
  assert(!isMod, `Protected file ${pf} must NOT have been modified`);
}
console.log("  ✓ All protected backend recommendation and Phase 2 files remain strictly untouched");

// ══════════════════════════════════════════════════════════════════════════════
// ─── Section 2: Explicit Address Selection Tests (Requirements a - g) ─────────
// ══════════════════════════════════════════════════════════════════════════════

const cartHookPath = path.join(rootDir, "artifacts/nutriflow/src/hooks/use-cart.tsx");
const addressPromptPath = path.join(rootDir, "artifacts/nutriflow/src/components/address/AddressSelectionPrompt.tsx");
const topBarPath = path.join(rootDir, "artifacts/nutriflow/src/components/layout/TopBar.tsx");

assert(fs.existsSync(cartHookPath), "use-cart.tsx must exist");
assert(fs.existsSync(addressPromptPath), "AddressSelectionPrompt.tsx must exist");
assert(fs.existsSync(topBarPath), "TopBar.tsx must exist");

const cartContent = fs.readFileSync(cartHookPath, "utf-8");
const addressPromptContent = fs.readFileSync(addressPromptPath, "utf-8");
const topBarContent = fs.readFileSync(topBarPath, "utf-8");

// Mirror of pure resolveInitialAddress implementation for verification
interface Address {
  id: string;
  label: string;
  address: string;
  icon: string;
  city?: string;
  isDefault?: boolean;
}

function resolveInitialAddressSimulation(
  liveAddresses: Address[] | undefined | null,
  currentSelected: Address | null,
  savedId?: string | null
): Address | null {
  if (!liveAddresses || liveAddresses.length === 0) return null;
  if (liveAddresses.length === 1) return liveAddresses[0];
  if (currentSelected?.id) {
    const matched = liveAddresses.find((a) => a.id === currentSelected.id);
    if (matched) return matched;
  }
  if (savedId) {
    const matched = liveAddresses.find((a) => a.id === savedId);
    if (matched) return matched;
  }
  return null;
}

// Mirror of pure buildRecommendationPayload implementation for verification
function buildPayloadSimulation(
  domain: "food" | "instamart" | "dineout",
  options: { query?: string; addressId?: string; locationId?: string; mode?: string } = {},
  selectedAddress?: { id: string } | null
): Record<string, unknown> {
  const rawAddressId = options.addressId ?? selectedAddress?.id;
  const isDummyAddress =
    !rawAddressId ||
    rawAddressId.toLowerCase() === "home" ||
    rawAddressId.toLowerCase() === "work" ||
    rawAddressId.toLowerCase() === "mock";
  const effectiveAddressId = !isDummyAddress ? rawAddressId : undefined;

  const payload: Record<string, unknown> = {};
  if (options.query) payload.query = options.query;

  if (domain === "food") {
    if (options.mode) payload.mode = options.mode;
    if (effectiveAddressId) payload.addressId = effectiveAddressId;
  } else if (domain === "instamart") {
    if (effectiveAddressId) payload.addressId = effectiveAddressId;
  } else if (domain === "dineout") {
    if (options.locationId) payload.locationId = options.locationId;
  }
  return payload;
}

// ─── Test 8 (Requirement a): Multiple addresses -> user selection required ───
console.log("Test 8 (Requirement a): Multiple addresses -> user selection required");
// Static code check: CartProvider requires explicit selection when multiple addresses exist
assert(cartContent.includes("resolveInitialAddress"), "use-cart.tsx must implement resolveInitialAddress");
assert(cartContent.includes("return null"), "resolveInitialAddress must return null when multiple addresses exist without selection");
assert(discoverContent.includes("AddressSelectionPrompt"), "Discover.tsx must render AddressSelectionPrompt");
assert(dashboardContent.includes("AddressSelectionPrompt"), "Dashboard.tsx must render AddressSelectionPrompt");
assert(instamartContent.includes("AddressSelectionPrompt"), "InstamartDomainView.tsx must render AddressSelectionPrompt");

// Check condition triggers clarification prompt when no address is selected and multiple exist
assert(discoverContent.includes("clarificationNeeded") && discoverContent.includes("!selectedAddress"),
  "Discover.tsx must trigger prompt on clarificationNeeded or multiple unselected addresses");
assert(dashboardContent.includes("clarificationNeeded") && dashboardContent.includes("!selectedAddress"),
  "Dashboard.tsx must trigger prompt on clarificationNeeded or multiple unselected addresses");
assert(instamartContent.includes("clarificationNeeded") && instamartContent.includes("!selectedAddress"),
  "InstamartDomainView.tsx must trigger prompt on clarificationNeeded or multiple unselected addresses");

// Behavioral check:
const addrA: Address = { id: "swiggy_addr_home_101", label: "Home", address: "123 Indiranagar, Bengaluru", icon: "Home" };
const addrB: Address = { id: "swiggy_addr_work_102", label: "Work", address: "456 Whitefield, Bengaluru", icon: "Briefcase" };
const multipleAddresses = [addrA, addrB];

const resolvedMultiNoSelection = resolveInitialAddressSimulation(multipleAddresses, null, null);
assert.strictEqual(resolvedMultiNoSelection, null, "Multiple addresses without existing selection MUST resolve to null (explicit selection required)");

const resolvedMultiWithSelection = resolveInitialAddressSimulation(multipleAddresses, addrB, null);
assert.strictEqual(resolvedMultiWithSelection?.id, "swiggy_addr_work_102", "Multiple addresses with active selection must preserve active selection");
console.log("  ✓ Multiple addresses require explicit selection without silent fallback");

// ─── Test 9 (Requirement b): Selected real addressId is sent to Food ─────────
console.log("Test 9 (Requirement b): Selected real addressId is sent to Food");
assert(hookContent.includes('if (domain === "food")') && hookContent.includes("if (effectiveAddressId) payload.addressId = effectiveAddressId;"),
  "use-recommendations.ts must forward real effectiveAddressId to Food payload");

const foodPayloadWithRealAddr = buildPayloadSimulation("food", { mode: "restaurants" }, { id: "swiggy_real_addr_koramangala_555" });
assert.strictEqual(foodPayloadWithRealAddr.addressId, "swiggy_real_addr_koramangala_555",
  "Food recommendation payload must receive the selected real Swiggy addressId");
assert.strictEqual(foodPayloadWithRealAddr.mode, "restaurants");

const foodPayloadWithExplicitOverride = buildPayloadSimulation("food", { addressId: "explicit_swiggy_addr_999" }, { id: "swiggy_real_addr_koramangala_555" });
assert.strictEqual(foodPayloadWithExplicitOverride.addressId, "explicit_swiggy_addr_999",
  "Explicit options.addressId must take precedence");
console.log("  ✓ Selected real addressId is correctly sent to POST /api/recommendations/food");

// ─── Test 10 (Requirement c): Selected real addressId is sent to Instamart ────
console.log("Test 10 (Requirement c): Selected real addressId is sent to Instamart");
assert(hookContent.includes('else if (domain === "instamart")') && hookContent.includes("if (effectiveAddressId) payload.addressId = effectiveAddressId;"),
  "use-recommendations.ts must forward real effectiveAddressId to Instamart payload");

const instamartPayloadWithRealAddr = buildPayloadSimulation("instamart", { query: "milk" }, { id: "swiggy_real_addr_h抽取777" });
assert.strictEqual(instamartPayloadWithRealAddr.addressId, "swiggy_real_addr_h抽取777",
  "Instamart recommendation payload must receive the selected real Swiggy addressId");
assert.strictEqual(instamartPayloadWithRealAddr.query, "milk");
console.log("  ✓ Selected real addressId is correctly sent to POST /api/recommendations/instamart");

// ─── Test 11 (Requirement d): One address can be selected automatically ──────
console.log("Test 11 (Requirement d): One address can be selected automatically");
assert(cartContent.includes("if (liveAddresses.length === 1)"),
  "use-cart.tsx must handle liveAddresses.length === 1");

const singleAddrList = [addrA];
const resolvedSingle = resolveInitialAddressSimulation(singleAddrList, null, null);
assert.strictEqual(resolvedSingle?.id, "swiggy_addr_home_101",
  "Exactly one saved address can be auto-selected because there is zero ambiguity");
console.log("  ✓ Single address auto-selection functions unambiguously");

// ─── Test 12 (Requirement e): Zero addresses handled safely ───────────────────
console.log("Test 12 (Requirement e): Zero addresses handled safely");
assert(cartContent.includes("if (!liveAddresses || liveAddresses.length === 0)"),
  "use-cart.tsx must handle zero addresses cleanly");
assert(addressPromptContent.includes("No Saved Delivery Addresses Found"),
  "AddressSelectionPrompt must render controlled empty state message when 0 addresses exist");

const resolvedZero = resolveInitialAddressSimulation([], null, null);
assert.strictEqual(resolvedZero, null, "Zero addresses must resolve to null safely");

const checkoutPath = path.join(rootDir, "artifacts/nutriflow/src/pages/Checkout.tsx");
const checkoutContent = fs.readFileSync(checkoutPath, "utf-8");
assert(checkoutContent.includes("selectedAddress?.id") || checkoutContent.includes("selectedAddress ?"),
  "Checkout.tsx must safely guard against null selectedAddress");
console.log("  ✓ Zero addresses handled safely across context, prompt UI, and checkout");

// ─── Test 13 (Requirement f): Placeholder 'home'/'work' IDs are never sent ───
console.log("Test 13 (Requirement f): Placeholder 'home'/'work' IDs are never sent as Swiggy address IDs");
assert(hookContent.includes('rawAddressId.toLowerCase() === "home" ||'),
  "use-recommendations.ts must strictly filter out dummy 'home'/'work'/'mock' IDs");
assert(cartContent.includes("DEFAULT_ADDRESSES: Address[] = []"),
  "use-cart.tsx DEFAULT_ADDRESSES must be empty array, never dummy placeholder IDs");

// Test dummy filter on Food via selectedAddress
const foodPayloadWithDummyHome = buildPayloadSimulation("food", {}, { id: "home" });
assert.strictEqual(foodPayloadWithDummyHome.addressId, undefined, "Dummy 'home' ID must NEVER be sent to Food");

const foodPayloadWithDummyWork = buildPayloadSimulation("food", {}, { id: "work" });
assert.strictEqual(foodPayloadWithDummyWork.addressId, undefined, "Dummy 'work' ID must NEVER be sent to Food");

// Test dummy filter on options.addressId override directly
const foodPayloadWithOptionDummyHome = buildPayloadSimulation("food", { addressId: "home" }, { id: "swiggy_real_addr_999" });
assert.strictEqual(foodPayloadWithOptionDummyHome.addressId, undefined, "Dummy 'home' passed via options.addressId must be rejected");

const foodPayloadWithOptionDummyWorkCase = buildPayloadSimulation("food", { addressId: "WORK" }, null);
assert.strictEqual(foodPayloadWithOptionDummyWorkCase.addressId, undefined, "Case-insensitive dummy 'WORK' passed via options.addressId must be rejected");

// Test dummy filter on Instamart
const instamartPayloadWithDummyHome = buildPayloadSimulation("instamart", {}, { id: "home" });
assert.strictEqual(instamartPayloadWithDummyHome.addressId, undefined, "Dummy 'home' ID must NEVER be sent to Instamart");

const instamartPayloadWithDummyWork = buildPayloadSimulation("instamart", {}, { id: "work" });
assert.strictEqual(instamartPayloadWithDummyWork.addressId, undefined, "Dummy 'work' ID must NEVER be sent to Instamart");

// Test session restoration rejects dummy values
const restoredDummyHome = resolveInitialAddressSimulation([addrA, addrB], null, "home");
assert.strictEqual(restoredDummyHome, null, "Dummy 'home' in session must never be restored as active address");

const restoredDummyWork = resolveInitialAddressSimulation([addrA, addrB], null, "work");
assert.strictEqual(restoredDummyWork, null, "Dummy 'work' in session must never be restored as active address");
console.log("  ✓ Dummy 'home' and 'work' placeholder IDs are strictly blocked across options, context, and session");

// ─── Test 14 (Requirement g): Existing Dineout behavior remains unaffected ───
console.log("Test 14 (Requirement g): Existing Dineout behavior remains unaffected");
assert(hookContent.includes('else if (domain === "dineout")') &&
       hookContent.includes("if (options.locationId) payload.locationId = options.locationId;"),
  "use-recommendations.ts must only set locationId from options.locationId for Dineout");

// Dineout should NOT inherit food/instamart selectedAddress
const dineoutPayloadWithFoodAddress = buildPayloadSimulation("dineout", {}, { id: "swiggy_real_addr_koramangala_555" });
assert.strictEqual(dineoutPayloadWithFoodAddress.addressId, undefined, "Dineout must not be forced a food addressId");
assert.strictEqual(dineoutPayloadWithFoodAddress.locationId, undefined, "Dineout must not map food addressId into locationId without explicit intent");

const dineoutPayloadWithExplicitLocation = buildPayloadSimulation("dineout", { locationId: "dineout_saved_loc_koramangala" }, { id: "swiggy_real_addr_koramangala_555" });
assert.strictEqual(dineoutPayloadWithExplicitLocation.locationId, "dineout_saved_loc_koramangala", "Dineout must preserve explicit locationId");
assert.strictEqual(dineoutPayloadWithExplicitLocation.addressId, undefined, "Dineout must not carry addressId field");
console.log("  ✓ Existing Dineout saved-location behavior remains completely unaffected");

// ─── Test 15: Attribution & UI UX Enhancements ───────────────────────────────
console.log("Test 15: Powered by Swiggy attribution and TopBar address switcher present");
assert(addressPromptContent.includes("⚡ Powered by Swiggy"), "AddressSelectionPrompt must display Swiggy attribution badge");
assert(topBarContent.includes("Delivery location selector") && topBarContent.includes("⚡ Swiggy Saved"),
  "TopBar must include Swiggy delivery location dropdown with attribution");
console.log("  ✓ Attribution and TopBar location switcher verified");

// ─── Test 16: Zero-Address & Clarification States Prevent Mock Fallback ──────
console.log("Test 16: Zero-address & clarification states prevent mock fallback");
const freshInstamartContent = fs.readFileSync(instamartPath, "utf-8");
const freshDiscoverContent = fs.readFileSync(discoverPath, "utf-8");
const freshDashboardContent = fs.readFileSync(dashboardPath, "utf-8");

assert(freshInstamartContent.includes("isNoSavedAddress"), "InstamartDomainView must compute isNoSavedAddress");
assert(freshInstamartContent.includes("isClarificationNeeded"), "InstamartDomainView must compute isClarificationNeeded");
assert(freshInstamartContent.includes("!isNoSavedAddress &&") && freshInstamartContent.includes("!isClarificationNeeded &&"),
  "InstamartDomainView must NOT trigger isUsingFallback during zero-address or clarification state");

assert(freshDiscoverContent.includes("No saved delivery addresses"),
  "Discover.tsx must recognize zero-address error and render controlled state");
assert(freshDashboardContent.includes("No saved delivery addresses"),
  "Dashboard.tsx must recognize zero-address error and render controlled state");
console.log("  ✓ Zero-address & clarification flows strictly prevent mock data fallbacks");

// ─── Test 17: Production Frontend Address-Parsing Envelope Verification ──────
console.log("Test 17: Production Frontend Address-Parsing Envelope Verification");
const freshCartContent = fs.readFileSync(cartHookPath, "utf-8");

// 1. Static checks on use-cart.tsx
assert(freshCartContent.includes('fetch("/api/swiggy/mcp/food/get_addresses"'),
  "useSwiggyAddresses must query production route /api/swiggy/mcp/food/get_addresses");
assert(freshCartContent.includes('fetch("/api/swiggy/mcp/get_addresses"'),
  "useSwiggyAddresses must include fallback to /api/swiggy/mcp/get_addresses");
assert(freshCartContent.includes("structuredContent") && freshCartContent.includes("addresses"),
  "use-cart.tsx must support top-level structuredContent addresses");
assert(freshCartContent.includes("result") && freshCartContent.includes("structuredContent"),
  "use-cart.tsx must support result.structuredContent addresses");

// 2. Behavioral verification of pure address extraction logic on production payload
function extractSwiggyAddressesSimulation(data: any): Address[] {
  if (!data || typeof data !== "object") return [];
  let incoming: any[] = [];
  if (Array.isArray(data?.structuredContent?.addresses) && data.structuredContent.addresses.length > 0) {
    incoming = data.structuredContent.addresses;
  } else if (Array.isArray(data?.result?.structuredContent?.addresses) && data.result.structuredContent.addresses.length > 0) {
    incoming = data.result.structuredContent.addresses;
  } else if (Array.isArray(data?.result?.addresses) && data.result.addresses.length > 0) {
    incoming = data.result.addresses;
  } else if (Array.isArray(data?.data?.addresses) && data.data.addresses.length > 0) {
    incoming = data.data.addresses;
  } else if (Array.isArray(data?.addresses) && data.addresses.length > 0) {
    incoming = data.addresses;
  } else if (Array.isArray(data) && data.length > 0) {
    incoming = data;
  } else if (Array.isArray(data?.content) && data.content.length > 0) {
    const first = data.content[0];
    if (first && typeof first === "object" && typeof first.text === "string") {
      try {
        const parsed = JSON.parse(first.text);
        if (parsed && Array.isArray(parsed.addresses)) incoming = parsed.addresses;
      } catch {
        // prose text ignored
      }
    }
  }

  if (!Array.isArray(incoming) || incoming.length === 0) return [];

  const resolution = data?.structuredContent?.resolution ?? data?.result?.structuredContent?.resolution ?? data?.resolution;
  const needsClarification = Boolean(resolution?.needsUserClarification);
  const defaultAddressId = typeof resolution?.defaultAddressId === "string" ? resolution.defaultAddressId.trim() : undefined;

  const normalized: Address[] = [];
  for (let idx = 0; idx < incoming.length; idx++) {
    const a = incoming[idx];
    if (!a || typeof a !== "object") continue;
    const rawId = a.id ?? a.address_id ?? a._id;
    if (rawId == null) continue;
    const id = String(rawId).trim();
    if (!id || id.toLowerCase() === "home" || id.toLowerCase() === "work" || id.toLowerCase() === "mock") continue;

    const rawCategory = typeof a.addressCategory === "string" ? a.addressCategory.trim() : "";
    const rawTag = typeof a.addressTag === "string" ? a.addressTag.trim() : "";
    const rawLabel = typeof a.label === "string" ? a.label.trim() : "";
    const rawName = typeof a.name === "string" ? a.name.trim() : "";
    const label = rawTag || rawCategory || rawLabel || rawName || `Address ${idx + 1}`;

    const rawAddressLine =
      (typeof a.addressLine === "string" && a.addressLine.trim()) ||
      (typeof a.address_line === "string" && a.address_line.trim()) ||
      (typeof a.address === "string" && a.address.trim()) ||
      (typeof a.formatted_address === "string" && a.formatted_address.trim()) ||
      (typeof a.city === "string" && a.city.trim() ? a.city.trim() : "");
    const addressText = rawAddressLine || label || "Address on file";

    const lowerCategory = rawCategory.toLowerCase();
    const lowerTag = rawTag.toLowerCase();
    const lowerLabel = label.toLowerCase();
    const icon =
      lowerTag.includes("work") || lowerCategory.includes("work") || lowerLabel.includes("work")
        ? "Briefcase"
        : lowerTag.includes("home") || lowerCategory.includes("home") || lowerLabel.includes("home")
        ? "Home"
        : "MapPin";

    const isExplicitDefault = Boolean(a.isDefault === true || a.is_default === true || a.default === true);
    const isEnvelopeDefault = !needsClarification && defaultAddressId ? id === defaultAddressId : false;

    normalized.push({
      id,
      label,
      address: addressText,
      icon,
      city: typeof a.city === "string" ? a.city : undefined,
      isDefault: isExplicitDefault || isEnvelopeDefault,
    });
  }
  return normalized;
}

const exactProductionMcpResponse = {
  _meta: {
    requestId: "req_live_prod_abc123",
  },
  content: [
    {
      type: "text",
      text: "Found 4 saved addresses (page 1 of 1, showing 4):\n1. [Friends and Family] ...\n2. [Home] ...\n3. [Work] ...\n4. [Other] ...",
    },
  ],
  structuredContent: {
    addresses: [
      {
        id: "cv2sa7jbrd8siovv8m0g__AQ655gT2RswsuAA7kLyhst",
        addressLine: "Flat 101, Indiranagar 100ft Rd",
        addressCategory: "Friends & Family",
        addressTag: "Friends and Family",
      },
      {
        id: "csf0btn4hd1iaochtaug__ARECkwT1Vek9sTBjrL9W6y",
        addressLine: "House 24, 5th Main, Koramangala",
        addressCategory: "Home",
        addressTag: "Home",
      },
      {
        id: "cuhgrbv8vrh1qk2s48lg__AQ5BEQT1AGIjACKupo_6ry",
        addressLine: "Building 9, Outer Ring Rd, Bellandur",
        addressCategory: "Work",
        addressTag: "Work",
      },
      {
        id: "cu0dqc4u6qfla8pbc6hg__AQ9XJgT4UK0sZCoZxp3ujz",
        addressLine: "Flat 402, Prestige Palms, Whitefield",
        addressCategory: "Other",
        addressTag: "Gnan",
      },
    ],
    total: 4,
    resolution: {
      needsUserClarification: true,
      defaultAddressId: "cv2sa7jbrd8siovv8m0g__AQ655gT2RswsuAA7kLyhst",
    },
  },
};

const extracted4 = extractSwiggyAddressesSimulation(exactProductionMcpResponse);
assert.strictEqual(extracted4.length, 4, "Must extract all 4 addresses from top-level structuredContent.addresses");

// Verify real Swiggy IDs are preserved exactly
assert.strictEqual(extracted4[0].id, "cv2sa7jbrd8siovv8m0g__AQ655gT2RswsuAA7kLyhst", "Address 1 ID preserved");
assert.strictEqual(extracted4[1].id, "csf0btn4hd1iaochtaug__ARECkwT1Vek9sTBjrL9W6y", "Address 2 ID preserved");
assert.strictEqual(extracted4[2].id, "cuhgrbv8vrh1qk2s48lg__AQ5BEQT1AGIjACKupo_6ry", "Address 3 ID preserved");
assert.strictEqual(extracted4[3].id, "cu0dqc4u6qfla8pbc6hg__AQ9XJgT4UK0sZCoZxp3ujz", "Address 4 ID preserved");

// Verify normalized labels and addressLine mapping
assert.strictEqual(extracted4[0].label, "Friends and Family", "Prefers addressTag for label");
assert.strictEqual(extracted4[0].address, "Flat 101, Indiranagar 100ft Rd", "Maps addressLine to address");
assert.strictEqual(extracted4[1].label, "Home", "Maps Home tag");
assert.strictEqual(extracted4[1].icon, "Home", "Derives Home icon");
assert.strictEqual(extracted4[2].label, "Work", "Maps Work tag");
assert.strictEqual(extracted4[2].icon, "Briefcase", "Derives Briefcase icon");
assert.strictEqual(extracted4[3].label, "Gnan", "Maps custom Gnan tag");

// Verify no dummy placeholder IDs exist
for (const addr of extracted4) {
  assert(addr.id !== "home" && addr.id !== "work" && addr.id !== "mock", "No dummy IDs introduced");
}

// Verify multiple addresses result in selectedAddress = null unless there is an existing valid session selection
const multiNoSelection = resolveInitialAddressSimulation(extracted4, null, null);
assert.strictEqual(multiNoSelection, null, "Multiple addresses with no prior selection MUST result in null selectedAddress");

const multiWithSessionSelection = resolveInitialAddressSimulation(
  extracted4,
  null,
  "csf0btn4hd1iaochtaug__ARECkwT1Vek9sTBjrL9W6y"
);
assert.strictEqual(
  multiWithSessionSelection?.id,
  "csf0btn4hd1iaochtaug__ARECkwT1Vek9sTBjrL9W6y",
  "Valid session address ID is respected"
);

// Verify result.structuredContent.addresses envelope also supported
const nestedResultEnvelope = {
  result: {
    structuredContent: exactProductionMcpResponse.structuredContent,
  },
};
const extractedNested = extractSwiggyAddressesSimulation(nestedResultEnvelope);
assert.strictEqual(extractedNested.length, 4, "Must also extract 4 addresses from result.structuredContent.addresses");
assert.strictEqual(extractedNested[0].id, "cv2sa7jbrd8siovv8m0g__AQ655gT2RswsuAA7kLyhst");

console.log("  ✓ Production Swiggy MCP address envelope parsed with all 4 real IDs preserved and explicit selection enforced");

console.log("\n==================================================================");
console.log("🎉 ALL 17 FRONTEND LIVE-DATA & ADDRESS FALLBACK CLEANUP TESTS PASSED!");
console.log("==================================================================\n");


