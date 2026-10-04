import { z } from "zod";
import {
  RecommendationCandidateItemSchema,
  type RecommendationCandidateItem,
} from "./recommendationService";
import {
  type CandidateSafetyData,
  type DietaryClassification,
} from "./safetyEligibility";
import {
  type CandidateMatchData,
} from "./goalPreferenceMatching";
import {
  type AvailabilityStatus,
} from "./recommendationRanking";

// ─── 1. Swiggy Source Metadata Contract ───────────────────────────────────────

/**
 * Structured source identity metadata preserved from raw Swiggy responses.
 * Strictly decoupled from recommendation matching signals.
 * Never stores OAuth tokens or sensitive credentials.
 */
export const SwiggySourceMetadataSchema = z.object({
  source: z.literal("swiggy"),
  domain: z.enum(["food", "instamart", "dineout"]),
  restaurantId: z.string().optional(),
  restaurantName: z.string().optional(),
  menuItemId: z.string().optional(),
  productId: z.string().optional(),
  variantId: z.string().optional(),
  spinId: z.string().optional(),
  addressId: z.string().optional(),
  locality: z.string().optional(),
  rating: z.number().optional(),
  costForTwo: z.number().optional(),
  availableSlots: z.array(z.string()).optional(),
  mrp: z.number().optional(),
  brand: z.string().optional(),
  quantity: z.string().optional(),
  distance: z.string().optional(),
  offers: z.array(z.string()).optional(),
  imageUrl: z.string().optional(),
});

export type SwiggySourceMetadata = z.infer<typeof SwiggySourceMetadataSchema>;

/**
 * Normalized Swiggy Candidate contract.
 * Full drop-in compatibility with Phase 2 RecommendationCandidateItem.
 */
export const NormalizedSwiggyCandidateSchema = RecommendationCandidateItemSchema.extend({
  sourceMetadata: SwiggySourceMetadataSchema.optional(),
});

export type NormalizedSwiggyCandidate = z.infer<typeof NormalizedSwiggyCandidateSchema>;

// ─── 2. Raw Swiggy Response Types ─────────────────────────────────────────────

export interface RawSwiggyFoodRestaurant {
  id?: string | number;
  restaurant_id?: string | number;
  name?: string;
  cuisines?: string[] | string;
  avgRating?: number | string;
  rating?: number | string;
  costForTwo?: number | string;
  cost_for_two?: number | string;
  isOpen?: boolean;
  is_open?: boolean;
  opened?: boolean;
  locality?: string;
  area?: string;
  isVeg?: boolean | number;
  is_veg?: boolean | number;
  veg?: boolean | number;
  tags?: string[];
  distance?: number | string;
}

export interface RawSwiggyFoodMenuItem {
  id?: string | number;
  item_id?: string | number;
  name?: string;
  restaurantId?: string | number;
  restaurant_id?: string | number;
  restaurantName?: string;
  restaurant_name?: string;
  price?: number;
  defaultPrice?: number;
  isVeg?: boolean | number;
  is_veg?: boolean | number;
  veg?: boolean | number;
  inStock?: boolean | number;
  in_stock?: boolean | number;
  category?: string;
  categoryTags?: string[];
  description?: string;
  allergens?: string[];
  ingredients?: string[];
}

export interface RawSwiggyInstamartProduct {
  id?: string | number;
  productId?: string | number;
  product_id?: string | number;
  name?: string;
  display_name?: string;
  title?: string;
  product_name?: string;
  productName?: string;
  brand?: string;
  brand_name?: string;
  brandName?: string;
  price?: number | Record<string, unknown>;
  store_price?: number;
  storePrice?: number;
  offer_price?: number;
  offerPrice?: number;
  final_price?: number;
  finalPrice?: number;
  price_in_paise?: number | string;
  priceInPaise?: number | string;
  mrp?: number | Record<string, unknown>;
  mrp_price?: number;
  mrpPrice?: number;
  inStock?: boolean | number;
  in_stock?: boolean | number;
  inventory?: number;
  category?: string;
  category_name?: string;
  categoryName?: string;
  superCategory?: string;
  spin?: string | number;
  spin_id?: string | number;
  variant_id?: string | number;
  quantity?: string;
  weight?: string;
  unit?: string;
  pack_size?: string;
  packSize?: string;
  rating?: number | string;
  tags?: string[];
  isVeg?: boolean | number;
  is_veg?: boolean | number;
  allergens?: string[];
  ingredients?: string[];
  imageUrl?: string;
  image_url?: string;
  image?: string;
  images?: string[] | string;
  imageId?: string;
  image_id?: string;
  cloudinaryImageId?: string;
}

