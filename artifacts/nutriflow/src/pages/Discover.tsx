import { useState, useEffect, useMemo } from "react";
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
import { Search, X, Utensils, Store, Compass, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useListMeals, useListRestaurants } from "@workspace/api-client-react";

import { ExploreDomainTabs } from "@/components/food/ExploreDomainTabs";
import { RestaurantCard, RestaurantItemData } from "@/components/food/RestaurantCard";
import { FoodItemCard, FoodItemData } from "@/components/food/FoodItemCard";
import { RestaurantDetailSheet } from "@/components/food/RestaurantDetailSheet";
import { FoodItemDetailSheet } from "@/components/food/FoodItemDetailSheet";

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

export default function Discover() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantItemData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { addToCart, setIsCartOpen } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  const [savedMeals, setSavedMeals] = useState<any[]>([]);

  // Real Database Queries
  const { data: databaseMeals, isLoading: loadingMeals } = useListMeals({
    search: search || undefined,
  });
  const { data: databaseRestaurants, isLoading: loadingRestaurants } = useListRestaurants();

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
            carbs: meal.carbs || 12,
            fat: meal.fat || 10,
            healthScore: meal.healthScore || meal.health_score || 8.5,
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

  // Filter Restaurants
  const filteredRestaurants: RestaurantItemData[] = useMemo(() => {
    if (!databaseRestaurants) return [];

    return databaseRestaurants
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        cuisine: r.cuisine,
        rating: r.rating || 4.2,
        deliveryTime: r.deliveryTime || "25-35 min",
        costForTwo: r.costForTwo || 350,
        imageUrl: r.imageUrl,
        isOpen: true,
        tags: r.tags || [],
      }))
      .filter((r) => {
        const matchesCategory =
          activeCategory === "all" ||
          r.cuisine.toLowerCase().includes(activeCategory.toLowerCase()) ||
          (r.tags && r.tags.some((t: string) => t.toLowerCase().includes(activeCategory.toLowerCase())));

        const matchesSearch =
          !search ||
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.cuisine.toLowerCase().includes(search.toLowerCase());

        return matchesCategory && matchesSearch;
      });
  }, [databaseRestaurants, activeCategory, search]);

  // Filter Meals / Dishes
  const filteredMeals: FoodItemData[] = useMemo(() => {
    if (!databaseMeals) return [];

    return databaseMeals
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        price: m.price,
        description: m.description,
        imageUrl: m.imageUrl,
        restaurantName: m.restaurantName || "Partner Kitchen",
        cuisine: m.cuisine,
        calories: m.calories,
        protein: m.protein,
        carbs: m.carbs,
        fat: m.fat,
        healthScore: m.healthScore,
        tags: m.tags || [],
      }))
      .filter((m) => {
        const matchesCategory =
          activeCategory === "all" ||
          (m.cuisine && m.cuisine.toLowerCase().includes(activeCategory.toLowerCase())) ||
          (m.tags && m.tags.some((t: string) => t.toLowerCase().includes(activeCategory.toLowerCase())));

        const matchesSearch =
          !search ||
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          (m.description && m.description.toLowerCase().includes(search.toLowerCase())) ||
          (m.cuisine && m.cuisine.toLowerCase().includes(search.toLowerCase()));

        return matchesCategory && matchesSearch;
      });
  }, [databaseMeals, activeCategory, search]);

  // Menu items for the selected restaurant modal
  const selectedRestaurantMenuItems: FoodItemData[] = useMemo(() => {
    if (!selectedRestaurant || !databaseMeals) return [];

    const directMatches = databaseMeals.filter(
      (m: any) => m.restaurantId === selectedRestaurant.id
    );

    if (directMatches.length > 0) {
      return directMatches.map((m: any) => ({
        id: m.id,
        name: m.name,
        price: m.price,
        description: m.description,
        imageUrl: m.imageUrl,
        restaurantName: selectedRestaurant.name,
        cuisine: m.cuisine,
        calories: m.calories,
        protein: m.protein,
      }));
    }

    // Fallback: items with matching cuisine or general partner items
    return databaseMeals.slice(0, 8).map((m: any) => ({
      id: m.id,
      name: m.name,
      price: m.price,
      description: m.description,
      imageUrl: m.imageUrl,
      restaurantName: selectedRestaurant.name,
      cuisine: m.cuisine,
      calories: m.calories,
      protein: m.protein,
    }));
  }, [selectedRestaurant, databaseMeals]);

  // Open restaurant sheet
  const handleOpenRestaurant = (restaurant: RestaurantItemData) => {
    setSelectedRestaurant(restaurant);
    setIsDetailOpen(true);
  };

  const hasAnyResults = filteredRestaurants.length > 0 || filteredMeals.length > 0;
  const isLoading = loadingMeals || loadingRestaurants;

  return (
    <Layout>
      <PageContainer className="space-y-6 sm:space-y-8">
        {/* ─── 1. Explore Header ─── */}
        <header className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Explore Food & Dining
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Discover popular restaurants and wholesome meals available in your area.
              </p>
            </div>

            {/* Swiggy Attribution */}
            <div className="shrink-0 self-start sm:self-auto">
              <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-200/50 flex items-center gap-1.5 shadow-2xs">
                ⚡ Powered by Swiggy
              </span>
            </div>
          </div>

          {/* ─── 2. Domain Navigation Tabs ─── */}
          <div className="pt-1">
            <ExploreDomainTabs activeDomain="food" />
          </div>

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
        </header>

        {/* ─── 5. Loading State ─── */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40 rounded-lg" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 rounded-2xl" />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-40 rounded-lg" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-64 rounded-2xl" />
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

            {/* B. Popular Food Choices Section */}
            {filteredMeals.length > 0 && (
              <section className="space-y-3.5">
                <SectionHeader
                  title="Popular Food Choices"
                  subtitle="Explore wholesome dishes available for delivery"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredMeals.map((meal) => {
                    const isSaved = savedMeals.some(
                      (sm: any) => sm.mealId === meal.id || sm.name === meal.name || sm.meal_id === meal.id
                    );

                    return (
                      <FoodItemCard
                        key={meal.id}
                        item={meal}
                        onAddToCart={() => handleAddToCart(meal)}
                        onSelect={(item) => setSelectedMealForDetail(item)}
                        onToggleSave={() => toggleSaveMeal(meal)}
                        isSaved={isSaved}
                      />
                    );
                  })}
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
          isLoadingMenu={loadingMeals}
        />

        {/* ─── 9. Food Item Detail Sheet ─── */}
        <FoodItemDetailSheet
          item={selectedMealForDetail}
          isOpen={!!selectedMealForDetail}
          onClose={() => setSelectedMealForDetail(null)}
          onAddToCart={(item, qty) => handleAddToCart(item, qty)}
        />
      </PageContainer>
    </Layout>
  );
}
