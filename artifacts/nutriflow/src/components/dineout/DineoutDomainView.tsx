import { useState, useMemo } from "react";
import {
  SectionHeader,
  AppCard,
  SecondaryButton,
} from "@/components/layout/primitives";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, Compass, UtensilsCrossed, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useListRestaurants } from "@workspace/api-client-react";
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

  // Fetch verified restaurants from database
  const { data: databaseRestaurants, isLoading } = useListRestaurants();

  // Transform and filter Dineout restaurants
  const filteredRestaurants: DineoutRestaurantData[] = useMemo(() => {
    if (!databaseRestaurants) return [];

    return databaseRestaurants
      .map((r: any, idx: number) => ({
        id: r.id,
        name: r.name,
        cuisine: r.cuisine || "Multi-cuisine",
        rating: r.rating || 4.3,
        costForTwo: r.costForTwo || 800 + (idx % 4) * 300,
        locality: r.locality || (idx % 2 === 0 ? "Indiranagar, Bengaluru" : "Koramangala, Bengaluru"),
        distance: `${(1.2 + (idx * 0.7) % 3.5).toFixed(1)} km`,
        timings: "11:30 AM – 11:00 PM",
        offerText: idx % 2 === 0 ? "Flat 20% off with Dineout Pay" : undefined,
        imageUrl: r.imageUrl,
        isOpen: true,
      }))
      .filter((r) => {
        const matchesCategory =
          activeCategory === "all" ||
          r.cuisine.toLowerCase().includes(activeCategory.toLowerCase()) ||
          r.name.toLowerCase().includes(activeCategory.toLowerCase());

        const matchesSearch =
          !search ||
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.cuisine.toLowerCase().includes(search.toLowerCase()) ||
          (r.locality && r.locality.toLowerCase().includes(search.toLowerCase()));

        return matchesCategory && matchesSearch;
      });
  }, [databaseRestaurants, activeCategory, search]);

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

      {/* ─── Restaurant Results Grid ─── */}
      {isLoading ? (
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
            Try adjusting your search query or reset the category filters to explore more dining destinations.
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