export interface RawSwiggyDineoutRestaurant {
  id?: string | number;
  restaurant_id?: string | number;
  name?: string;
  cuisine?: string[] | string;
  cuisines?: string[] | string;
  avg_rating?: number | string;
  rating?: number | string;
  costForTwo?: number | string;
  cost_for_two?: number | string;
  locality?: string;
  location?: string;
  distance?: number | string;
  isOpen?: boolean;
  is_open?: boolean;
  availableSlots?: string[];
  slots?: string[];
  offers?: string[] | string;
  amenities?: string[];
  tags?: string[];
  isVeg?: boolean | number;
  imageUrl?: string;
  image_url?: string;
  image?: string;
  images?: string[] | string;
  imageId?: string;
  image_id?: string;
  cloudinaryImageId?: string;
}

// ─── 3. Pure Normalization Helpers ─────────────────────────────────────────────

function cleanString(val?: unknown): string | undefined {
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseNumber(val?: unknown): number | undefined {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.]/g, "");
    if (!cleaned) return undefined;
    const num = Number(cleaned);
    return !isNaN(num) ? num : undefined;
  }
  return undefined;
}

function parseSwiggyImageUrl(val?: unknown): string | undefined {
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    return `https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_288,h_288,c_fit/${trimmed}`;
  }
  if (Array.isArray(val) && val.length > 0) {
    return parseSwiggyImageUrl(val[0]);
  }
  return undefined;
}

function parseCuisines(val?: unknown): string[] | undefined {
  if (Array.isArray(val)) {
    const list = val.map((item) => cleanString(item)).filter((c): c is string => Boolean(c));
    return list.length > 0 ? list : undefined;
  }
  if (typeof val === "string") {
    const list = val
      .split(/[,/|]/)
      .map((c) => cleanString(c))
      .filter((c): c is string => Boolean(c));
    return list.length > 0 ? list : undefined;
  }
  return undefined;
}

function parseAvailability(inStockVal?: unknown, isOpenVal?: unknown, inventoryVal?: unknown): AvailabilityStatus | undefined {
  if (inStockVal === true || inStockVal === 1) return "available";
  if (inStockVal === false || inStockVal === 0) return "unavailable";

  if (isOpenVal === true || isOpenVal === 1) return "available";
  if (isOpenVal === false || isOpenVal === 0) return "unavailable";

  if (typeof inventoryVal === "number") {
    return inventoryVal > 0 ? "available" : "unavailable";
  }

  return undefined;
}

function parseDietaryClassification(isVegVal?: unknown): {
  classification?: DietaryClassification;
  tags?: string[];
} {
  if (isVegVal === true || isVegVal === 1) {
    return {
      classification: { vegetarian: true },
      tags: ["vegetarian"],
    };
  }
  if (isVegVal === false || isVegVal === 0) {
    return {
      classification: { vegetarian: false, containsMeat: true },
      tags: ["non-vegetarian"],
    };
  }
  return {
    classification: undefined,
    tags: undefined,
  };
}

// ─── 4. Food Normalizers ──────────────────────────────────────────────────────

/**
 * Pure deterministic normalizer for Swiggy Food restaurant search responses.
 */
