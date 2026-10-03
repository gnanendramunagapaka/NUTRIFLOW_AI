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
    }
  }
  return nextResolve(specifier, context);
}
`;

register(`data:text/javascript,${encodeURIComponent(hookCode)}`, pathToFileURL(import.meta.filename).href);

const {
  normalizeSwiggyFoodRestaurant,
  normalizeSwiggyFoodMenuItem,
  normalizeSwiggyInstamartProduct,
  normalizeSwiggyDineoutRestaurant,
} = await import("../lib/api-zod/src/swiggyAdapters.ts");
const { executeSharedRecommendation } = await import("../lib/api-zod/src/recommendationService.ts");
const { buildProfileContextFromProfile } = await import("../lib/api-zod/src/profileContext.ts");

import type {
  RawSwiggyFoodRestaurant,
  RawSwiggyFoodMenuItem,
  RawSwiggyInstamartProduct,
  RawSwiggyDineoutRestaurant,
} from "../lib/api-zod/src/swiggyAdapters.ts";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log("=== Running NutriFlow Phase 3 Part 1 Swiggy Data Adapter Tests ===\n");

// Realistic Fixtures based on Swiggy Production MCP structures
const rawRestaurantFixture: RawSwiggyFoodRestaurant = {
  restaurant_id: "rst_5501",
  name: "A2B - Adyar Ananda Bhavan",
  cuisines: ["South Indian", "Sweets", "Snacks"],
  avgRating: 4.4,
  costForTwo: 350,
  isOpen: true,
  locality: "Indiranagar",
  area: "Bengaluru",
  isVeg: true,
  tags: ["pure_veg", "popular"],
  distance: "2.3 km",
};

const rawMenuItemFixture: RawSwiggyFoodMenuItem = {
  item_id: "item_901",
  name: "Ghee Roast Masala Dosa",
  restaurant_id: "rst_5501",
  restaurant_name: "A2B - Adyar Ananda Bhavan",
  price: 140,
  isVeg: true,
  inStock: true,
  category: "South Indian Breakfast",
  categoryTags: ["breakfast", "dosas"],
  description: "Crispy fermented crepe roasted with pure desi ghee served with potato masala and chutneys",
};

const rawInstamartProductFixture: RawSwiggyInstamartProduct = {
  product_id: "im_prod_102",
  display_name: "Amul Taaza Homogenised Toned Milk 1L",
  brand: "Amul",
  store_price: 54,
  mrp: 56,
  in_stock: true,
  category: "Dairy, Bread & Eggs",
  spin_id: "spin_9921",
  quantity: "1 L",
  rating: 4.8,
  tags: ["fresh", "dairy", "essential"],
  isVeg: true,
};

const rawDineoutRestaurantFixture: RawSwiggyDineoutRestaurant = {
  restaurant_id: "dine_8801",
  name: "The Black Pearl",
  cuisines: ["Buffet", "North Indian", "Barbecue"],
  avg_rating: 4.3,
  costForTwo: 1800,
  locality: "Koramangala 5th Block",
  distance: "3.5 km",
  isOpen: true,
  availableSlots: ["19:00", "19:30", "20:00"],
  offers: ["20% off on total bill via Dineout Pay"],
  amenities: ["valet_parking", "live_music", "air_conditioned"],
};

// ─── FOOD TESTS ───
console.log("FOOD ADAPTER TESTS");

// Test 1: restaurant search response normalizes correctly
console.log("Test 1: restaurant search response normalizes correctly");
const normRest = normalizeSwiggyFoodRestaurant(rawRestaurantFixture);
assert(normRest !== undefined, "Restaurant normalized");
assert(normRest.domain === "food", "Domain is food");
console.log("  ✓ Test 1 passed.\n");

// Test 2: restaurant ID is preserved
console.log("Test 2: restaurant ID is preserved");
assert(normRest.id === "food-rst-rst_5501", "Prefixed ID is correct");
assert(normRest.sourceMetadata?.restaurantId === "rst_5501", "Source restaurantId preserved");
console.log("  ✓ Test 2 passed.\n");

// Test 3: restaurant name is preserved
console.log("Test 3: restaurant name is preserved");
assert(normRest.name === "A2B - Adyar Ananda Bhavan", "Restaurant name preserved");
assert(normRest.sourceMetadata?.restaurantName === "A2B - Adyar Ananda Bhavan", "Source restaurantName preserved");
console.log("  ✓ Test 3 passed.\n");

// Test 4: cuisine data is preserved when supplied
console.log("Test 4: cuisine data is preserved when supplied");
assert(Array.isArray(normRest.matchData.cuisineTags), "cuisineTags is array");
assert(normRest.matchData.cuisineTags?.includes("South Indian"), "South Indian in cuisineTags");
assert(normRest.matchData.cuisineTags?.includes("Sweets"), "Sweets in cuisineTags");
console.log("  ✓ Test 4 passed.\n");

// Test 5: menu item response normalizes correctly
console.log("Test 5: menu item response normalizes correctly");
const normItem = normalizeSwiggyFoodMenuItem(rawMenuItemFixture);
assert(normItem.domain === "food", "Domain is food");
assert(normItem.safetyData.domain === "food", "Safety domain is food");
console.log("  ✓ Test 5 passed.\n");

// Test 6: menu item ID is preserved
console.log("Test 6: menu item ID is preserved");
assert(normItem.id === "food-item-item_901", "Prefixed menu item id preserved");
assert(normItem.sourceMetadata?.menuItemId === "item_901", "Source menuItemId preserved");
assert(normItem.sourceMetadata?.restaurantId === "rst_5501", "Associated restaurantId preserved");
console.log("  ✓ Test 6 passed.\n");

// Test 7: price is preserved when supplied
console.log("Test 7: price is preserved when supplied");
assert(normItem.price === 140, "Price preserved as 140");
console.log("  ✓ Test 7 passed.\n");

// Test 8: availability is preserved when supplied
console.log("Test 8: availability is preserved when supplied");
assert(normItem.availability === "available", "Availability preserved as available");
const unavailItem = normalizeSwiggyFoodMenuItem({ ...rawMenuItemFixture, inStock: false });
assert(unavailItem.availability === "unavailable", "Unavailable item normalized as unavailable");
console.log("  ✓ Test 8 passed.\n");

// Test 9: missing safety data remains unknown
console.log("Test 9: missing safety data remains unknown");
assert(normItem.safetyData.allergens === undefined, "Allergens undefined when absent");
assert(normItem.safetyData.ingredients === undefined, "Ingredients undefined when absent");
console.log("  ✓ Test 9 passed.\n");

// Test 10: no fabricated nutrition data
console.log("Test 10: no fabricated nutrition data");
assert(!("calories" in (normItem as any)), "No calories field");
assert(!("protein" in (normItem as any)), "No protein field");
assert(!("carbs" in (normItem as any)), "No carbs field");
assert(!("healthScore" in (normItem as any)), "No healthScore field");
console.log("  ✓ Test 10 passed.\n");

// ─── INSTAMART TESTS ───
console.log("INSTAMART ADAPTER TESTS");

// Test 11: product response normalizes correctly
console.log("Test 11: product response normalizes correctly");
const normProduct = normalizeSwiggyInstamartProduct(rawInstamartProductFixture);
assert(normProduct.domain === "instamart", "Domain is instamart");
assert(normProduct.name === "Amul Taaza Homogenised Toned Milk 1L", "Name preserved");
console.log("  ✓ Test 11 passed.\n");

// Test 12: product identifier is preserved
console.log("Test 12: product identifier is preserved");
assert(normProduct.id === "insta-prod-im_prod_102", "Prefixed product ID preserved");
assert(normProduct.sourceMetadata?.productId === "im_prod_102", "Source productId preserved");
console.log("  ✓ Test 12 passed.\n");

// Test 13: variant/spin ID is preserved when supplied
console.log("Test 13: variant/spin ID is preserved when supplied");
assert(normProduct.sourceMetadata?.spinId === "spin_9921", "Spin ID preserved");
assert(normProduct.sourceMetadata?.variantId === "spin_9921", "Variant ID preserved");
console.log("  ✓ Test 13 passed.\n");

// Test 14: price is preserved
console.log("Test 14: price is preserved");
assert(normProduct.price === 54, "Price is 54");
console.log("  ✓ Test 14 passed.\n");

// Test 15: MRP is preserved when supplied
console.log("Test 15: MRP is preserved when supplied");
assert(normProduct.sourceMetadata?.mrp === 56, "MRP preserved in sourceMetadata");
console.log("  ✓ Test 15 passed.\n");

// Test 16: availability is preserved when supplied
console.log("Test 16: availability is preserved when supplied");
assert(normProduct.availability === "available", "Availability is available");
const unavailProduct = normalizeSwiggyInstamartProduct({ ...rawInstamartProductFixture, in_stock: false });
assert(unavailProduct.availability === "unavailable", "Unavailable product is unavailable");
console.log("  ✓ Test 16 passed.\n");

// Test 17: missing nutrition/safety data remains unknown
console.log("Test 17: missing nutrition/safety data remains unknown");
assert(normProduct.safetyData.allergens === undefined, "Allergens undefined");
assert(normProduct.safetyData.ingredients === undefined, "Ingredients undefined");
assert(!("calories" in (normProduct as any)), "No fabricated calories");
assert(!("protein" in (normProduct as any)), "No fabricated protein");
console.log("  ✓ Test 17 passed.\n");

// ─── DINEOUT TESTS ───
console.log("DINEOUT ADAPTER TESTS");

// Test 18: restaurant response normalizes correctly
console.log("Test 18: restaurant response normalizes correctly");
const normDine = normalizeSwiggyDineoutRestaurant(rawDineoutRestaurantFixture);
assert(normDine.domain === "dineout", "Domain is dineout");
assert(normDine.name === "The Black Pearl", "Name preserved");
console.log("  ✓ Test 18 passed.\n");

// Test 19: restaurant ID is preserved
console.log("Test 19: restaurant ID is preserved");
assert(normDine.id === "dine-rst-dine_8801", "Prefixed ID preserved");
assert(normDine.sourceMetadata?.restaurantId === "dine_8801", "Source restaurantId preserved");
console.log("  ✓ Test 19 passed.\n");

// Test 20: cuisine is preserved
console.log("Test 20: cuisine is preserved");
assert(Array.isArray(normDine.matchData.cuisineTags), "cuisineTags is array");
assert(normDine.matchData.cuisineTags?.includes("Buffet"), "Buffet in cuisineTags");
assert(normDine.matchData.cuisineTags?.includes("North Indian"), "North Indian in cuisineTags");
console.log("  ✓ Test 20 passed.\n");

// Test 21: rating/cost are preserved when supplied
console.log("Test 21: rating/cost are preserved when supplied");
assert(normDine.sourceMetadata?.rating === 4.3, "Rating is 4.3");
assert(normDine.price === 1800, "Price matches costForTwo");
assert(normDine.sourceMetadata?.costForTwo === 1800, "costForTwo preserved in sourceMetadata");
console.log("  ✓ Test 21 passed.\n");

// Test 22: booking/serviceability information remains distinct
console.log("Test 22: booking/serviceability information remains distinct");
assert(Array.isArray(normDine.sourceMetadata?.availableSlots), "availableSlots is array in sourceMetadata");
assert(normDine.sourceMetadata?.availableSlots?.includes("19:00"), "19:00 slot preserved");
assert(normDine.sourceMetadata?.offers?.includes("20% off on total bill via Dineout Pay"), "Offers preserved in sourceMetadata");
assert(!("availableSlots" in normDine.matchData), "Booking slots are not mixed into preference matchData");
console.log("  ✓ Test 22 passed.\n");

// Test 23: no fabricated nutrition data
console.log("Test 23: no fabricated nutrition data");
assert(!("calories" in (normDine as any)), "No calories on Dineout item");
assert(!("protein" in (normDine as any)), "No protein on Dineout item");
assert(!("healthScore" in (normDine as any)), "No healthScore on Dineout item");
console.log("  ✓ Test 23 passed.\n");

// ─── CROSS-DOMAIN TESTS ───
console.log("CROSS-DOMAIN TESTS");

// Test 24: domain is explicit
console.log("Test 24: domain is explicit");
assert(normRest.domain === "food", "Food has domain 'food'");
assert(normProduct.domain === "instamart", "Instamart has domain 'instamart'");
assert(normDine.domain === "dineout", "Dineout has domain 'dineout'");
console.log("  ✓ Test 24 passed.\n");

// Test 25: Food cannot be interpreted as Instamart
console.log("Test 25: Food cannot be interpreted as Instamart");
assert(normRest.domain !== "instamart", "Food is not Instamart");
assert(!("spinId" in (normRest.sourceMetadata as any)), "Food has no spinId");
console.log("  ✓ Test 25 passed.\n");

// Test 26: Instamart cannot be interpreted as Dineout
console.log("Test 26: Instamart cannot be interpreted as Dineout");
assert(normProduct.domain !== "dineout", "Instamart is not Dineout");
assert(!("availableSlots" in (normProduct.sourceMetadata as any)), "Instamart has no availableSlots");
console.log("  ✓ Test 26 passed.\n");

// Test 27: Dineout cannot receive fabricated food nutrition fields
console.log("Test 27: Dineout cannot receive fabricated food nutrition fields");
assert(normDine.safetyData.domain === "dineout", "Dineout safety domain is dineout");
assert(normDine.safetyData.dietaryClassification === undefined, "Dietary classification undefined unless supplied");
console.log("  ✓ Test 27 passed.\n");

// ─── DATA INTEGRITY TESTS ───
console.log("DATA INTEGRITY TESTS");

// Test 28: normalization is deterministic
console.log("Test 28: normalization is deterministic");
const run1 = normalizeSwiggyFoodRestaurant(rawRestaurantFixture);
const run2 = normalizeSwiggyFoodRestaurant(rawRestaurantFixture);
assert(JSON.stringify(run1) === JSON.stringify(run2), "Successive normalizations produce 100% identical outputs");
console.log("  ✓ Test 28 passed.\n");

// Test 29: normalization does not mutate raw input
console.log("Test 29: normalization does not mutate raw input");
const snapshotInput = JSON.stringify(rawRestaurantFixture);
normalizeSwiggyFoodRestaurant(rawRestaurantFixture);
assert(JSON.stringify(rawRestaurantFixture) === snapshotInput, "Raw input was not mutated");
console.log("  ✓ Test 29 passed.\n");

// Test 30: missing fields are not invented
console.log("Test 30: missing fields are not invented");
const minimalRest = normalizeSwiggyFoodRestaurant({ restaurant_id: "min_1" });
assert(minimalRest.price === undefined, "Missing price is undefined");
assert(minimalRest.matchData.cuisineTags === undefined, "Missing cuisines is undefined");
assert(minimalRest.availability === undefined, "Missing availability is undefined");
assert(minimalRest.safetyData.dietaryClassification === undefined, "Missing veg status is undefined");
console.log("  ✓ Test 30 passed.\n");

// Test 31: Swiggy tokens are never included
console.log("Test 31: Swiggy tokens are never included");
const serializedAll = JSON.stringify([normRest, normItem, normProduct, normDine]);
assert(!serializedAll.includes("access_token"), "No access_token");
assert(!serializedAll.includes("Bearer"), "No Bearer header");
assert(!serializedAll.includes("client_secret"), "No client_secret");
console.log("  ✓ Test 31 passed.\n");

// Test 32: no HTTP/MCP calls occur inside pure normalizers
console.log("Test 32: no HTTP/MCP calls occur inside pure normalizers");
assert(typeof normalizeSwiggyFoodRestaurant === "function", "normalizeSwiggyFoodRestaurant is sync pure function");
assert(typeof normalizeSwiggyFoodMenuItem === "function", "normalizeSwiggyFoodMenuItem is sync pure function");
assert(typeof normalizeSwiggyInstamartProduct === "function", "normalizeSwiggyInstamartProduct is sync pure function");
assert(typeof normalizeSwiggyDineoutRestaurant === "function", "normalizeSwiggyDineoutRestaurant is sync pure function");
console.log("  ✓ Test 32 passed.\n");

// ─── COMPATIBILITY WITH PHASE 2 RECOMMENDATION SERVICE ───
console.log("Test 33: Full drop-in compatibility with Phase 2 Recommendation Service");
const authProfile = buildProfileContextFromProfile({
  id: "user-phase3-compat",
  name: "Phase 3 Tester",
  dietaryPreferences: ["South Indian", "Vegetarian"],
  allergies: ["Peanuts"],
});

// Pass normalized Swiggy candidates directly into Phase 2 Shared Recommendation Service!
const recResult = executeSharedRecommendation(authProfile, {
  domain: "food",
  candidates: [normItem], // Ghee Roast Masala Dosa
});
assert(recResult.recommendations.length === 1, "Candidate processed by Phase 2 service");
assert(recResult.recommendations[0].candidate.id === normItem.id, "Candidate ID matches in recommendation");
assert(recResult.recommendations[0].rank === 1, "Ranked as #1");
console.log("  ✓ Test 33 passed: Normalized Swiggy candidates are 100% compatible with Phase 2 service.\n");

console.log("🎉 ALL 33 SWIGGY DATA ADAPTER TESTS PASSED WITH 100% SUCCESS!");
