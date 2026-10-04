import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  SectionHeader,
  AppCard,
  SecondaryButton,
} from "@/components/layout/primitives";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, UtensilsCrossed, RefreshCw, MapPin, MapPinOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { useDineoutLocation } from "@/hooks/use-dineout-location";
import { useRecommendations, type DineoutRecommendationResponse } from "@/hooks/use-recommendations";
import {
  DineoutRestaurantCard,
  DineoutRestaurantData,
} from "@/components/dineout/DineoutRestaurantCard";
import { DineoutBookingSheet } from "@/components/dineout/DineoutBookingSheet";

const DINEOUT_CATEGORIES = [
  { label: "All", value: "all" },
  { label: "Casual Dining", value: "Casual Dining" },
  { label: "Fine Dining", value: "Fine Dining" },
  { label: "Cafes", value: "Cafe" },
  { label: "Buffets", value: "Buffet" },
  { label: "Rooftop", value: "Rooftop" },
  { label: "Family Dining", value: "Family" },
];

export function DineoutDomainView() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedRestaurant, setSelectedRestaurant] = useState<DineoutRestaurantData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { selectedAddress } = useCart();
  const { resolvedLocation, isLoadingLocation, isUnavailable } = useDineoutLocation(selectedAddress);

  // Effective query combining search input and category shortcut
  const effectiveQuery = search.trim() || (activeCategory !== "all" ? activeCategory : undefined);

  // Live Swiggy Dineout recommendations
  const {
    data: dineoutData,
    isLoading: isLoadingRecommendations,
    error: dineoutError,
    refetch,
  } = useRecommendations<DineoutRecommendationResponse>("dineout", {
    query: effectiveQuery,
    locationId: resolvedLocation?.id,
    enabled: Boolean(resolvedLocation?.id),
  });

  const isLoading = isLoadingLocation || (Boolean(resolvedLocation?.id) && isLoadingRecommendations);

  // Map Live Dineout Recommendations to DineoutRestaurantData preserving only real backend fields
  const filteredRestaurants: DineoutRestaurantData[] = useMemo(() => {
    if (!dineoutData?.recommendations) return [];

    return dineoutData.recommendations.map((rec) => {
      const c = rec.candidate;
      const meta = c.sourceMetadata;

      return {
        id: meta?.restaurantId || c.id,
        name: c.name || "",
        cuisine: c.categoryTags?.join(", ") || c.contextTags?.[0] || "",
        rating: meta?.rating,
        costForTwo: meta?.costForTwo,
        locality: meta?.locality,
        distance: meta?.distance,
        timings: undefined, // Do not fabricate timings
        offerText: meta?.offers?.[0], // Real offer if present in metadata
        imageUrl: meta?.imageUrl,
        isOpen: c.availability !== "unavailable",
      };
    });
  }, [dineoutData]);

  const handleOpenRestaurant = (restaurant: DineoutRestaurantData) => {
    setSelectedRestaurant(restaurant);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ─── Search & Category Filters ─── */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search restaurants, cafes, rooftop dining, cuisines..."
            className="pl-10 pr-9 h-11 rounded-2xl bg-card border-border/80 focus-visible:ring-amber-500 text-xs sm:text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category horizontal scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
          {DINEOUT_CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setActiveCategory(cat.value)}
                className={cn(
                  "whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border cursor-pointer shrink-0 shadow-2xs",
                  isSelected
                    ? "bg-amber-600 border-amber-600 text-white shadow-xs"
                    : "bg-card border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Restaurant Results Grid / Loading / Error / Empty States ─── */}
      {!selectedAddress ? (
        <AppCard className="p-8 sm:p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <MapPin className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Select Location on Home</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Please select your location on the Home page to discover partner dining destinations nearby.
          </p>
          <Link href="/">
            <SecondaryButton size="sm">Go to Home to Select Location</SecondaryButton>
          </Link>
        </AppCard>
      ) : isUnavailable ? (
        <AppCard className="p-8 sm:p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <MapPinOff className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Dineout Not Available For This Location</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Dineout restaurant discovery is currently unavailable for your selected Home address "{selectedAddress.label}". Please select another delivery address on Home.
          </p>
          <Link href="/">
            <SecondaryButton size="sm">Go to Home to Change Address</SecondaryButton>
          </Link>
        </AppCard>
      ) : dineoutError ? (
        <AppCard className="p-8 sm:p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Unable to load Dineout restaurants</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {dineoutError.message || "Failed to reach Swiggy Dineout recommendation service. Please try again."}
          </p>
          <SecondaryButton
            size="sm"
            onClick={() => refetch()}
            className="text-xs gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </SecondaryButton>
        </AppCard>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      ) : filteredRestaurants.length === 0 ? (
        <AppCard className="p-8 sm:p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground">No Dineout restaurants found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {search.trim() || activeCategory !== "all"
              ? "No partner restaurants matched your search criteria. Try adjusting your query or resetting filters."
              : "No participating Dineout dining venues were found for your selected address. Dineout reservations depend on partner restaurant availability in your city."}
          </p>
          <SecondaryButton
            size="sm"
            onClick={() => {
              setSearch("");
              setActiveCategory("all");
            }}
            className="text-xs gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset Filters</span>
          </SecondaryButton>
        </AppCard>
      ) : (
        <div className="space-y-4">
          <SectionHeader
            title="Popular Dining Destinations"
            subtitle={`${filteredRestaurants.length} verified partner restaurants and dining venues`}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRestaurants.map((restaurant) => (
              <DineoutRestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onClick={() => handleOpenRestaurant(restaurant)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Dineout Reservation Modal Sheet */}
      <DineoutBookingSheet
        restaurant={selectedRestaurant}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedRestaurant(null);
        }}
      />
    </div>
  );
}