export function normalizeSwiggyFoodRestaurant(raw: RawSwiggyFoodRestaurant): NormalizedSwiggyCandidate {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid raw Food restaurant: expected object");
  }

  const rawId = raw.id ?? raw.restaurant_id;
  const idStr = rawId != null ? String(rawId).trim() : "";
  if (!idStr) {
    throw new Error("Invalid Food restaurant: missing id");
  }
  const id = `food-rst-${idStr}`;

  const name = cleanString(raw.name) || "Restaurant";
  const cuisineTags = parseCuisines(raw.cuisines);
  const rating = parseNumber(raw.avgRating ?? raw.rating);
  const costForTwo = parseNumber(raw.costForTwo ?? raw.cost_for_two);
  const price = costForTwo != null && costForTwo > 0 ? costForTwo : undefined;

  const availability = parseAvailability(undefined, raw.isOpen ?? raw.is_open ?? raw.opened);
  const { classification, tags: dietaryTags } = parseDietaryClassification(raw.isVeg ?? raw.is_veg ?? raw.veg);

  const locality = cleanString(raw.locality ?? raw.area);
  const distance = raw.distance != null ? String(raw.distance).trim() : undefined;

  const contextTags: string[] = [];
  if (locality) contextTags.push(locality);
  if (Array.isArray(raw.tags)) {
    for (const t of raw.tags) {
      const clean = cleanString(t);
      if (clean) contextTags.push(clean);
    }
  }

  const safetyData: CandidateSafetyData = {
    id,
    name,
    domain: "food",
    dietaryClassification: classification,
    allergens: undefined,
    ingredients: undefined,
    safetyDataSource: "swiggy_food_restaurant",
  };

  const matchData: CandidateMatchData = {
    id,
    name,
    cuisineTags,
    foodTags: undefined,
    dietaryTags,
    categoryTags: ["restaurant"],
    goalSignals: undefined,
  };

  const sourceMetadata: SwiggySourceMetadata = {
    source: "swiggy",
    domain: "food",
    restaurantId: idStr,
    restaurantName: name,
    rating,
    costForTwo,
    locality,
    distance,
  };

  return NormalizedSwiggyCandidateSchema.parse({
    id,
    name,
    domain: "food",
    safetyData,
    matchData,
    availability,
    price,
    contextTags: contextTags.length > 0 ? contextTags : undefined,
    categoryTags: ["restaurant"],
    sourceMetadata,
  });
}

/**
 * Pure deterministic normalizer for Swiggy Food menu item responses.
 */
export function normalizeSwiggyFoodMenuItem(raw: RawSwiggyFoodMenuItem): NormalizedSwiggyCandidate {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid raw Food menu item: expected object");
  }

  const rawId = raw.id ?? raw.item_id;
  const idStr = rawId != null ? String(rawId).trim() : "";
  if (!idStr) {
    throw new Error("Invalid Food menu item: missing id");
  }
  const id = `food-item-${idStr}`;

  const name = cleanString(raw.name) || "Menu Item";

  let price = parseNumber(raw.price ?? raw.defaultPrice);
  if (price != null && price <= 0) {
    price = undefined;
  }

  const availability = parseAvailability(raw.inStock ?? raw.in_stock);
  const { classification, tags: dietaryTags } = parseDietaryClassification(raw.isVeg ?? raw.is_veg ?? raw.veg);

  const category = cleanString(raw.category);
  const categoryTags: string[] = [];
  if (category) categoryTags.push(category);
  if (Array.isArray(raw.categoryTags)) {
    for (const c of raw.categoryTags) {
      const clean = cleanString(c);
      if (clean && !categoryTags.includes(clean)) categoryTags.push(clean);
    }
  }

  const allergens = Array.isArray(raw.allergens)
    ? raw.allergens.map((a) => cleanString(a)).filter((a): a is string => Boolean(a))
    : undefined;

  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients.map((i) => cleanString(i)).filter((i): i is string => Boolean(i))
    : undefined;

  const safetyData: CandidateSafetyData = {
    id,
    name,
    domain: "food",
    dietaryClassification: classification,
    allergens: allergens && allergens.length > 0 ? allergens : undefined,
    ingredients: ingredients && ingredients.length > 0 ? ingredients : undefined,
    safetyDataSource: "swiggy_food_menu",
  };

  const matchData: CandidateMatchData = {
    id,
    name,
    cuisineTags: undefined,
    foodTags: ingredients && ingredients.length > 0 ? ingredients : undefined,
    dietaryTags,
    categoryTags: categoryTags.length > 0 ? categoryTags : undefined,
    goalSignals: undefined,
  };

  const rawRestId = raw.restaurantId ?? raw.restaurant_id;
  const restaurantId = rawRestId != null ? String(rawRestId).trim() : undefined;
  const restaurantName = cleanString(raw.restaurantName ?? raw.restaurant_name);

  const sourceMetadata: SwiggySourceMetadata = {
    source: "swiggy",
    domain: "food",
    restaurantId,
    restaurantName,
    menuItemId: idStr,
  };

  return NormalizedSwiggyCandidateSchema.parse({
    id,
    name,
    domain: "food",
    safetyData,
    matchData,
    availability,
    price,
    categoryTags: categoryTags.length > 0 ? categoryTags : undefined,
    sourceMetadata,
  });
}

// ─── 5. Instamart Normalizers ─────────────────────────────────────────────────

/**
 * Pure deterministic normalizer for Swiggy Instamart product responses.
 */
