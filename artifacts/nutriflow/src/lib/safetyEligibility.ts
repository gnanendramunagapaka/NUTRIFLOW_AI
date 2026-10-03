import { ProfileContext } from "./profileContext";

// ─── 1. Candidate Safety Data Contract ────────────────────────────────────────

export interface DietaryClassification {
  vegetarian?: boolean;
  vegan?: boolean;
  containsEgg?: boolean;
  containsMeat?: boolean;
  containsSeafood?: boolean;
  containsDairy?: boolean;
}

export interface CandidateSafetyData {
  id: string;
  name?: string;
  domain?: "food" | "instamart" | "dineout";
  dietaryClassification?: DietaryClassification;
  allergens?: string[];
  ingredients?: string[];
  safetyDataSource?: string;
}

// ─── 2. Eligibility Result & Reason Types ─────────────────────────────────────

export type EligibilityStatus = "eligible" | "ineligible" | "unknown";

export type EligibilityReasonCode =
  | "ALLERGEN_MATCH"
  | "DIETARY_MISMATCH"
  | "FOOD_AVOIDANCE_MATCH"
  | "INSUFFICIENT_SAFETY_DATA";

export type EligibilityConstraintType =
  | "allergy"
  | "dietary_pattern"
  | "food_avoidance"
  | "data_sufficiency";

export interface EligibilityReason {
  code: EligibilityReasonCode;
  type: EligibilityConstraintType;
  constraint: string;
  message: string;
  severity: "ineligible" | "unknown";
}

export interface EligibilityResult {
  candidateId: string;
  status: EligibilityStatus;
  reasons: EligibilityReason[];
}

// ─── 3. Helper Functions for Matching ─────────────────────────────────────────

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

function matchesItemOrIngredient(target: string, candidateList?: string[]): string | null {
  if (!candidateList || candidateList.length === 0) return null;
  const normalizedTarget = normalizeText(target);
  if (!normalizedTarget) return null;

  for (const item of candidateList) {
    const normalizedItem = normalizeText(item);
    if (!normalizedItem) continue;

    if (normalizedItem === normalizedTarget) {
      return item;
    }

    const regex = new RegExp(`\\b${normalizedTarget}\\b`, "i");
    if (regex.test(normalizedItem)) {
      return item;
    }

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
 * Evaluates candidate items against user's ProfileContext on the client.
 * Pure, deterministic, non-mutating.
 */
export function evaluateCandidateEligibility(
  profile: ProfileContext,
  candidate: CandidateSafetyData
): EligibilityResult {
  const reasons: EligibilityReason[] = [];
  const candidateId = candidate.id;
  const userDietary = profile.dietary;

  // Rule A: Hard Allergies Constraint
  const userAllergies = (userDietary?.allergies || []).filter(
    (a) => a && normalizeText(a) !== "none"
  );

  if (userAllergies.length > 0) {
    const hasAllergenData = Array.isArray(candidate.allergens);
    const hasIngredientData = Array.isArray(candidate.ingredients);

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

  // Rule B: Dietary Pattern Constraint
  const rawDietaryPattern = userDietary?.dietaryPattern;
  const dietaryPattern = rawDietaryPattern ? normalizeText(rawDietaryPattern) : null;

  if (dietaryPattern && dietaryPattern !== "no specific preference") {
    const classification = candidate.dietaryClassification;

    if (!classification || Object.keys(classification).length === 0) {
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
          reasons.push({
            code: "INSUFFICIENT_SAFETY_DATA",
            type: "dietary_pattern",
            constraint: "Vegetarian",
            message: "Candidate does not confirm vegetarian classification.",
            severity: "unknown",
          });
        }
      } else if (dietaryPattern === "vegan") {
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
      } else if (dietaryPattern === "eggetarian") {
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
    }
  }

  // Rule C: Foods to Avoid Constraint
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

  // Aggregate Three-State Status
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
