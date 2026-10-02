import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  PageContainer,
  SectionHeader,
  AppCard,
  SecondaryButton,
} from "@/components/layout/primitives";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, Compass, UtensilsCrossed, RefreshCw, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useListRestaurants } from "@workspace/api-client-react";

import { ExploreDomainTabs } from "@/components/food/ExploreDomainTabs";
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

export default function Dineout() {
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
    <Layout>
      <PageContainer className="space-y-6 sm:space-y-8">
        {/* ─── 1. Header ─── */}
        <header className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Dineout Restaurant Discovery
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Explore popular dining destinations, partner tables, and dining offers.
              </p>
            </div>

            {/* Swiggy Attribution */}
            <div className="shrink-0 self-start sm:self-auto">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-1.5 shadow-2xs">
                ⚡ Powered by Swiggy Dineout
              </span>
            </div>
          </div>

          {/* ─── 2. Domain Navigation ─── */}
          <div className="pt-1">
            <ExploreDomainTabs activeDomain="dineout" />
          </div>

          {/* ─── 3. Search Bar ─── */}
          <div className="relative pt-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by restaurant name, cuisine, or locality..."
              className="pl-11 pr-10 py-5 rounded-2xl bg-card border-border/80 focus-visible:ring-primary text-xs sm:text-sm shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                aria-label="Clear search query"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* ─── 4. Category Shortcuts ─── */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {DINEOUT_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setActiveCategory(cat.value)}
                className={cn(
                  "whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border cursor-pointer shrink-0 shadow-2xs",
                  activeCategory === cat.value
                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                    : "bg-card text-foreground/80 hover:bg-muted border-border/80"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </header>

        {/* ─── 5. Loading State ─── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : filteredRestaurants.length === 0 ? (
          /* ─── 6. Empty State ─── */
          <AppCard className="p-8 sm:p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto text-amber-600">
              <UtensilsCrossed className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">No restaurants found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No dining partners matching "{search || activeCategory}". Try searching for another locality or cuisine.
              </p>
            </div>
            <SecondaryButton
              size="sm"
              onClick={() => {
                setSearch("");
                setActiveCategory("all");
              }}
              className="text-xs gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reset Search</span>
            </SecondaryButton>
          </AppCard>
        ) : (
          /* ─── 7. Restaurant Grid ─── */
          <div className="space-y-4">
            <SectionHeader
              title="Featured Dineout Partners"
              subtitle="Browse top-rated dining spots and reserve tables"
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

        {/* ─── 8. Dineout Booking Sheet ─── */}
        <DineoutBookingSheet
          restaurant={selectedRestaurant}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
        />
      </PageContainer>
    </Layout>
  );
}