export function normalizeSwiggyInstamartProduct(raw: RawSwiggyInstamartProduct): NormalizedSwiggyCandidate {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid raw Instamart product: expected object");
  }

  const rawId = raw.id ?? raw.productId ?? raw.product_id ?? (raw as any).spin ?? (raw as any).spin_id;
  const idStr = rawId != null ? String(rawId).trim() : "";
  if (!idStr) {
    throw new Error("Invalid Instamart product: missing id");
  }
  const id = `insta-prod-${idStr}`;

  const name = cleanString(
    raw.name ??
    raw.display_name ??
    raw.title ??
    raw.product_name ??
    raw.productName
  ) || "Grocery Item";
  const brand = cleanString(raw.brand ?? raw.brand_name ?? raw.brandName);

  // Price resolution: unpack nested price objects if present
  let rawPriceVal: unknown = raw.price;
  if (rawPriceVal && typeof rawPriceVal === "object") {
    const pObj = rawPriceVal as Record<string, unknown>;
    rawPriceVal = pObj.store_price ?? pObj.storePrice ?? pObj.offer_price ?? pObj.offerPrice ?? pObj.price;
  }
  let price = parseNumber(
    rawPriceVal ??
    raw.store_price ??
    raw.storePrice ??
    raw.offer_price ??
    raw.offerPrice ??
    raw.final_price ??
    raw.finalPrice ??
    (raw.price_in_paise ? Number(raw.price_in_paise) / 100 : undefined) ??
    (raw.priceInPaise ? Number(raw.priceInPaise) / 100 : undefined)
  );
  if (price != null && price <= 0) {
    price = undefined;
  }

  // MRP resolution: unpack nested mrp objects if present
  let rawMrpVal: unknown = raw.mrp;
  if (rawMrpVal && typeof rawMrpVal === "object") {
    const mObj = rawMrpVal as Record<string, unknown>;
    rawMrpVal = mObj.mrp ?? mObj.mrpPrice ?? mObj.price;
  }
  let mrp = parseNumber(
    rawMrpVal ??
    raw.mrpPrice ??
    raw.mrp_price ??
    (raw.price && typeof raw.price === "object" ? (raw.price as any).mrp : undefined)
  );
  if (mrp != null && mrp <= 0) {
    mrp = undefined;
  }

  // Fallback price to MRP if selling price was missing, or vice-versa
  if (price == null && mrp != null && mrp > 0) {
    price = mrp;
  }

  const availability = parseAvailability(raw.inStock ?? raw.in_stock, undefined, raw.inventory);
  const { classification, tags: dietaryTags } = parseDietaryClassification(raw.isVeg ?? raw.is_veg);

  const category = cleanString(raw.category ?? raw.category_name ?? raw.categoryName ?? raw.superCategory);
  const categoryTags: string[] = [];
  if (category) categoryTags.push(category);

  const quantity = cleanString(raw.quantity ?? raw.weight ?? raw.unit ?? raw.pack_size ?? raw.packSize);
  const rating = parseNumber(raw.rating);

  const rawSpinId = raw.spin ?? raw.spin_id ?? raw.variant_id;
  const spinId = rawSpinId != null ? String(rawSpinId).trim() : undefined;

  const rawImage =
    raw.imageUrl ??
    raw.image_url ??
    raw.image ??
    raw.images ??
    raw.imageId ??
    raw.image_id ??
    raw.cloudinaryImageId;
  const imageUrl = parseSwiggyImageUrl(rawImage);

  const allergens = Array.isArray(raw.allergens)
    ? raw.allergens.map((a) => cleanString(a)).filter((a): a is string => Boolean(a))
    : undefined;

  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients.map((i) => cleanString(i)).filter((i): i is string => Boolean(i))
    : undefined;

  const safetyData: CandidateSafetyData = {
    id,
    name,
    domain: "instamart",
    dietaryClassification: classification,
    allergens: allergens && allergens.length > 0 ? allergens : undefined,
    ingredients: ingredients && ingredients.length > 0 ? ingredients : undefined,
    safetyDataSource: "swiggy_instamart",
  };

  const foodTags: string[] = [];
  if (brand) foodTags.push(brand);
  if (Array.isArray(raw.tags)) {
    for (const t of raw.tags) {
      const clean = cleanString(t);
      if (clean && !foodTags.includes(clean)) foodTags.push(clean);
    }
  }

  const matchData: CandidateMatchData = {
    id,
    name,
    cuisineTags: undefined,
    foodTags: foodTags.length > 0 ? foodTags : undefined,
    dietaryTags,
    categoryTags: categoryTags.length > 0 ? categoryTags : undefined,
    goalSignals: undefined,
  };

  const sourceMetadata: SwiggySourceMetadata = {
    source: "swiggy",
    domain: "instamart",
    productId: idStr,
    spinId,
    variantId: spinId,
    brand,
    quantity,
    mrp,
    rating,
    imageUrl,
  };

  return NormalizedSwiggyCandidateSchema.parse({
    id,
    name,
    domain: "instamart",
    safetyData,
    matchData,
    availability,
    price,
    categoryTags: categoryTags.length > 0 ? categoryTags : undefined,
    sourceMetadata,
  });
}

