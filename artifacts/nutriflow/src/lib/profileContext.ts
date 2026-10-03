/**
 * NutriFlow Profile Context Model & Normalizer (Frontend Foundation)
 *
 * Provides typed representation and deterministic transformation of user profile records.
 * Strictly separates persistent profile data from ephemeral request context.
 */

// ─── 1. Persistent Profile Context Types ─────────────────────────────────────

export interface ProfileIdentity {
  name: string;
  age: number | null;
}

export interface ProfileBody {
  height: number | null; // Height in cm
  weight: number | null; // Weight in kg
}

export interface ProfileGoals {
  primaryGoal: string;
  secondaryGoals: string[];
}

export interface ProfileDietary {
  dietaryPattern: string | null;   // e.g. Vegetarian, Non-Vegetarian, Vegan, Eggetarian
  allergies: string[];            // Hard clinical safety constraints (e.g. Peanuts, Gluten)
  foodsToAvoid: string[];         // Ingredients/foods user excludes (not clinical allergies)
  likedFoods: string[];           // Ingredient/dish preferences (preference signals)
  dislikedFoods: string[];        // Ingredient/dish aversions (preference signals)
  cuisinePreferences: string[];   // Preferred cuisine traditions (e.g. South Indian, Pan-Asian)
}

export interface ProfileLifestyle {
  activityLevel: string | null;    // Workout frequency / physical activity level
  waterIntake: string | null;      // Daily hydration habit
  mealHabits: string | null;       // Meal rhythm / timing habit
}

export interface ProfileAccount {
  userId: string;
  swiggyUserId: string | null;
  email: string | null;
  onboardingCompleted: boolean;
  wellnessScore: number;
  streak: number;
}

export interface ProfileContext {
  identity: ProfileIdentity;
  body: ProfileBody;
  goals: ProfileGoals;
  dietary: ProfileDietary;
  lifestyle: ProfileLifestyle;
  account: ProfileAccount;
}

// ─── 2. Current Request / Context (Ephemeral, Request-Scoped) ─────────────────

export interface CurrentRequestContext {
  domain?: "food" | "instamart" | "dineout";
  mealOccasion?: "breakfast" | "morning_snack" | "lunch" | "evening_snack" | "dinner" | "late_night";
  craving?: string;
  temporaryBudget?: {
    maxAmount?: number;
    currency?: string;
    tier?: "budget" | "mid" | "premium";
  };
  location?: {
    latitude?: number;
    longitude?: number;
    locality?: string;
    addressText?: string;
  };
  orderingForOthers?: boolean;
  partySize?: number;
  requestTimestamp?: string;
}

export interface RecommendationInputContext {
  profile: ProfileContext;
  currentRequest?: CurrentRequestContext;
}

// ─── 3. Raw Profile Input ─────────────────────────────────────────────────────

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
  dietaryPreferences?: string[] | null;
  allergies?: string[] | null;
  workoutFrequency?: string | null;
  waterIntake?: string | null;
  mealHabits?: string | null;
  budget?: string | null;
  wellnessScore?: number | null;
  streak?: number | null;
  avatarUrl?: string | null;
}

const KNOWN_DIETARY_PATTERNS = new Set([
  "vegetarian",
  "non-vegetarian",
  "eggetarian",
  "vegan",
  "jain",
  "pescatarian",
  "no specific preference",
]);

// ─── 4. Deterministic Builder ─────────────────────────────────────────────────

/**
 * Pure, deterministic builder that transforms stored user profile records into a normalized ProfileContext.
 *
 * Rules:
 * 1. Preserves actual stored values without fabricating missing data.
 * 2. Missing optional values produce explicit empty/null representation (e.g., foodsToAvoid: []).
 * 3. Untangles dietary pattern from cuisine preferences.
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

  // Untangle dietary pattern and cuisine preferences from raw dietaryPreferences array
  const rawDietary = Array.isArray(input?.dietaryPreferences) ? input.dietaryPreferences : [];
  let dietaryPattern: string | null = null;
  const cuisinePreferences: string[] = [];

  for (const item of rawDietary) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();
    if (KNOWN_DIETARY_PATTERNS.has(lower)) {
      if (lower !== "no specific preference" && !dietaryPattern) {
        dietaryPattern = trimmed;
      }
    } else {
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

  return {
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
      secondaryGoals: [],
    },
    dietary: {
      dietaryPattern,
      allergies,
      foodsToAvoid: [],
      likedFoods: [],
      dislikedFoods: [],
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
}
