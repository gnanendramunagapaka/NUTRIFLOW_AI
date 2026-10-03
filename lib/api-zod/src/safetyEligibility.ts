import { z } from "zod";
import { type ProfileContext, ProfileContextSchema } from "./profileContext";

// ─── 1. Candidate Safety Data Contract ────────────────────────────────────────

/**
 * Dietary classification attributes of a candidate item.
 * All fields are optional because different domains (Food, Instamart, Dineout)
 * may provide varying levels of structured metadata.
 */
export const DietaryClassificationSchema = z.object({
  vegetarian: z.boolean().optional(),
  vegan: z.boolean().optional(),
  containsEgg: z.boolean().optional(),
  containsMeat: z.boolean().optional(),
  containsSeafood: z.boolean().optional(),
  containsDairy: z.boolean().optional(),
});

export type DietaryClassification = z.infer<typeof DietaryClassificationSchema>;

/**
 * Normalized safety data contract for a candidate item across any commerce domain.
 * Unknown fields must remain undefined rather than assumed safe or dangerous.
 */
export const CandidateSafetyDataSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  domain: z.enum(["food", "instamart", "dineout"]).optional(),
  dietaryClassification: DietaryClassificationSchema.optional(),
  allergens: z.array(z.string()).optional(),
  ingredients: z.array(z.string()).optional(),
  safetyDataSource: z.string().optional(),
});

export type CandidateSafetyData = z.infer<typeof CandidateSafetyDataSchema>;

// ─── 2. Eligibility Result & Reason Types ─────────────────────────────────────

export const EligibilityStatusSchema = z.enum(["eligible", "ineligible", "unknown"]);
export type EligibilityStatus = z.infer<typeof EligibilityStatusSchema>;

export const EligibilityReasonCodeSchema = z.enum([
  "ALLERGEN_MATCH",
  "DIETARY_MISMATCH",
  "FOOD_AVOIDANCE_MATCH",
  "INSUFFICIENT_SAFETY_DATA",
]);
export type EligibilityReasonCode = z.infer<typeof EligibilityReasonCodeSchema>;

export const EligibilityConstraintTypeSchema = z.enum([
  "allergy",
  "dietary_pattern",
  "food_avoidance",
  "data_sufficiency",
]);
export type EligibilityConstraintType = z.infer<typeof EligibilityConstraintTypeSchema>;

export const EligibilityReasonSchema = z.object({
  code: EligibilityReasonCodeSchema,
  type: EligibilityConstraintTypeSchema,
  constraint: z.string(),
  message: z.string(),
  severity: z.enum(["ineligible", "unknown"]),
});
export type EligibilityReason = z.infer<typeof EligibilityReasonSchema>;

export const EligibilityResultSchema = z.object({
  candidateId: z.string(),
  status: EligibilityStatusSchema,
  reasons: z.array(EligibilityReasonSchema),
});
export type EligibilityResult = z.infer<typeof EligibilityResultSchema>;

// ─── 3. Helper Functions for Matching ─────────────────────────────────────────

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Checks if a specific allergen or ingredient token matches a list of candidate strings.
 * Performs whole-word or boundary-aware substring matching.
 */
function matchesItemOrIngredient(target: string, candidateList?: string[]): string | null {
  if (!candidateList || candidateList.length === 0) return null;
  const normalizedTarget = normalizeText(target);
  if (!normalizedTarget) return null;

  for (const item of candidateList) {
    const normalizedItem = normalizeText(item);
    if (!normalizedItem) continue;

    // Exact match
    if (normalizedItem === normalizedTarget) {
      return item;
    }

    // Substring with word boundaries (e.g., "peanut" in "roasted peanuts" or "peanut butter")
    const regex = new RegExp(`\\b${normalizedTarget}\\b`, "i");
    if (regex.test(normalizedItem)) {
      return item;
    }

    // Plural/singular normalization (e.g. "peanuts" matches "peanut")
    if (normalizedTarget.endsWith("s") && normalizedTarget.slice(0, -1) === normalizedItem) {
      return item;
    }
    if (normalizedItem.endsWith("s") && normalizedItem.slice(0, -1) === normalizedTarget) {
      return item;
    }
  }

  return null;
}