// ─── 6. Dineout Normalizers ───────────────────────────────────────────────────

/**
 * Pure deterministic normalizer for Swiggy Dineout restaurant responses.
 */
export function normalizeSwiggyDineoutRestaurant(raw: RawSwiggyDineoutRestaurant): NormalizedSwiggyCandidate {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid raw Dineout restaurant: expected object");
  }

  const rawId = raw.id ?? raw.restaurant_id;
  const idStr = rawId != null ? String(rawId).trim() : "";
  if (!idStr) {
    throw new Error("Invalid Dineout restaurant: missing id");
  }
  const id = `dine-rst-${idStr}`;

  const name = cleanString(raw.name) || "Dineout Venue";
  const cuisineTags = parseCuisines(raw.cuisine ?? raw.cuisines);
  const rating = parseNumber(raw.avg_rating ?? raw.rating);
  const costForTwo = parseNumber(raw.costForTwo ?? raw.cost_for_two);
  const price = costForTwo != null && costForTwo > 0 ? costForTwo : undefined;

  const availability = parseAvailability(undefined, raw.isOpen ?? raw.is_open);
  const { classification, tags: dietaryTags } = parseDietaryClassification(raw.isVeg);

  const locality = cleanString(raw.locality ?? raw.location);
  const distance = raw.distance != null ? String(raw.distance).trim() : undefined;

  const contextTags: string[] = [];
  if (locality) contextTags.push(locality);
  if (Array.isArray(raw.amenities)) {
    for (const a of raw.amenities) {
      const clean = cleanString(a);
      if (clean) contextTags.push(clean);
    }
  }
  if (Array.isArray(raw.tags)) {
    for (const t of raw.tags) {
      const clean = cleanString(t);
      if (clean && !contextTags.includes(clean)) contextTags.push(clean);
    }
  }

  const availableSlots = Array.isArray(raw.availableSlots ?? raw.slots)
    ? (raw.availableSlots ?? raw.slots)!.map((s) => cleanString(s)).filter((s): s is string => Boolean(s))
    : undefined;

  const offers = Array.isArray(raw.offers)
    ? raw.offers.map((o) => cleanString(o)).filter((o): o is string => Boolean(o))
    : typeof raw.offers === "string"
      ? [raw.offers.trim()].filter(Boolean)
      : undefined;

  const safetyData: CandidateSafetyData = {
    id,
    name,
    domain: "dineout",
    dietaryClassification: classification,
    allergens: undefined,
    ingredients: undefined,
    safetyDataSource: "swiggy_dineout",
  };

  const matchData: CandidateMatchData = {
    id,
    name,
    cuisineTags,
    foodTags: undefined,
    dietaryTags,
    categoryTags: ["dineout_restaurant"],
    goalSignals: undefined,
  };

  const rawImage =
    raw.imageUrl ??
    raw.image_url ??
    raw.image ??
    raw.images ??
    raw.imageId ??
    raw.image_id ??
    raw.cloudinaryImageId;
  const imageUrl = parseSwiggyImageUrl(rawImage);

  const sourceMetadata: SwiggySourceMetadata = {
    source: "swiggy",
    domain: "dineout",
    restaurantId: idStr,
    restaurantName: name,
    rating,
    costForTwo,
    locality,
    distance,
    availableSlots: availableSlots && availableSlots.length > 0 ? availableSlots : undefined,
    offers: offers && offers.length > 0 ? offers : undefined,
    imageUrl,
  };

  return NormalizedSwiggyCandidateSchema.parse({
    id,
    name,
    domain: "dineout",
    safetyData,
    matchData,
    availability,
    price,
    contextTags: contextTags.length > 0 ? contextTags : undefined,
    categoryTags: ["dineout_restaurant"],
    sourceMetadata,
  });
}
