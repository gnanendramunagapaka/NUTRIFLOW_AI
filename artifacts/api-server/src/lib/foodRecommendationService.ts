import {
  type FoodRecommendationRequest,
  type FoodRecommendationResponse,
  resolveSwiggyAddress,
  normalizeFoodRestaurantsBatch,
  normalizeFoodMenuItemsBatch,
} from "@workspace/api-zod";
import { buildProfileContextFromProfile } from "./profileContext";
import { executeSharedRecommendation } from "./recommendationService";
import { buildCurrentRequestContext } from "./currentContext";
import { getValidUserToken, invalidateUserToken } from "./swiggyTokens";
import {
  FoodMcpClient,
  defaultFoodMcpClient,
  SwiggyAuthError,
  SwiggyMcpError,
} from "./foodMcpClient";
import type { userProfilesTable } from "@workspace/db";

export interface ExecuteFoodRecommendationOptions {
  mcpClient?: FoodMcpClient;
  getTokenFn?: (userId: string) => Promise<string | null>;
}

export interface FoodFlowResult {
  status: number;
  data: FoodRecommendationResponse | { error: string; requires_reauth?: boolean; details?: any };
}

/**
 * Orchestrates the end-to-end Swiggy Food recommendation flow:
 * 1. Validates authenticated user's Swiggy token.
 * 2. Builds authoritative ProfileContext from verified DB user.
 * 3. Resolves user's delivery address (or requests clarification).
 * 4. Calls appropriate Swiggy Food MCP tool (search_restaurants, get_restaurant_menu, or search_menu).
 * 5. Normalizes raw Swiggy data into canonical NormalizedSwiggyCandidate items.
 * 6. Passes normalized candidates through the Phase 2 Shared Recommendation Service.
 * 7. Returns personalized, ranked Food recommendations.
 */
export async function executeFoodRecommendation(
  user: typeof userProfilesTable.$inferSelect,
  request: FoodRecommendationRequest,
  options?: ExecuteFoodRecommendationOptions
): Promise<FoodFlowResult> {
  const mcpClient = options?.mcpClient || defaultFoodMcpClient;

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
    // 4. Retrieve and resolve Swiggy delivery address
    const addresses = await mcpClient.getAddresses(userToken);
    const addressResolution = resolveSwiggyAddress(addresses, request.addressId);

    const mode = request.mode === "menu" || Boolean(request.restaurantId)
      ? "menu"
      : "restaurants";

    if (!addressResolution.success) {
      if (addressResolution.clarificationNeeded) {
        // Controlled clarification response: prompt user to select an address
        return {
          status: 200,
          data: {
            domain: "food",
            mode,
            clarificationNeeded: true,
            availableAddresses: addressResolution.availableAddresses || [],
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
          error: addressResolution.error || "Address resolution failed",
        },
      };
    }

    const selectedAddress = addressResolution.address!;

    // 5. Query live Swiggy Food MCP tools & normalize candidates
    let candidates: any[] = [];
    let restaurantInfo: { id: string; name?: string } | undefined;

    if (mode === "menu") {
      const restId = request.restaurantId?.trim();
      if (!restId) {
        return {
          status: 400,
          data: { error: "restaurantId is required when requesting menu recommendations" },
        };
      }

      restaurantInfo = { id: restId };

      if (request.query && request.query.trim()) {
        const rawMenuItems = await mcpClient.searchMenu(userToken, {
          query: request.query.trim(),
          restaurant_id: restId,
          address_id: selectedAddress.id,
        });
        candidates = normalizeFoodMenuItemsBatch(rawMenuItems, restId);
      } else {
        const rawMenuItems = await mcpClient.getRestaurantMenu(userToken, {
          restaurant_id: restId,
          address_id: selectedAddress.id,
        });
        candidates = normalizeFoodMenuItemsBatch(rawMenuItems, restId);
      }
    } else {
      // Restaurants mode
      const explicitQuery =
        request.query?.trim() ||
        normalizedCurrentRequest?.craving ||
        profileContext.dietary.cuisinePreferences?.[0] ||
        "";

      const rawRestaurants = await mcpClient.searchRestaurants(userToken, {
        query: explicitQuery || undefined,
        address_id: selectedAddress.id,
        lat: selectedAddress.lat,
        lng: selectedAddress.lng,
      });

      candidates = normalizeFoodRestaurantsBatch(rawRestaurants);
    }

    // 6. Handle empty Swiggy results without fabricating data
    if (candidates.length === 0) {
      return {
        status: 200,
        data: {
          domain: "food",
          mode,
          addressUsed: selectedAddress,
          restaurantInfo,
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
      domain: "food",
      currentRequest: normalizedCurrentRequest,
      candidates,
      limit: request.limit,
    });

    return {
      status: 200,
      data: {
        ...recommendationResult,
        mode,
        addressUsed: selectedAddress,
        restaurantInfo,
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

    console.error("[Food Recommendation Service] Execution error:", err?.message ?? err);
    return {
      status: 500,
      data: {
        error: "Failed to generate food recommendations",
      },
    };
  }
}
