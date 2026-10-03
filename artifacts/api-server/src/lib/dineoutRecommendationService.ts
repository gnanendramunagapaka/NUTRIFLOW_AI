import {
  type DineoutRecommendationRequest,
  type DineoutRecommendationResponse,
  resolveDineoutLocation,
  normalizeDineoutRestaurantsBatch,
  type RawSwiggyDineoutRestaurant,
} from "@workspace/api-zod";
import { buildProfileContextFromProfile } from "./profileContext";
import { executeSharedRecommendation } from "./recommendationService";
import { buildCurrentRequestContext } from "./currentContext";
import { getValidUserToken, invalidateUserToken } from "./swiggyTokens";
import {
  DineoutMcpClient,
  defaultDineoutMcpClient,
  SwiggyAuthError,
  SwiggyMcpError,
} from "./dineoutMcpClient";
import type { userProfilesTable } from "@workspace/db";

export interface ExecuteDineoutRecommendationOptions {
  mcpClient?: DineoutMcpClient;
  getTokenFn?: (userId: string) => Promise<string | null>;
}

export interface DineoutFlowResult {
  status: number;
  data: DineoutRecommendationResponse | { error: string; requires_reauth?: boolean; details?: any };
}

/**
 * Orchestrates the end-to-end Swiggy Dineout recommendation flow:
 * 1. Validates authenticated user's Swiggy token.
 * 2. Builds authoritative ProfileContext from verified DB user.
 * 3. Resolves user's Dineout location (or requests clarification).
 * 4. Calls Swiggy Dineout MCP tool search_restaurants_dineout.
 * 5. Normalizes raw Swiggy restaurants into canonical NormalizedSwiggyCandidate items via Phase 3 Part 1 adapter.
 * 6. Passes normalized candidates through the Phase 2 Shared Recommendation Service.
 * 7. Returns personalized, ranked Dineout recommendations.
 */
export async function executeDineoutRecommendation(
  user: typeof userProfilesTable.$inferSelect,
  request: DineoutRecommendationRequest,
  options?: ExecuteDineoutRecommendationOptions
): Promise<DineoutFlowResult> {
  const mcpClient = options?.mcpClient || defaultDineoutMcpClient;

  // 1. Verify user's active Swiggy access token
  const userToken = options?.getTokenFn
    ? await options.getTokenFn(user.id)
    : await getValidUserToken(user.id);

  if (!userToken) {
    return {
      status: 401,
      data: {
        error: "Swiggy account not connected or session expired",
        requires_reauth: true,
      },
    };
  }

  // 2. Build authoritative ProfileContext from verified DB profile (cannot be forged)
  const profileContext = buildProfileContextFromProfile(user);

  // 3. Normalize optional request-scoped context
  const normalizedCurrentRequest = request.currentRequest
    ? buildCurrentRequestContext(request.currentRequest)
    : undefined;

  try {
    // 4. Retrieve and resolve Dineout saved location
    const locations = await mcpClient.getSavedLocations(userToken);
    const locationResolution = resolveDineoutLocation(locations, request.locationId);

    if (!locationResolution.success) {
      if (locationResolution.clarificationNeeded) {
        // Controlled clarification response: prompt user to select a location
        return {
          status: 200,
          data: {
            domain: "dineout",
            clarificationNeeded: true,
            availableLocations: locationResolution.availableLocations || [],
            recommendations: [],
            excludedCandidates: [],
            metadata: {
              totalCandidates: 0,
              rankedCount: 0,
              excludedCount: 0,
              returnedCount: 0,
            },
          },
        };
      }

      return {
        status: 400,
        data: {
          error: locationResolution.error || "Location resolution failed",
        },
      };
    }

    const selectedLocation = locationResolution.location!;

    // 5. Query live Swiggy Dineout MCP tools & normalize candidates
    const explicitQuery =
      request.query?.trim() ||
      normalizedCurrentRequest?.craving ||
      profileContext.dietary.cuisinePreferences?.[0] ||
      "restaurants";

    const targetAddressId = selectedLocation.addressId || selectedLocation.id;
    const rawRestaurants: RawSwiggyDineoutRestaurant[] = await mcpClient.searchRestaurantsDineout(
      userToken,
      {
        query: explicitQuery,
        addressId: targetAddressId,
        address_id: targetAddressId,
        location_id: selectedLocation.id,
        locationId: selectedLocation.id,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
      }
    );

    const candidates = normalizeDineoutRestaurantsBatch(rawRestaurants);

    // 6. Handle empty Swiggy results without fabricating data
    if (candidates.length === 0) {
      return {
        status: 200,
        data: {
          domain: "dineout",
          locationUsed: selectedLocation,
          recommendations: [],
          excludedCandidates: [],
          metadata: {
            totalCandidates: 0,
            rankedCount: 0,
            excludedCount: 0,
            returnedCount: 0,
          },
        },
      };
    }

    // 7. Pass normalized candidates through Phase 2 Shared Recommendation Service
    const recommendationResult = executeSharedRecommendation(profileContext, {
      domain: "dineout",
      currentRequest: normalizedCurrentRequest,
      candidates,
      limit: request.limit,
    });

    return {
      status: 200,
      data: {
        ...recommendationResult,
        locationUsed: selectedLocation,
      },
    };
  } catch (err: any) {
    if (err instanceof SwiggyAuthError) {
      await invalidateUserToken(user.id);
      return {
        status: 401,
        data: {
          error: "Swiggy session has expired or been revoked",
          requires_reauth: true,
        },
      };
    }

    if (err instanceof SwiggyMcpError) {
      return {
        status: err.status || 502,
        data: {
          error: err.message,
        },
      };
    }

    console.error("[Dineout Recommendation Service] Execution error:", err?.message ?? err);
    return {
      status: 500,
      data: {
        error: "Failed to generate dineout recommendations",
      },
    };
  }
}
