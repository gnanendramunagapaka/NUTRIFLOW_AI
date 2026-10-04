import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import type { Address } from "./use-cart";

export interface DineoutLocation {
  id: string;
  addressId?: string;
  name?: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
  label?: string;
}

export function extractFrontendDineoutLocations(data: unknown): DineoutLocation[] {
  if (!data || typeof data !== "object") return [];

  const obj = data as Record<string, unknown>;
  let list: unknown[] = [];

  const structured = (obj.structuredContent && typeof obj.structuredContent === "object")
    ? (obj.structuredContent as Record<string, unknown>)
    : (obj.result && typeof obj.result === "object" && (obj.result as any).structuredContent && typeof (obj.result as any).structuredContent === "object")
    ? ((obj.result as any).structuredContent as Record<string, unknown>)
    : undefined;

  if (structured && Array.isArray(structured.locations)) {
    list = structured.locations;
  } else if (structured && Array.isArray(structured.addresses)) {
    list = structured.addresses;
  } else if (Array.isArray(obj.locations)) {
    list = obj.locations;
  } else if (Array.isArray(obj.addresses)) {
    list = obj.addresses;
  } else if (obj.data && typeof obj.data === "object") {
    const d = obj.data as Record<string, unknown>;
    if (Array.isArray(d.locations)) list = d.locations;
    else if (Array.isArray(d.addresses)) list = d.addresses;
  } else if (Array.isArray(data)) {
    list = data;
  }

  const results: DineoutLocation[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const it = raw as Record<string, unknown>;
    const rawId = it.id ?? it.location_id ?? it.address_id ?? it._id;
    if (rawId == null) continue;
    const id = String(rawId).trim();
    if (!id || id.toLowerCase() === "home" || id.toLowerCase() === "work" || id.toLowerCase() === "mock") continue;

    const addressId = it.address_id ?? it.addressId;
    const name = typeof it.name === "string" ? it.name.trim() : undefined;
    const label = typeof it.addressTag === "string"
      ? it.addressTag.trim()
      : typeof it.label === "string"
      ? it.label.trim()
      : name;

    const address = typeof it.address === "string"
      ? it.address.trim()
      : typeof it.addressLine === "string"
      ? it.addressLine.trim()
      : typeof it.formatted_address === "string"
      ? it.formatted_address.trim()
      : undefined;

    const city = typeof it.city === "string" ? it.city.trim() : undefined;
    const isDefault = Boolean(it.isDefault || it.is_default || it.default);

    let lat: number | undefined;
    const rawLat = it.lat ?? it.latitude;
    if (typeof rawLat === "number" && !isNaN(rawLat)) lat = rawLat;

    let lng: number | undefined;
    const rawLng = it.lng ?? it.longitude;
    if (typeof rawLng === "number" && !isNaN(rawLng)) lng = rawLng;

    results.push({
      id,
      addressId: addressId ? String(addressId).trim() : id,
      name: name || label,
      address,
      city,
      lat,
      lng,
      isDefault: isDefault || undefined,
      label,
    });
  }

  return results;
}

export function resolveDineoutLocationFromHome(
  locations: DineoutLocation[] | undefined | null,
  homeAddress: Address | null | undefined
): DineoutLocation | null {
  if (!locations || locations.length === 0 || !homeAddress?.id) {
    return null;
  }

  const targetId = homeAddress.id.trim();

  // 1. Strict match on addressId or id
  const matched = locations.find((l) => l.addressId === targetId || l.id === targetId);
  if (matched) return matched;

  // 2. City-aware resolution & Mismatch Prevention
  const homeCity = homeAddress.city?.trim().toLowerCase();
  const homeAddr = homeAddress.address?.toLowerCase() || "";

  // Check if any locations match the home address city or locality
  const cityMatches = locations.filter((loc) => {
    const locCity = loc.city?.trim().toLowerCase();
    if (homeCity && locCity) {
      return locCity === homeCity || locCity.includes(homeCity) || homeCity.includes(locCity);
    }
    if (homeCity && loc.address) {
      return loc.address.toLowerCase().includes(homeCity);
    }
    if (locCity && homeAddr) {
      return homeAddr.includes(locCity);
    }
    return false;
  });

  if (cityMatches.length === 1) return cityMatches[0];
  const defaultCityMatch = cityMatches.find((l) => l.isDefault);
  if (defaultCityMatch) return defaultCityMatch;
  if (cityMatches.length > 1) return cityMatches[0];

  // CRITICAL MISMATCH GUARD: If home address has an identifiable city/locality, and locations have differing cities,
  // NEVER fall back to a location in a different city (e.g. Visakhapatnam home address cannot resolve to Hyderabad Dineout location).
  if (homeCity) {
    return null;
  }

  // 3. Fallback only when home address has no identifiable city at all:
  if (locations.length === 1) return locations[0];

  const defaultLoc = locations.find((l) => l.isDefault);
  if (defaultLoc) return defaultLoc;

  return null;
}

export function useDineoutLocation(selectedAddress: Address | null | undefined) {
  const { user } = useAuth();

  const { data: locations, isLoading } = useQuery<DineoutLocation[]>({
    queryKey: ["swiggy", "dineout-locations"],
    queryFn: async () => {
      if (!user) return [];

      let res = await fetch("/api/swiggy/mcp/dineout/get_saved_locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      }).catch(() => null);

      if (!res || !res.ok) {
        // Fallback to food addresses normalized as Dineout locations
        res = await fetch("/api/swiggy/mcp/food/get_addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({}),
        }).catch(() => null);
      }

      if (!res || !res.ok) return [];
      const data = await res.json().catch(() => null);
      return extractFrontendDineoutLocations(data);
    },
    enabled: Boolean(user),
    staleTime: 10 * 60 * 1000,
  });

  const resolvedLocation = useMemo(() => {
    return resolveDineoutLocationFromHome(locations, selectedAddress);
  }, [locations, selectedAddress]);

  const isUnavailable = Boolean(
    selectedAddress?.id &&
    locations &&
    locations.length > 0 &&
    !resolvedLocation
  );

  return {
    locations: locations || [],
    resolvedLocation,
    isLoadingLocation: isLoading,
    isUnavailable,
  };
}
