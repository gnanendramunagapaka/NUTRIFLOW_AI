import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useCart, type Address } from "./use-cart";
import { useAuth } from "./use-auth";
import type { RankedRecommendationCandidate, ExcludedRecommendationCandidate } from "@/lib/recommendationRanking";

export type RecommendationDomain = "food" | "instamart" | "dineout";

export interface SwiggySourceMetadata {
  source?: "swiggy";
  domain?: "food" | "instamart" | "dineout";
  restaurantId?: string;
  restaurantName?: string;
  menuItemId?: string;
  productId?: string;
  variantId?: string;
  spinId?: string;
  addressId?: string;
  locality?: string;
  rating?: number;
  costForTwo?: number;
  availableSlots?: string[];
  mrp?: number;
  brand?: string;
  quantity?: string;
  distance?: string;
  offers?: string[];
  imageUrl?: string;
}

export interface LiveRecommendationCandidateItem extends RankedRecommendationCandidate {
  candidate: RankedRecommendationCandidate["candidate"] & {
    sourceMetadata?: SwiggySourceMetadata;
  };
}

export interface SwiggyAddressInfo {
  id: string;
  name?: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
  label?: string;
}

export interface BaseRecommendationResponse {
  domain: RecommendationDomain;
  recommendations: LiveRecommendationCandidateItem[];
  excludedCandidates: ExcludedRecommendationCandidate[];
  metadata: {
    totalCandidates: number;
    rankedCount: number;
    excludedCount: number;
    returnedCount: number;
  };
  clarificationNeeded?: boolean;
}

export interface FoodRecommendationResponse extends BaseRecommendationResponse {
  domain: "food";
  mode: "restaurants" | "menu";
  addressUsed?: SwiggyAddressInfo;
  availableAddresses?: SwiggyAddressInfo[];
  restaurantInfo?: {
    id: string;
    name?: string;
    rating?: number;
    costForTwo?: number;
  };
}

export interface InstamartRecommendationResponse extends BaseRecommendationResponse {
  domain: "instamart";
  addressUsed?: SwiggyAddressInfo;
  availableAddresses?: SwiggyAddressInfo[];
}

export interface DineoutRecommendationResponse extends BaseRecommendationResponse {
  domain: "dineout";
  locationUsed?: SwiggyAddressInfo;
  availableLocations?: SwiggyAddressInfo[];
}

export type AnyRecommendationResponse =
  | FoodRecommendationResponse
  | InstamartRecommendationResponse
  | DineoutRecommendationResponse;

export interface UseRecommendationsOptions {
  query?: string;
  addressId?: string;
  locationId?: string;
  mode?: "restaurants" | "menu" | "auto";
  restaurantId?: string;
  limit?: number;
  currentRequest?: Record<string, unknown>;
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
}

async function fetchRecommendations<T = AnyRecommendationResponse>(
  domain: RecommendationDomain,
  payload: Record<string, unknown>
): Promise<T> {
  const endpoint = `/api/recommendations/${domain}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message = errorBody?.error || `Failed to fetch ${domain} recommendations (${res.status})`;
    const err = new Error(message);
    (err as any).status = res.status;
    (err as any).details = errorBody;
    throw err;
  }

  return (await res.json()) as T;
}

/**
 * Pure recommendation request payload builder.
 * - Resolves effective address ID from explicit options or selectedAddress.
 * - Strictly rejects dummy/placeholder IDs ("home", "work").
 * - Isolates Dineout so food/instamart address IDs are never forced into Dineout.
 */
export function buildRecommendationPayload(
  domain: RecommendationDomain,
  options: UseRecommendationsOptions = {},
  selectedAddress?: Address | null
): Record<string, unknown> {
  // Determine effective real address ID
  // Placeholder IDs ("home", "work", "mock") must NEVER be sent as Swiggy address IDs
  const rawAddressId = options.addressId ?? selectedAddress?.id;
  const isDummyAddress =
    !rawAddressId ||
    rawAddressId.toLowerCase() === "home" ||
    rawAddressId.toLowerCase() === "work" ||
    rawAddressId.toLowerCase() === "mock";
  const effectiveAddressId = !isDummyAddress ? rawAddressId : undefined;

  // Build the request payload according to domain contract
  const payload: Record<string, unknown> = {};
  if (options.query) payload.query = options.query;
  if (options.limit) payload.limit = options.limit;
  if (options.currentRequest) payload.currentRequest = options.currentRequest;

  if (domain === "food") {
    if (options.mode) payload.mode = options.mode;
    if (options.restaurantId) payload.restaurantId = options.restaurantId;
    if (effectiveAddressId) payload.addressId = effectiveAddressId;
  } else if (domain === "instamart") {
    if (effectiveAddressId) payload.addressId = effectiveAddressId;
  } else if (domain === "dineout") {
    // Dineout accepts locationId which maps to Swiggy addressId/locationId
    const effectiveLocationId = options.locationId ?? effectiveAddressId;
    if (effectiveLocationId) payload.locationId = effectiveLocationId;
  }

  return payload;
}

/**
 * Universal React Query hook for live Swiggy recommendations (Food, Instamart, Dineout).
 * Automatically forwards the active delivery address from useCart().
 * Strictly uses credentials: "include" for authenticated session cookies.
 */
export function useRecommendations<T = AnyRecommendationResponse>(
  domain: RecommendationDomain,
  options: UseRecommendationsOptions = {}
): UseQueryResult<T, Error> {
  const { selectedAddress } = useCart();
  const { user } = useAuth();

  const payload = buildRecommendationPayload(domain, options, selectedAddress);

  const isEnabled = options.enabled !== false && Boolean(user);

  return useQuery<T, Error>({
    queryKey: ["recommendations", domain, payload],
    queryFn: () => fetchRecommendations<T>(domain, payload),
    enabled: isEnabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
  });
}
