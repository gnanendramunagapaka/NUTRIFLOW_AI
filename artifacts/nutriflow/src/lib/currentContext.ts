import {
  type ProfileContext,
  type CurrentRequestContext,
  type RecommendationInputContext,
} from "./profileContext";

// ─── 1. Raw Current Request Input Contract ───────────────────────────────────

export interface RawCurrentRequestInput {
  domain?: string | null;
  mealOccasion?: string | null;
  craving?: string | null;
  temporaryBudget?: {
    maxAmount?: number | string | null;
    currency?: string | null;
    tier?: string | null;
  } | null;
  location?: {
    latitude?: number | string | null;
    longitude?: number | string | null;
    locality?: string | null;
    addressText?: string | null;
  } | null;
  orderingForOthers?: boolean | null;
  partySize?: number | string | null;
  requestTimestamp?: string | null;
}

// ─── 2. Deterministic Current Request Context Builder ─────────────────────────

export function buildCurrentRequestContext(
  input?: RawCurrentRequestInput | CurrentRequestContext | null
): CurrentRequestContext | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const hasValues = Object.values(input).some((v) => v !== undefined && v !== null);
  if (!hasValues) {
    return undefined;
  }

  // 1. Domain
  let domain: CurrentRequestContext["domain"];
  if (typeof input.domain === "string") {
    const norm = input.domain.trim().toLowerCase();
    if (norm === "food" || norm === "instamart" || norm === "dineout") {
      domain = norm;
    } else {
      throw new Error(`Invalid domain: "${input.domain}". Allowed values: "food", "instamart", "dineout".`);
    }
  }

  // 2. Meal Occasion
  let mealOccasion: CurrentRequestContext["mealOccasion"];
  if (typeof input.mealOccasion === "string") {
    const norm = input.mealOccasion.trim().toLowerCase();
    const allowed = [
      "breakfast",
      "morning_snack",
      "lunch",
      "evening_snack",
      "dinner",
      "late_night",
    ] as const;
    if (allowed.includes(norm as any)) {
      mealOccasion = norm as any;
    } else {
      throw new Error(`Invalid mealOccasion: "${input.mealOccasion}".`);
    }
  }

  // 3. Craving
  let craving: string | undefined;
  if (typeof input.craving === "string") {
    const trimmed = input.craving.trim();
    if (trimmed) {
      craving = trimmed;
    }
  }

  // 4. Temporary Budget
  let temporaryBudget: CurrentRequestContext["temporaryBudget"];
  if (input.temporaryBudget && typeof input.temporaryBudget === "object") {
    let maxAmount: number | undefined;
    if (input.temporaryBudget.maxAmount != null && input.temporaryBudget.maxAmount !== "") {
      const num = Number(input.temporaryBudget.maxAmount);
      if (!isNaN(num) && num > 0) {
        maxAmount = num;
      } else {
        throw new Error(
          `Invalid temporaryBudget maxAmount: "${input.temporaryBudget.maxAmount}". Must be a positive number.`
        );
      }
    }

    let tier: "budget" | "mid" | "premium" | undefined;
    if (typeof input.temporaryBudget.tier === "string") {
      const normTier = input.temporaryBudget.tier.trim().toLowerCase();
      if (normTier === "budget" || normTier === "mid" || normTier === "premium") {
        tier = normTier;
      } else {
        throw new Error(`Invalid temporaryBudget tier: "${input.temporaryBudget.tier}".`);
      }
    }

    const currency =
      typeof input.temporaryBudget.currency === "string" && input.temporaryBudget.currency.trim()
        ? input.temporaryBudget.currency.trim().toUpperCase()
        : "INR";

    if (maxAmount !== undefined || tier !== undefined) {
      temporaryBudget = {
        maxAmount,
        currency,
        tier,
      };
    }
  }

  // 5. Location
  let location: CurrentRequestContext["location"];
  if (input.location && typeof input.location === "object") {
    let latitude: number | undefined;
    if (input.location.latitude != null && input.location.latitude !== "") {
      const lat = Number(input.location.latitude);
      if (!isNaN(lat) && lat >= -90 && lat <= 90) {
        latitude = lat;
      } else {
        throw new Error(`Invalid latitude: "${input.location.latitude}". Must be between -90 and 90.`);
      }
    }

    let longitude: number | undefined;
    if (input.location.longitude != null && input.location.longitude !== "") {
      const lng = Number(input.location.longitude);
      if (!isNaN(lng) && lng >= -180 && lng <= 180) {
        longitude = lng;
      } else {
        throw new Error(`Invalid longitude: "${input.location.longitude}". Must be between -180 and 180.`);
      }
    }

    const locality =
      typeof input.location.locality === "string" ? input.location.locality.trim() || undefined : undefined;
    const addressText =
      typeof input.location.addressText === "string"
        ? input.location.addressText.trim() || undefined
        : undefined;

    if (
      latitude !== undefined ||
      longitude !== undefined ||
      locality !== undefined ||
      addressText !== undefined
    ) {
      location = {
        latitude,
        longitude,
        locality,
        addressText,
      };
    }
  }

  // 6. Ordering for Others
  let orderingForOthers: boolean | undefined;
  if (input.orderingForOthers != null) {
    orderingForOthers = Boolean(input.orderingForOthers);
  }

  // 7. Party Size
  let partySize: number | undefined;
  if (input.partySize != null && input.partySize !== "") {
    const size = Number(input.partySize);
    if (!isNaN(size) && Number.isInteger(size) && size > 0) {
      partySize = size;
    } else {
      throw new Error(`Invalid partySize: "${input.partySize}". Must be a positive integer.`);
    }
  }

  // 8. Request Timestamp
  let requestTimestamp: string | undefined;
  if (typeof input.requestTimestamp === "string") {
    const trimmed = input.requestTimestamp.trim();
    if (trimmed) {
      const parsedDate = new Date(trimmed);
      if (isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid requestTimestamp: "${trimmed}". Must be a valid date string.`);
      }
      requestTimestamp = trimmed;
    }
  }

  return {
    domain,
    mealOccasion,
    craving,
    temporaryBudget,
    location,
    orderingForOthers,
    partySize,
    requestTimestamp,
  };
}

// ─── 3. Recommendation Input Context Builder ──────────────────────────────────

export function buildRecommendationInputContext(
  profile: ProfileContext,
  rawOrBuiltRequest?: RawCurrentRequestInput | CurrentRequestContext | null
): RecommendationInputContext {
  const currentRequest = buildCurrentRequestContext(rawOrBuiltRequest);

  return {
    profile,
    currentRequest,
  };
}

export {
  type CurrentRequestContext,
  type RecommendationInputContext,
};
