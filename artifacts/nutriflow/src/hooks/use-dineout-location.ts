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

  if (structured) {
    if (Array.isArray(structured.locations)) {
      list = structured.locations;
    } else if (Array.isArray(structured.saved_locations)) {
      list = structured.saved_locations;
    } else if (Array.isArray(structured.addresses)) {
      list = structured.addresses;
    }
  }

  if (list.length === 0) {
    if (Array.isArray(obj.locations)) {
      list = obj.locations;
    } else if (Array.isArray(obj.saved_locations)) {
      list = obj.saved_locations;
    } else if (Array.isArray(obj.addresses)) {
      list = obj.addresses;
    } else if (obj.result && typeof obj.result === "object") {
      const r = obj.result as Record<string, unknown>;
      if (Array.isArray(r.locations)) list = r.locations;
      else if (Array.isArray(r.saved_locations)) list = r.saved_locations;
      else if (Array.isArray(r.addresses)) list = r.addresses;
    } else if (obj.data && typeof obj.data === "object") {
      const d = obj.data as Record<string, unknown>;
      if (Array.isArray(d.locations)) list = d.locations;
      else if (Array.isArray(d.saved_locations)) list = d.saved_locations;
      else if (Array.isArray(d.addresses)) list = d.addresses;
    } else if (Array.isArray(data)) {
      list = data;
    } else if (Array.isArray(obj.content) && obj.content.length > 0) {
      for (const item of obj.content as any[]) {
        if (item && typeof item === "object" && typeof item.text === "string") {
          try {
            const parsed = JSON.parse(item.text);
            if (parsed && typeof parsed === "object") {
              if (Array.isArray(parsed.locations)) { list = parsed.locations; break; }
              if (Array.isArray(parsed.saved_locations)) { list = parsed.saved_locations; break; }
              if (Array.isArray(parsed.addresses)) { list = parsed.addresses; break; }
            }
          } catch {
            // Prose text summary, ignore
          }
        }
      }
    }
  }

  const results: DineoutLocation[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const it = raw as Record<string, unknown>;
    const rawId = it.id ?? it.addressId ?? it.address_id ?? it.location_id ?? it.locationId ?? it._id;
    if (rawId == null) continue;
    const id = String(rawId).trim();
    if (!id || id.toLowerCase() === "home" || id.toLowerCase() === "work" || id.toLowerCase() === "mock") continue;

    const rawAddressId = it.addressId ?? it.address_id ?? it.id;
    const addressId = rawAddressId != null ? String(rawAddressId).trim() : id;

    const name = typeof it.name === "string" ? it.name.trim() : typeof it.title === "string" ? it.title.trim() : undefined;
    const label = typeof it.addressTag === "string"
      ? it.addressTag.trim()
      : typeof it.label === "string"
      ? it.label.trim()
      : name;

    const address = typeof it.address === "string"
      ? it.address.trim()
      : typeof it.addressLine === "string"
      ? it.addressLine.trim()
      : typeof it.address_line === "string"
      ? it.address_line.trim()
      : typeof it.formatted_address === "string"
      ? it.formatted_address.trim()
      : undefined;

    const city = typeof it.city === "string" ? it.city.trim() : undefined;
    const isDefault = Boolean(
      it.isDefault === true ||
      it.is_default === true ||
      it.default === true ||
      it.is_default === 1 ||
      it.default === 1
    );

    let lat: number | undefined;
    const rawLat = it.lat ?? it.latitude;
    if (typeof rawLat === "number" && !isNaN(rawLat)) lat = rawLat;

    let lng: number | undefined;
    const rawLng = it.lng ?? it.longitude;
    if (typeof rawLng === "number" && !isNaN(rawLng)) lng = rawLng;

    results.push({
      id,
      addressId,
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
  if (!homeAddress?.id) {
    return null;
  }

  const targetId = homeAddress.id.trim();
  const isDummy =
    targetId.toLowerCase() === "home" ||
    targetId.toLowerCase() === "work" ||
    targetId.toLowerCase() === "mock";
  if (isDummy) return null;

  // 1. Strict match on addressId or id in locations
  if (locations && locations.length > 0) {
    const matched = locations.find((l) => l.addressId === targetId || l.id === targetId);
    if (matched) return matched;

    // 2. City-aware resolution & Mismatch Prevention
    const homeCity = homeAddress.city?.trim().toLowerCase();
    const homeAddr = homeAddress.address?.toLowerCase() || "";

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

    if (locations.length === 1) return locations[0];

    const defaultLoc = locations.find((l) => l.isDefault);
    if (defaultLoc) return defaultLoc;
  }

  // 3. Fallback: If locations is empty or user's active homeAddress is a genuine Swiggy address ID
  // (e.g. cu0dqc4u6qfla8pbc6hg__AQ9XJgT4UK0sZCoZxp3ujz), resolve it directly as the genuine locationId.
  return {
    id: targetId,
    addressId: targetId,
    name: homeAddress.label || "Selected Location",
    address: homeAddress.address,
    city: homeAddress.city,
    label: homeAddress.label,
  };
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

      let parsedLocations: DineoutLocation[] = [];

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        parsedLocations = extractFrontendDineoutLocations(data);
      }

      // If Dineout service returns 0 saved locations, fall back to Food addresses normalized as Dineout locations (exactly matching backend dineoutMcpClient.ts)
      if (!parsedLocations || parsedLocations.length === 0) {
        const foodRes = await fetch("/api/swiggy/mcp/food/get_addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({}),
        }).catch(() => null);

        if (foodRes && foodRes.ok) {
          const foodData = await foodRes.json().catch(() => null);
          parsedLocations = extractFrontendDineoutLocations(foodData);
        }
      }

      return parsedLocations;
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
