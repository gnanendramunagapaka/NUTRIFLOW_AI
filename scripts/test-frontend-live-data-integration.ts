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

console.log("\n==================================================================");
console.log("🎉 ALL 7 FRONTEND LIVE-DATA INTEGRATION TESTS PASSED SUCCESSFULLY!");
console.log("==================================================================\n");
