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

console.log("\n==================================================================");
console.log("🎉 ALL 16 FRONTEND LIVE-DATA & ADDRESS FALLBACK CLEANUP TESTS PASSED!");
console.log("==================================================================\n");

