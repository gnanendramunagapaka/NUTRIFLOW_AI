import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import {
  PageContainer,
  SectionHeader,
  AppCard,
  PrimaryButton,
  SecondaryButton,
  Pill,
} from "@/components/layout/primitives";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, Utensils, Store, Compass, RefreshCw, MapPin, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useRecommendations, type FoodRecommendationResponse } from "@/hooks/use-recommendations";

import { ExploreDomainTabs } from "@/components/food/ExploreDomainTabs";
import { RestaurantCard, RestaurantItemData } from "@/components/food/RestaurantCard";
import { FoodItemCard, FoodItemData } from "@/components/food/FoodItemCard";
import { RestaurantDetailSheet } from "@/components/food/RestaurantDetailSheet";
import { FoodItemDetailSheet } from "@/components/food/FoodItemDetailSheet";
import { InstamartDomainView } from "@/components/instamart/InstamartDomainView";
import { DineoutDomainView } from "@/components/dineout/DineoutDomainView";

// Discovery Category Filter Shortcuts
const CUISINE_CATEGORIES = [
  { label: "All", value: "all" },
  { label: "South Indian", value: "South Indian" },
  { label: "North Indian", value: "North Indian" },
  { label: "Biryani", value: "Biryani" },
  { label: "Bowls & Salads", value: "Salads" },
  { label: "Breakfast", value: "Breakfast" },
  { label: "Fast Food", value: "Fast Food" },
  { label: "Desserts", value: "Desserts" },
];

const getDomainFromLocation = (): "food" | "instamart" | "dineout" => {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const d = params.get("domain");
    if (d === "instamart" || d === "dineout" || d === "food") {
      return d;
    }
  }
  return "food";
};

