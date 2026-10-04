import {
  type InstamartRecommendationRequest,
  type InstamartRecommendationResponse,
  resolveSwiggyAddress,
  normalizeInstamartProductsBatch,
  type RawSwiggyInstamartProduct,
  type ProfileContext,
  type CurrentRequestContext,
} from "@workspace/api-zod";
import { buildProfileContextFromProfile } from "./profileContext";
import { executeSharedRecommendation } from "./recommendationService";
import { buildCurrentRequestContext } from "./currentContext";
import { getValidUserToken, invalidateUserToken } from "./swiggyTokens";
import {
  InstamartMcpClient,
  defaultInstamartMcpClient,
  SwiggyAuthError,
  SwiggyMcpError,
} from "./instamartMcpClient";
import type { userProfilesTable } from "@workspace/db";

export interface ExecuteInstamartRecommendationOptions {
  mcpClient?: InstamartMcpClient;
  getTokenFn?: (userId: string) => Promise<string | null>;
}

export interface InstamartFlowResult {
  status: number;
  data: InstamartRecommendationResponse | { error: string; requires_reauth?: boolean; details?: any };
}

/**
 * Determines discovery retrieval intent for Instamart when user has not searched or filtered.
 * Uses persistent Profile Context (liked foods, health goal, dietary pattern).
 */
export function determineInstamartDiscoveryIntent(
  profileContext: ProfileContext,
  currentRequest?: CurrentRequestContext
): string {
  if (currentRequest?.craving?.trim()) {
    return currentRequest.craving.trim();
  }
  if (profileContext.dietary.likedFoods?.[0]?.trim()) {
    return profileContext.dietary.likedFoods[0].trim();
  }
  const goal = profileContext.goals.primaryGoal?.toLowerCase() || "";
  if (goal.includes("muscle") || goal.includes("protein")) {
    return "protein";
  }
  if (goal.includes("weight") || goal.includes("loss")) {
    return "fruits";
  }
  if (profileContext.dietary.dietaryPattern?.toLowerCase() === "vegetarian") {
    return "organic";
  }
  return "groceries";
}

/**
 * Orchestrates the end-to-end Swiggy Instamart recommendation flow:
 * 1. Validates authenticated user's Swiggy token.
 * 2. Builds authoritative ProfileContext from verified DB user.
 * 3. Resolves user's delivery address (or requests clarification).
 * 4. Calls appropriate Swiggy Instamart MCP tool (search_products or your_go_to_items).
 * 5. Normalizes raw Swiggy products into canonical NormalizedSwiggyCandidate items via Phase 3 Part 1 adapter.
 * 6. Passes normalized candidates through the Phase 2 Shared Recommendation Service.
 * 7. Returns personalized, ranked Instamart recommendations.
 */
export async function executeInstamartRecommendation(
  user: typeof userProfilesTable.$inferSelect,
  request: InstamartRecommendationRequest,
  options?: ExecuteInstamartRecommendationOptions
): Promise<InstamartFlowResult> {
  const mcpClient = options?.mcpClient || defaultInstamartMcpClient;

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

    if (!addressResolution.success) {
      if (addressResolution.clarificationNeeded) {
        // Controlled clarification response: prompt user to select an address
        return {
          status: 200,
          data: {
            domain: "instamart",
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

    // 5. Query live Swiggy Instamart MCP tools & normalize candidates
    const explicitQuery = request.query?.trim() || normalizedCurrentRequest?.craving || "";
    let rawProducts: RawSwiggyInstamartProduct[] = [];

    if (explicitQuery) {
      rawProducts = await mcpClient.searchProducts(userToken, {
        query: explicitQuery,
        address_id: selectedAddress.id,
        addressId: selectedAddress.id,
        lat: selectedAddress.lat,
        lng: selectedAddress.lng,
      });

      // Zero-result live fallback for search: broaden to general live groceries if narrow search returned 0
      if (rawProducts.length === 0 && explicitQuery !== "groceries" && explicitQuery !== "essentials") {
        try {
          rawProducts = await mcpClient.searchProducts(userToken, {
            query: "groceries",
            address_id: selectedAddress.id,
            addressId: selectedAddress.id,
            lat: selectedAddress.lat,
            lng: selectedAddress.lng,
          });
        } catch {
          // Graceful fallback
        }
      }
    } else {
      // If no explicit query provided, try yourGoToItems first, fallback to Profile Context discovery query
      try {
        rawProducts = await mcpClient.yourGoToItems(userToken, {
          address_id: selectedAddress.id,
          addressId: selectedAddress.id,
        });
      } catch {
        // Fallback gracefully
      }

      if (rawProducts.length === 0) {
        const discoveryQuery = determineInstamartDiscoveryIntent(profileContext, normalizedCurrentRequest);
        try {
          rawProducts = await mcpClient.searchProducts(userToken, {
            query: discoveryQuery,
            address_id: selectedAddress.id,
            addressId: selectedAddress.id,
            lat: selectedAddress.lat,
            lng: selectedAddress.lng,
          });
        } catch {
          // Graceful fallback
        }
      }

      // If discovery query still returned 0, broaden to common live groceries
      if (rawProducts.length === 0) {
        try {
          rawProducts = await mcpClient.searchProducts(userToken, {
            query: "groceries",
            address_id: selectedAddress.id,
            addressId: selectedAddress.id,
            lat: selectedAddress.lat,
            lng: selectedAddress.lng,
          });
        } catch {
          // Graceful fallback
        }
      }
    }

    const candidates = normalizeInstamartProductsBatch(rawProducts);

    // 6. Handle empty Swiggy results without fabricating data
    if (candidates.length === 0) {
      return {
        status: 200,
        data: {
          domain: "instamart",
          addressUsed: selectedAddress,
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
      domain: "instamart",
      currentRequest: normalizedCurrentRequest,
      candidates,
      limit: request.limit,
    });

    return {
      status: 200,
      data: {
        ...recommendationResult,
        addressUsed: selectedAddress,
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

    console.error("[Instamart Recommendation Service] Execution error:", err?.message ?? err);
    return {
      status: 500,
      data: {
        error: "Failed to generate instamart recommendations",
      },
    };
  }
}
