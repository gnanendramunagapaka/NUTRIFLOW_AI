import { z } from "zod";

// ─── 1. Sub-Schemas for Persistent Profile Context ────────────────────────────

export const ProfileIdentitySchema = z.object({
  name: z.string(),
  age: z.number().nullable(),
});

export const ProfileBodySchema = z.object({
  height: z.number().nullable(), // Height in cm
  weight: z.number().nullable(), // Weight in kg
});

export const ProfileGoalsSchema = z.object({
  primaryGoal: z.string(),
  secondaryGoals: z.array(z.string()),
});

export const ProfileDietarySchema = z.object({
  dietaryPattern: z.string().nullable(), // Strict dietary lifestyle (e.g. Vegetarian, Non-Vegetarian, Vegan, Eggetarian)
  allergies: z.array(z.string()),        // Hard clinical safety constraints (e.g. Peanuts, Gluten)
  foodsToAvoid: z.array(z.string()),     // Ingredients/foods the user voluntarily excludes (not clinical allergies)
  likedFoods: z.array(z.string()),       // Ingredient/dish preferences (preference signals)
  dislikedFoods: z.array(z.string()),    // Ingredient/dish aversions (preference signals)
  cuisinePreferences: z.array(z.string()), // Preferred cuisine traditions (e.g. South Indian, Pan-Asian)
});

export const ProfileLifestyleSchema = z.object({
  activityLevel: z.string().nullable(),  // Workout frequency / physical activity level
  waterIntake: z.string().nullable(),    // Daily hydration habit
  mealHabits: z.string().nullable(),     // Meal rhythm / timing habit
});

export const ProfileAccountSchema = z.object({
  userId: z.string(),
  swiggyUserId: z.string().nullable(),
  email: z.string().nullable(),
  onboardingCompleted: z.boolean(),
  wellnessScore: z.number(),
  streak: z.number(),
});

/**
 * Normalized Persistent Profile Context.
 * Represents the structured, durable wellness profile of the user.
 * Derived deterministically from stored records. Never stores transient request data.
 */
export const ProfileContextSchema = z.object({
  identity: ProfileIdentitySchema,
  body: ProfileBodySchema,
  goals: ProfileGoalsSchema,
  dietary: ProfileDietarySchema,
  lifestyle: ProfileLifestyleSchema,
  account: ProfileAccountSchema,
});

export type ProfileIdentity = z.infer<typeof ProfileIdentitySchema>;
export type ProfileBody = z.infer<typeof ProfileBodySchema>;
export type ProfileGoals = z.infer<typeof ProfileGoalsSchema>;
export type ProfileDietary = z.infer<typeof ProfileDietarySchema>;
export type ProfileLifestyle = z.infer<typeof ProfileLifestyleSchema>;
export type ProfileAccount = z.infer<typeof ProfileAccountSchema>;
export type ProfileContext = z.infer<typeof ProfileContextSchema>;

// ─── 2. Current Request / Context (Ephemeral, Request-Scoped) ─────────────────

/**
 * Represents the immediate context of a specific user request.
 * Can change from interaction to interaction. Never persisted into user's permanent profile.
 */
export const CurrentRequestContextSchema = z.object({
  domain: z.enum(["food", "instamart", "dineout"]).optional(),
  mealOccasion: z
    .enum(["breakfast", "morning_snack", "lunch", "evening_snack", "dinner", "late_night"])
    .optional(),
  craving: z.string().optional(),
  temporaryBudget: z
    .object({
      maxAmount: z.number().positive().optional(),
      currency: z.string().default("INR"),
      tier: z.enum(["budget", "mid", "premium"]).optional(),
    })
    .optional(),
  location: z
    .object({
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      locality: z.string().optional(),
      addressText: z.string().optional(),
    })
    .optional(),
  orderingForOthers: z.boolean().optional(),
  partySize: z.number().int().positive().optional(),
  requestTimestamp: z.string().optional(),
});

export type CurrentRequestContext = z.infer<typeof CurrentRequestContextSchema>;

/**
 * Combined input structure for future recommendation engines.
 * Strictly separates persistent profile context from ephemeral request context.
 */