export default function Discover() {
  const [location, setLocation] = useLocation();
  const [activeDomain, setActiveDomain] = useState<"food" | "instamart" | "dineout">(getDomainFromLocation);

  useEffect(() => {
    setActiveDomain(getDomainFromLocation());
  }, [location]);

  useEffect(() => {
    const handlePopState = () => {
      setActiveDomain(getDomainFromLocation());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleDomainChange = (domain: "food" | "instamart" | "dineout") => {
    setActiveDomain(domain);
    const target = domain === "food" ? "/discover" : `/discover?domain=${domain}`;
    setLocation(target);
  };

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantItemData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { addToCart, setIsCartOpen, selectedAddress } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  const [savedMeals, setSavedMeals] = useState<any[]>([]);

  // Effective query combining search input and category shortcut
  const effectiveQuery = search.trim() || (activeCategory !== "all" ? activeCategory : undefined);

  // Live Swiggy Food Recommendations for restaurants
  const {
    data: foodRecData,
    isLoading: loadingRestaurants,
    error: foodRecError,
    refetch: refetchFoodRecs,
  } = useRecommendations<FoodRecommendationResponse>("food", {
    query: effectiveQuery,
    mode: "restaurants",
    enabled: activeDomain === "food" && Boolean(selectedAddress?.id),
  });

  // Live Swiggy Food Menu Recommendations for selected restaurant sheet
  const {
    data: menuRecData,
    isLoading: loadingMenu,
  } = useRecommendations<FoodRecommendationResponse>("food", {
    mode: "menu",
    restaurantId: selectedRestaurant?.id ? String(selectedRestaurant.id) : undefined,
    enabled: activeDomain === "food" && Boolean(selectedRestaurant?.id) && isDetailOpen,
  });

  // Load user saved meals
  const loadSavedMeals = async () => {
    try {
      if (!user) {
        setSavedMeals([]);
        return;
      }

      const res = await fetch("/api/meals/saved", {
        headers: { Accept: "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        setSavedMeals([]);
        return;
      }

      const data = await res.json();
      setSavedMeals(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("[Discover] loadSavedMeals non-critical:", e);
      setSavedMeals([]);
    }
  };

  useEffect(() => {
    loadSavedMeals();
  }, [user]);

  // Toggle Save Meal
  const toggleSaveMeal = async (meal: any) => {
    const isSaved = savedMeals.some(
      (sm: any) => sm.mealId === meal.id || sm.name === meal.name || sm.meal_id === meal.id
    );

    try {
      if (!user) {
        toast({ title: "Please connect Swiggy to save meals", variant: "destructive" });
        return;
      }

      if (isSaved) {
        const target = savedMeals.find(
          (sm: any) => sm.mealId === meal.id || sm.name === meal.name || sm.meal_id === meal.id
        );
        if (target) {
          await fetch(`/api/meals/saved/${target.id}`, {
            method: "DELETE",
            credentials: "include",
          });
        }
        toast({ title: "Removed from Saved Meals ❤️" });
      } else {
        await fetch("/api/meals/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            mealId: meal.id,
            name: meal.name,
            description: meal.description || "",
            imageUrl: meal.imageUrl || "",
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fat: meal.fat,
            healthScore: meal.healthScore || meal.health_score,
            price: meal.price,
          }),
        });
        toast({ title: "Added to Saved Meals ❤️" });
      }
      await loadSavedMeals();
    } catch (e) {
      console.error("Failed to toggle saved meal:", e);
      toast({ title: "Operation failed", variant: "destructive" });
    }
  };

  const [selectedMealForDetail, setSelectedMealForDetail] = useState<FoodItemData | null>(null);

  // Add Meal to Cart
  const handleAddToCart = (item: FoodItemData, qty: number = 1) => {
    addToCart({
      id: `meal-db-${item.id}`,
      name: item.name,
      price: item.price,
      type: "meal",
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      healthScore: item.healthScore,
      imageUrl: item.imageUrl || undefined,
      cuisine: item.cuisine,
      description: item.description,
    }, qty);

    toast({
      title: "Added to Basket 🛒",
      description: `"${item.name}" (${qty}x) added to Food Basket.`,
    });
    setIsCartOpen(true);
  };

  // Map Live Food Recommendations to RestaurantItemData
  const filteredRestaurants: RestaurantItemData[] = useMemo(() => {
    if (!foodRecData?.recommendations) return [];

    return foodRecData.recommendations.map((rec) => {
      const c = rec.candidate;
      const meta = c.sourceMetadata;
      const cuisine =
        c.categoryTags?.join(", ") ||
        c.contextTags?.[0] ||
        "Multi-Cuisine";

      return {
        id: meta?.restaurantId || c.id,
        name: c.name || "Restaurant Partner",
        cuisine,
        rating: meta?.rating,
        deliveryTime: undefined,
        costForTwo: meta?.costForTwo,
        distance: meta?.distance,
        imageUrl: meta?.imageUrl || null,
        isOpen: c.availability !== "unavailable",
        tags: c.contextTags || [],
      };
    });
  }, [foodRecData]);

  // Live Menu items for the selected restaurant modal
  const selectedRestaurantMenuItems: FoodItemData[] = useMemo(() => {
    if (!menuRecData?.recommendations) return [];

    return menuRecData.recommendations.map((rec) => {
      const c = rec.candidate;
      const meta = c.sourceMetadata;
      const isVeg =
        c.safetyResult?.status === "eligible" &&
        (c.categoryTags?.includes("vegetarian") || !c.name?.toLowerCase().includes("chicken"));

      return {
        id: meta?.menuItemId || c.id,
        name: c.name || "Menu Item",
        price: c.price || 0,
        description: rec.explanation || "",
        imageUrl: null,
        restaurantName: selectedRestaurant?.name || meta?.restaurantName,
        cuisine: selectedRestaurant?.cuisine,
        isVegetarian: isVeg,
        healthScore: undefined,
      };
    });
  }, [menuRecData, selectedRestaurant]);

  // Open restaurant sheet
  const handleOpenRestaurant = (restaurant: RestaurantItemData) => {
    setSelectedRestaurant(restaurant);
    setIsDetailOpen(true);
  };

  const hasAnyResults = filteredRestaurants.length > 0;
  const isLoading = loadingRestaurants;

  return (
    <Layout>
      <PageContainer className="space-y-6 sm:space-y-8">
        {/* ─── 1. Explore Header ─── */}
        <header className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {activeDomain === "instamart"
                  ? "Instamart Groceries"
                  : activeDomain === "dineout"
                  ? "Dineout Restaurant Discovery"
                  : "Explore Food & Dining"}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {activeDomain === "instamart"
                  ? "Groceries & everyday essentials from Swiggy Instamart."
                  : activeDomain === "dineout"
                  ? "Explore popular dining destinations, partner tables, and dining offers."
                  : "Discover popular restaurants and wholesome meals available in your area."}
              </p>
            </div>

            {/* Swiggy Attribution */}
            <div className="shrink-0 self-start sm:self-auto">
              {activeDomain === "instamart" ? (
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5 shadow-2xs">
                  ⚡ Powered by Swiggy Instamart
                </span>
              ) : activeDomain === "dineout" ? (
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-1.5 shadow-2xs">
                  ⚡ Powered by Swiggy Dineout
                </span>
              ) : (
                <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-200/50 flex items-center gap-1.5 shadow-2xs">
                  ⚡ Powered by Swiggy
                </span>
              )}
            </div>
          </div>

          {/* ─── 2. Domain Navigation Tabs ─── */}
          <div className="pt-1">
            <ExploreDomainTabs activeDomain={activeDomain} onDomainChange={handleDomainChange} />
          </div>
        </header>

        {/* ─── Domain View Switching ─── */}
        {activeDomain === "instamart" ? (
          <InstamartDomainView />
        ) : activeDomain === "dineout" ? (
          <DineoutDomainView />
        ) : (
          <>
            {/* ─── 3. Search Bar ─── */}
          <div className="relative pt-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes, cuisines, or restaurants..."
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

          {/* ─── 4. Cuisine / Category Shortcuts ─── */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {CUISINE_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setActiveCategory(cat.value)}
                className={cn(
                  "whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border cursor-pointer shrink-0 shadow-2xs",
                  activeCategory === cat.value
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-card text-foreground/80 hover:bg-muted border-border/80"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

        {/* ─── 5. Loading / Error / Empty State ─── */}
        {!selectedAddress ? (
          <AppCard className="p-8 sm:p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <MapPin className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">No Delivery Address Selected</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Please select your delivery address from the TopBar above to discover live restaurants and menus available in your area.
              </p>
            </div>
          </AppCard>
        ) : foodRecError ? (
          <AppCard className="p-8 sm:p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <Utensils className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">Unable to load live recommendations</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {foodRecError.message || "Failed to reach Swiggy Food recommendation service. Please try again."}
              </p>
            </div>
            <SecondaryButton
              size="sm"
              onClick={() => refetchFoodRecs()}
              className="text-xs gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </SecondaryButton>
          </AppCard>
        ) : isLoading ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40 rounded-lg" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 rounded-2xl" />
                ))}
              </div>
            </div>
          </div>
        ) : !hasAnyResults ? (
          /* ─── 6. Empty State ─── */
          <AppCard className="p-8 sm:p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
              <Utensils className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">No matching food or restaurants</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No items found for "{search || activeCategory}". Try searching with a different term or resetting filters.
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
              <span>Reset Filters</span>
            </SecondaryButton>
          </AppCard>
        ) : (
          /* ─── 7. Main Discovery Content ─── */
          <div className="space-y-8">
            {/* A. Restaurant Discovery Section */}
            {filteredRestaurants.length > 0 && (
              <section className="space-y-3.5">
                <SectionHeader
                  title="Popular Restaurants Nearby"
                  subtitle="Browse partner kitchens available for delivery"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRestaurants.map((restaurant) => (
                    <RestaurantCard
                      key={restaurant.id}
                      restaurant={restaurant}
                      onClick={() => handleOpenRestaurant(restaurant)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ─── 8. Restaurant Detail / Menu Sheet ─── */}
        <RestaurantDetailSheet
          restaurant={selectedRestaurant}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          menuItems={selectedRestaurantMenuItems}
          isLoadingMenu={loadingMenu}
        />

        {/* ─── 9. Food Item Detail Sheet ─── */}
        <FoodItemDetailSheet
          item={selectedMealForDetail}
          isOpen={!!selectedMealForDetail}
          onClose={() => setSelectedMealForDetail(null)}
          onAddToCart={(item, qty) => handleAddToCart(item, qty)}
        />
      </>
    )}
  </PageContainer>
</Layout>
  );
}
