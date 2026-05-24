import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useListMeals, ListMealsFilter } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ShoppingCart, Heart, Star, Clock, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { MOCK_TRENDING_MEALS } from "@/lib/mockData";

const filters: { label: string; value: ListMealsFilter | "all" }[] = [
  { label: "All Healthy Foods", value: "all" },
  { label: "🔥 High Protein", value: "high-protein" },
  { label: "🥦 Low Carb", value: "low-carb" },
  { label: "💪 Gym Meals", value: "gym-meals" },
  { label: "🪙 Budget Deals", value: "budget" },
];

export default function Discover() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ListMealsFilter | "all">("all");
  const { addToCart, setIsCartOpen } = useCart();
  const { toast } = useToast();
  
  const [savedMeals, setSavedMeals] = useState<any[]>([]);

  const loadSavedMeals = async () => {
    try {
      const { data: { user: sbUser } } = await supabase.auth.getUser();
      if (!sbUser) {
        setSavedMeals([]);
        return;
      }

      const { data, error } = await supabase
        .from("saved_meals")
        .select("*")
        .eq("user_id", sbUser.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[Discover] saved_meals fetch error (non-critical):", error.message);
        setSavedMeals([]);
        return;
      }

      setSavedMeals(data || []);
    } catch (e) {
      console.warn("[Discover] loadSavedMeals failed (non-critical):", e);
      setSavedMeals([]);
    }
  };

  useEffect(() => {
    loadSavedMeals();
  }, []);

  const toggleSaveMeal = async (meal: any) => {
    const isSaved = savedMeals.some((sm: any) => sm.meal_id === meal.id || sm.name === meal.name);
    try {
      const { data: { user: sbUser } } = await supabase.auth.getUser();
      if (!sbUser) return;

      if (isSaved) {
        const target = savedMeals.find((sm: any) => sm.meal_id === meal.id || sm.name === meal.name);
        if (target) {
          const { error } = await supabase
            .from("saved_meals")
            .delete()
            .eq("id", target.id);
          if (error) throw error;
        }
        toast({ title: "Removed from Saved Meals ❤️" });
      } else {
        const { error } = await supabase
          .from("saved_meals")
          .insert({
            user_id: sbUser.id,
            meal_id: meal.id,
            name: meal.name,
            description: meal.description || "",
            image_url: meal.imageUrl || "",
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs || 12,
            fat: meal.fat || 10,
            health_score: meal.healthScore || meal.health_score || 8.5,
            price: meal.price,
          });
        if (error) throw error;
        toast({ title: "Added to Saved Meals ❤️" });
      }
      await loadSavedMeals();
    } catch (e) {
      console.error("Failed to toggle saved meal:", e);
      toast({ title: "Operation failed", variant: "destructive" });
    }
  };

  const { data: databaseMeals, isLoading } = useListMeals({
    search: search || undefined,
    filter: activeFilter === "all" ? undefined : activeFilter
  });

  // Blend database meals with high quality search/filter matching mock meals
  const filteredMocks = MOCK_TRENDING_MEALS.filter(m => {
    const matchesFilter = activeFilter === "all" || m.tags.includes(activeFilter);
    const matchesSearch = !search || 
      m.name.toLowerCase().includes(search.toLowerCase()) || 
      m.cuisine.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const meals: any[] = databaseMeals && databaseMeals.length > 0
    ? [...databaseMeals, ...filteredMocks.slice(databaseMeals.length)]
    : filteredMocks;

  const handleAddToCart = (meal: any) => {
    addToCart({
      id: `meal-db-${meal.id}`,
      name: meal.name,
      price: meal.price,
      type: 'meal',
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs || 12,
      fat: meal.fat || 10,
      healthScore: meal.healthScore || meal.health_score || 8.5,
      imageUrl: meal.imageUrl,
      cuisine: meal.cuisine,
      description: meal.description,
    });
    toast({
      title: "Added to Cart! 🛒",
      description: `"${meal.name}" added to Swiggy commerce basket.`,
    });
    setIsCartOpen(true);
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8 space-y-8 pb-24">
        <header className="space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight">Discover Healthy Meals</h1>
          <p className="text-muted-foreground text-sm -mt-2">Filter and search across partner restaurants serving certified clean recipes.</p>
          <div className="relative max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for keto, oats, protein salad, cuisine..." 
              className="pl-11 py-6 rounded-2xl bg-muted/50 border-transparent focus:bg-background focus:ring-primary focus-visible:ring-primary transition-all text-base shadow-inner"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={cn(
                  "whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 border",
                  activeFilter === f.value 
                    ? "bg-primary text-primary-foreground border-primary shadow-sm scale-102" 
                    : "bg-background text-foreground/80 hover:bg-muted border-border/80"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <Card key={i} className="overflow-hidden rounded-2xl border-border/40">
                <Skeleton className="aspect-square w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : meals && meals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
            {meals.map(meal => {
              const isSaved = savedMeals.some((sm: any) => sm.meal_id === meal.id || sm.name === meal.name);
              return (
                <Card key={meal.id} className="overflow-hidden group hover:shadow-lg hover:border-primary/20 transition-all duration-300 border-border/50 rounded-2xl flex flex-col justify-between">
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {meal.imageUrl ? (
                      <img 
                        src={meal.imageUrl} 
                        alt={meal.name} 
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary/10">
                        <span className="text-muted-foreground text-xs">No Image</span>
                      </div>
                    )}
                    
                    {meal.isAiRecommended && (
                      <div className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-full shadow-md uppercase tracking-wider">
                        AI Choice
                      </div>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSaveMeal(meal);
                      }}
                      className={cn(
                        "absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all shadow-md z-10",
                        isSaved
                          ? "bg-red-500/90 text-white hover:bg-red-600/90"
                          : "bg-black/40 text-white/90 hover:bg-black/60"
                      )}
                    >
                      <Heart className={cn("h-4 w-4", isSaved && "fill-current")} />
                    </button>

                    {/* Delivery Time Overlay */}
                    <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {meal.deliveryTime || "22 min"}
                    </div>
                  </div>

                  <CardHeader className="p-4 pb-2">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                        {meal.restaurantName || "The Healthy Pantry"}
                      </p>
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-sm font-extrabold leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                          {meal.name}
                        </CardTitle>
                        <span className="font-extrabold text-sm text-emerald-600 shrink-0">₹{meal.price}</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-2">
                        {meal.description}
                      </p>

                      {/* Info & Rating bar */}
                      <div className="flex items-center gap-3 text-[10px] font-semibold text-muted-foreground">
                        <span className="flex items-center gap-0.5 text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                          <Star className="h-3 w-3 fill-current" />
                          {meal.rating || 4.7}
                        </span>
                        <span>•</span>
                        <span>⭐ Health: {meal.healthScore || meal.health_score || 9.0}/10</span>
                      </div>

                      {/* Active discount code tag */}
                      {meal.discount && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/10">
                          <Tag className="h-3.5 w-3.5" />
                          <span>{meal.discount}</span>
                        </div>
                      )}

                      {/* Macros breakdown */}
                      <div className="grid grid-cols-3 gap-1 bg-muted/40 p-2 rounded-xl text-center text-[10px] font-bold">
                        <div>
                          <p className="text-[8px] text-muted-foreground uppercase">Calories</p>
                          <p className="text-foreground mt-0.5">{meal.calories} kcal</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-muted-foreground uppercase">Protein</p>
                          <p className="text-foreground mt-0.5">{meal.protein}g</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-muted-foreground uppercase">Carbs</p>
                          <p className="text-foreground mt-0.5">{meal.carbs || 12}g</p>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleAddToCart(meal)}
                      className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all hover:scale-[1.01] h-9 text-xs mt-2"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Add to Basket
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-12 bg-muted/30 rounded-2xl border border-dashed border-border/80">
            <p className="text-lg font-bold text-foreground">No matches found</p>
            <p className="text-muted-foreground text-sm mt-1">Try adjusting your keyword or filters.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