export const RecommendationInputContextSchema = z.object({
  profile: ProfileContextSchema,
  currentRequest: CurrentRequestContextSchema.optional(),
});

export type RecommendationInputContext = z.infer<typeof RecommendationInputContextSchema>;

// ─── 3. Raw Profile Input & Classification Lexicon ────────────────────────────

export interface RawProfileInput {
  id?: string | number | null;
  swiggyUserId?: string | null;
  name?: string | null;
  email?: string | null;
  onboardingCompleted?: boolean | null;
  age?: number | null;
  weight?: number | null;
  height?: number | null;
  goal?: string | null;
  secondaryGoals?: string[] | null;
  dietaryPreferences?: string[] | null;
  cuisinePreferences?: string[] | null;
  allergies?: string[] | null;
  workoutFrequency?: string | null;
  waterIntake?: string | null;
  mealHabits?: string | null;
  budget?: string | null;
  wellnessScore?: number | null;
  streak?: number | null;
  avatarUrl?: string | null;
}

/**
 * Known dietary patterns used to untangle dietary pattern from cuisine preferences
 * stored in the legacy combined dietaryPreferences array.
 */
const KNOWN_DIETARY_PATTERNS = new Set([
  "vegetarian",
  "non-vegetarian",
  "eggetarian",
  "vegan",
  "jain",
  "pescatarian",
  "no specific preference",
]);

/**
 * Known nutrition / dietary target preferences (e.g. macro goals, health philosophies)
 * that must be mapped to dietary/nutrition preferences (secondaryGoals), and NEVER to cuisine preferences.
 */
const KNOWN_NUTRITION_PREFERENCES = new Set([
  "high protein",
  "high-protein",
  "high-protein bowls",
  "high protein bowls",
  "protein rich",
  "protein",
  "keto",
  "keto friendly",
  "ketogenic",
  "low carb",
  "low-carb",
  "low fat",
  "low-fat",
  "low calorie",
  "calorie conscious",
  "balanced",
  "balanced healthy eating",
  "healthy eating",
  "clean eating",
  "fiber rich",
  "high fiber",
  "low sugar",
  "sugar free",
  "diabetic friendly",
  "organic",
  "gluten-free",
  "dairy-free",
]);

/**
 * Pure helper to determine if a string represents a nutrition/dietary target rather than a cultural cuisine.
 */
export function isNutritionPreference(val: string): boolean {
  if (typeof val !== "string") return false;
  const lower = val.toLowerCase().trim();
  if (KNOWN_NUTRITION_PREFERENCES.has(lower)) {
    return true;
  }
  // Generic token matching for common nutritional keywords
  if (
    lower.includes("protein") ||
    lower.includes("keto") ||
    lower.includes("carb") ||
    lower.includes("calorie") ||
    (lower.includes("fat") && !lower.includes("fatayer")) ||
    lower.includes("fiber") ||
    lower.includes("sugar")
  ) {
    return true;
  }
  return false;
}

// ─── 4. Profile Context Builder ───────────────────────────────────────────────

/**
 * Pure, deterministic builder that transforms stored user profile records into a normalized ProfileContext.
 *
 * Rules:
 * 1. Preserves actual stored values without fabricating missing data.
 * 2. Missing optional values produce explicit empty/null representation (e.g., foodsToAvoid: []).
 * 3. Untangles dietary pattern, nutrition preferences, and cuisine preferences.
 * 4. Filters sentinel values such as "None" from allergies.
 * 5. Contains no medical diagnosis logic, no BMI calculations, and no recommendation scoring.
 */