// ─── 4. Reusable Deterministic Eligibility Evaluator ──────────────────────────

/**
 * Evaluates a candidate item against a user's persistent ProfileContext.
 *
 * Enforces hard constraints:
 * 1. Allergies (Hard safety constraint: match -> INELIGIBLE, no data -> UNKNOWN)
 * 2. Dietary Pattern (Vegetarian, Vegan, Eggetarian: contradiction -> INELIGIBLE, no data -> UNKNOWN)
 * 3. Foods to Avoid (Voluntary user exclusion: match in ingredients -> INELIGIBLE)
 *
 * Rules:
 * - Deterministic, rule-based execution.
 * - NO LLMs, NO AI calls, NO subjective health rankings.
 * - Does not silently convert UNKNOWN into ELIGIBLE.
 * - Does not mutate inputs.
 */
export function evaluateCandidateEligibility(
  profile: ProfileContext,
  candidate: CandidateSafetyData
): EligibilityResult {
  const reasons: EligibilityReason[] = [];

  const candidateId = candidate.id;
  const userDietary = profile.dietary;

  // ─── Rule A: Hard Allergies Constraint ──────────────────────────────────────
  const userAllergies = (userDietary?.allergies || []).filter(
    (a) => a && normalizeText(a) !== "none"
  );

  if (userAllergies.length > 0) {
    const hasAllergenData = Array.isArray(candidate.allergens);
    const hasIngredientData = Array.isArray(candidate.ingredients);

    // If candidate completely lacks allergen and ingredient data, allergy safety is UNKNOWN
    if (!hasAllergenData && !hasIngredientData) {
      for (const allergy of userAllergies) {
        reasons.push({
          code: "INSUFFICIENT_SAFETY_DATA",
          type: "allergy",
          constraint: allergy,
          message: `Candidate lacks structured allergen and ingredient data to verify absence of "${allergy}".`,
          severity: "unknown",
        });
      }
    } else {
      // Evaluate against declared allergens and ingredients
      for (const allergy of userAllergies) {
        const allergenMatch = matchesItemOrIngredient(allergy, candidate.allergens);
        const ingredientMatch = matchesItemOrIngredient(allergy, candidate.ingredients);
        const matched = allergenMatch || ingredientMatch;

        if (matched) {
          reasons.push({
            code: "ALLERGEN_MATCH",
            type: "allergy",
            constraint: allergy,
            message: `Candidate explicitly contains declared allergen: "${matched}".`,
            severity: "ineligible",
          });
        }
      }
    }
  }

  // ─── Rule B: Dietary Pattern Constraint ─────────────────────────────────────
  const rawDietaryPattern = userDietary?.dietaryPattern;
  const dietaryPattern = rawDietaryPattern ? normalizeText(rawDietaryPattern) : null;

  if (dietaryPattern && dietaryPattern !== "no specific preference") {
    const classification = candidate.dietaryClassification;

    if (!classification || Object.keys(classification).length === 0) {
      // User has a dietary pattern, but candidate has no classification data
      if (dietaryPattern !== "non-vegetarian") {
        reasons.push({
          code: "INSUFFICIENT_SAFETY_DATA",
          type: "dietary_pattern",
          constraint: rawDietaryPattern!,
          message: `Candidate lacks dietary classification metadata to verify "${rawDietaryPattern}" status.`,
          severity: "unknown",
        });
      }
    } else {
      // User is Vegetarian
      if (dietaryPattern === "vegetarian") {
        const isNonVeg =
          classification.vegetarian === false ||
          classification.containsMeat === true ||
          classification.containsSeafood === true ||
          classification.containsEgg === true;

        if (isNonVeg) {
          reasons.push({
            code: "DIETARY_MISMATCH",
            type: "dietary_pattern",
            constraint: "Vegetarian",
            message: "Candidate is explicitly classified as non-vegetarian or contains meat/seafood/egg.",
            severity: "ineligible",
          });
        } else if (classification.vegetarian !== true && classification.vegan !== true) {
          // Unclear vegetarian status
          reasons.push({
            code: "INSUFFICIENT_SAFETY_DATA",
            type: "dietary_pattern",
            constraint: "Vegetarian",
            message: "Candidate does not confirm vegetarian classification.",
            severity: "unknown",
          });
        }
      }

      // User is Vegan
      else if (dietaryPattern === "vegan") {
        const containsNonVegan =
          classification.vegan === false ||
          classification.containsDairy === true ||
          classification.containsEgg === true ||
          classification.containsMeat === true ||
          classification.containsSeafood === true ||
          matchesItemOrIngredient("dairy", candidate.allergens) !== null ||
          matchesItemOrIngredient("milk", candidate.allergens) !== null ||
          matchesItemOrIngredient("dairy", candidate.ingredients) !== null ||
          matchesItemOrIngredient("milk", candidate.ingredients) !== null ||
          matchesItemOrIngredient("cheese", candidate.ingredients) !== null ||
          matchesItemOrIngredient("paneer", candidate.ingredients) !== null ||
          matchesItemOrIngredient("ghee", candidate.ingredients) !== null ||
          matchesItemOrIngredient("butter", candidate.ingredients) !== null;

        if (containsNonVegan) {
          reasons.push({
            code: "DIETARY_MISMATCH",
            type: "dietary_pattern",
            constraint: "Vegan",
            message: "Candidate is explicitly non-vegan or contains dairy/egg/animal products.",
            severity: "ineligible",
          });
        } else if (classification.vegan !== true) {
          reasons.push({
            code: "INSUFFICIENT_SAFETY_DATA",
            type: "dietary_pattern",
            constraint: "Vegan",
            message: "Candidate does not confirm vegan classification.",
            severity: "unknown",
          });
        }
      }

      // User is Eggetarian
      else if (dietaryPattern === "eggetarian") {
        const containsMeatOrSeafood =
          classification.containsMeat === true ||
          classification.containsSeafood === true ||
          (classification.vegetarian === false && classification.containsEgg !== true);

        if (containsMeatOrSeafood) {
          reasons.push({
            code: "DIETARY_MISMATCH",
            type: "dietary_pattern",
            constraint: "Eggetarian",
            message: "Candidate is explicitly classified as containing meat or seafood.",
            severity: "ineligible",
          });
        } else if (
          classification.vegetarian !== true &&
          classification.vegan !== true &&
          classification.containsEgg !== true
        ) {
          reasons.push({
            code: "INSUFFICIENT_SAFETY_DATA",
            type: "dietary_pattern",
            constraint: "Eggetarian",
            message: "Candidate does not confirm vegetarian or eggetarian classification.",
            severity: "unknown",
          });
        }
      }

      // Non-Vegetarian user: No restrictions enforced (vegetarian and non-veg items are both eligible)
    }
  }

  // ─── Rule C: Foods / Ingredients to Avoid Constraint ────────────────────────
  const userFoodsToAvoid = userDietary?.foodsToAvoid || [];
  if (userFoodsToAvoid.length > 0) {
    for (const avoidedItem of userFoodsToAvoid) {
      const match =
        matchesItemOrIngredient(avoidedItem, candidate.ingredients) ||
        matchesItemOrIngredient(avoidedItem, candidate.allergens);

      if (match) {
        reasons.push({
          code: "FOOD_AVOIDANCE_MATCH",
          type: "food_avoidance",
          constraint: avoidedItem,
          message: `Candidate explicitly contains avoided ingredient: "${match}".`,
          severity: "ineligible",
        });
      }
    }
  }

  // ─── Aggregate Three-State Status ───────────────────────────────────────────
  let status: EligibilityStatus = "eligible";

  const hasIneligible = reasons.some((r) => r.severity === "ineligible");
  const hasUnknown = reasons.some((r) => r.severity === "unknown");

  if (hasIneligible) {
    status = "ineligible";
  } else if (hasUnknown) {
    status = "unknown";
  } else {
    status = "eligible";
  }

  return {
    candidateId,
    status,
    reasons,
  };
}