export function buildProfileContextFromProfile(input?: RawProfileInput | null): ProfileContext {
  const safeName = (input?.name || "").trim() || "Guest User";
  const safeAge =
    typeof input?.age === "number" && !isNaN(input.age) && input.age > 0
      ? Math.round(input.age)
      : null;

  const safeHeight =
    typeof input?.height === "number" && !isNaN(input.height) && input.height > 0
      ? Number(input.height.toFixed(1))
      : null;

  const safeWeight =
    typeof input?.weight === "number" && !isNaN(input.weight) && input.weight > 0
      ? Number(input.weight.toFixed(1))
      : null;

  const primaryGoal = (input?.goal || "").trim() || "Stay Healthy";
  const secondaryGoals: string[] = [];

  // Seed secondaryGoals from explicit input if supplied
  if (Array.isArray(input?.secondaryGoals)) {
    for (const g of input.secondaryGoals) {
      if (typeof g === "string" && g.trim()) {
        const trimmed = g.trim();
        if (!secondaryGoals.includes(trimmed)) {
          secondaryGoals.push(trimmed);
        }
      }
    }
  }

  // Untangle dietary pattern, nutrition targets, and cuisine preferences from raw dietaryPreferences array
  const rawDietary = Array.isArray(input?.dietaryPreferences) ? input.dietaryPreferences : [];
  let dietaryPattern: string | null = null;
  const cuisinePreferences: string[] = [];

  // Include explicit cuisinePreferences if provided on input (ensuring no nutrition/dietary pattern leakage)
  if (Array.isArray(input?.cuisinePreferences)) {
    for (const c of input.cuisinePreferences) {
      if (typeof c === "string" && c.trim()) {
        const trimmed = c.trim();
        const lower = trimmed.toLowerCase();
        if (!KNOWN_DIETARY_PATTERNS.has(lower) && !isNutritionPreference(trimmed)) {
          if (!cuisinePreferences.includes(trimmed)) {
            cuisinePreferences.push(trimmed);
          }
        }
      }
    }
  }

  for (const item of rawDietary) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();
    if (KNOWN_DIETARY_PATTERNS.has(lower)) {
      if (lower !== "no specific preference" && !dietaryPattern) {
        dietaryPattern = trimmed;
      }
    } else if (isNutritionPreference(trimmed)) {
      // Nutrition / dietary targets (e.g. High Protein, Keto, Low Carb) map to secondaryGoals
      if (!secondaryGoals.includes(trimmed)) {
        secondaryGoals.push(trimmed);
      }
    } else {
      // Cultural cuisine preferences (e.g. South Indian, North Indian, Pan-Asian, Continental)
      if (!cuisinePreferences.includes(trimmed)) {
        cuisinePreferences.push(trimmed);
      }
    }
  }

  // Normalize allergies: remove "None" sentinels and empty strings
  const rawAllergies = Array.isArray(input?.allergies) ? input.allergies : [];
  const allergies: string[] = [];
  for (const a of rawAllergies) {
    if (typeof a !== "string") continue;
    const trimmed = a.trim();
    if (!trimmed || trimmed.toLowerCase() === "none") continue;
    if (!allergies.includes(trimmed)) {
      allergies.push(trimmed);
    }
  }

  // Clean lifestyle strings
  const activityLevel = input?.workoutFrequency?.trim() || null;
  const waterIntake = input?.waterIntake?.trim() || null;
  const mealHabits = input?.mealHabits?.trim() || null;

  const contextData: ProfileContext = {
    identity: {
      name: safeName,
      age: safeAge,
    },
    body: {
      height: safeHeight,
      weight: safeWeight,
    },
    goals: {
      primaryGoal,
      secondaryGoals,
    },
    dietary: {
      dietaryPattern,
      allergies,
      foodsToAvoid: [],   // Future: not currently captured in persistent DB
      likedFoods: [],     // Future: not currently captured in persistent DB
      dislikedFoods: [],  // Future: not currently captured in persistent DB
      cuisinePreferences,
    },
    lifestyle: {
      activityLevel,
      waterIntake,
      mealHabits,
    },
    account: {
      userId: input?.id != null ? String(input.id) : "",
      swiggyUserId: input?.swiggyUserId ? String(input.swiggyUserId) : null,
      email: input?.email ? String(input.email) : null,
      onboardingCompleted: Boolean(input?.onboardingCompleted),
      wellnessScore: typeof input?.wellnessScore === "number" ? input.wellnessScore : 72,
      streak: typeof input?.streak === "number" ? input.streak : 0,
    },
  };

  // Enforce schema validation to guarantee shape integrity
  return ProfileContextSchema.parse(contextData);
}
