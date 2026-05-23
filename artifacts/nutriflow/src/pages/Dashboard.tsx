import { Layout } from "@/components/layout/Layout";
import { useListMeals } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Flame, Droplets, Activity, Zap, ShoppingCart, Heart } from "lucide-react";
import { useState, useEffect } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: meals, isLoading: loadingMeals } = useListMeals();
  const { addToCart, setIsCartOpen } = useCart();
  const { toast } = useToast();

  const [summary, setSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [savedMeals, setSavedMeals] = useState<any[]>([]);

  const loadWellnessSummary = async () => {
    const goalLower = (user?.goal || "").toLowerCase();
    
    let caloriesGoal = 2000;
    let proteinGoal = 120;
    let waterGoal = 3.0;

    if (goalLower.includes("loss") || goalLower.includes("lose") || goalLower.includes("slim") || goalLower.includes("cut")) {
      caloriesGoal = 1700;
      proteinGoal = 110;
      waterGoal = 2.7;
    } else if (goalLower.includes("muscle") || goalLower.includes("gain") || goalLower.includes("bulk") || goalLower.includes("gym")) {
      caloriesGoal = 2700;
      proteinGoal = 160;
      waterGoal = 3.5;
    }

    if (user?.weight) {
      proteinGoal = Math.round(user.weight * (goalLower.includes("muscle") ? 2.2 : 1.6));
      waterGoal = Number((user.weight * 0.04).toFixed(1));
    }

    setSummary({
      proteinIntake: Math.round(proteinGoal * 0.6),
      proteinGoal,
      waterIntake: Number((waterGoal * 0.65).toFixed(1)),
      waterGoal,
      caloriesConsumed: Math.round(caloriesGoal * 0.7),
      caloriesGoal,
      streak: user?.streak || 0,
      wellnessScore: user?.wellnessScore || 72,
      aiInsight: `Consistency is key! Keep up your healthy habits this week for your goal: "${user?.goal || 'Stay Healthy'}".`,
    });
    setLoadingSummary(false);
  };

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
        console.warn("[Dashboard] saved_meals fetch error (non-critical):", error.message);
        setSavedMeals([]);
        return;
      }

      setSavedMeals(data || []);
      console.log("[Dashboard] Loaded", data?.length ?? 0, "saved meals");
    } catch (e) {
      console.warn("[Dashboard] loadSavedMeals failed (non-critical):", e);
      setSavedMeals([]);
    }
  };

  useEffect(() => {
    if (user) {
      loadWellnessSummary();
      loadSavedMeals();
    }
  }, [user]);


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
            carbs: meal.carbs,
            fat: meal.fat,
            health_score: meal.healthScore,
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

  const handleAddToCart = (meal: any) => {
    addToCart({
      id: `meal-db-${meal.id}`,
      name: meal.name,
      price: meal.price,
      type: 'meal',
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      healthScore: meal.healthScore,
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
        <header>
          <h1 className="text-3xl font-bold text-foreground">Good Morning, {user?.name || "User"}!</h1>
          <p className="text-muted-foreground mt-1">Here is your wellness overview for today.</p>
        </header>

        {loadingSummary ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : summary ? (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-1 space-y-4 w-full">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Zap className="text-orange-500 h-5 w-5" />
                    AI Insight
                  </h3>
                  <div className="flex items-center gap-2 bg-background px-3 py-1 rounded-full text-sm font-medium border shadow-sm">
                    <Flame className="text-orange-500 h-4 w-4" />
                    {summary.streak} Day Streak
                  </div>
                </div>
                <p className="text-foreground/80 leading-relaxed">{summary.aiInsight}</p>
              </div>
              <div className="w-full md:w-1/3 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Calories</span>
                    <span className="font-medium">{summary.caloriesConsumed} / {summary.caloriesGoal}</span>
                  </div>
                  <Progress value={(summary.caloriesConsumed / summary.caloriesGoal) * 100} className="h-2 bg-background" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Protein</span>
                    <span className="font-medium">{summary.proteinIntake}g / {summary.proteinGoal}g</span>
                  </div>
                  <Progress value={(summary.proteinIntake / summary.proteinGoal) * 100} className="h-2 bg-background" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Recommended Meals</h2>
          {loadingMeals ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
            </div>
          ) : meals && meals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meals.slice(0, 3).map(meal => (
                <Card key={meal.id} className="overflow-hidden group hover:shadow-md transition-all">
                  <div className="aspect-video bg-muted relative">
                    {meal.imageUrl ? (
                      <img src={meal.imageUrl} alt={meal.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary/10">
                        <span className="text-muted-foreground">No Image</span>
                      </div>
                    )}
                    <button
                      onClick={() => toggleSaveMeal(meal)}
                      className="absolute top-2 left-2 p-1.5 rounded-full bg-background/80 hover:bg-background text-rose-500 shadow-xs transition-all hover:scale-105 z-10"
                      title={savedMeals.some((sm: any) => sm.meal_id === meal.id || sm.name === meal.name) ? "Unsave meal" : "Save meal"}
                    >
                      <Heart className="h-4 w-4" fill={savedMeals.some((sm: any) => sm.meal_id === meal.id || sm.name === meal.name) ? "currentColor" : "none"} />
                    </button>
                    {meal.isAiRecommended && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                        AI Pick
                      </div>
                    )}
                  </div>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-lg">{meal.name}</CardTitle>
                    <p className="text-sm text-muted-foreground line-clamp-1">{meal.description}</p>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 flex flex-col gap-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-3 text-muted-foreground font-medium">
                        <span>{meal.calories} kcal</span>
                        <span>{meal.protein}g P</span>
                      </div>
                      <span className="font-extrabold text-primary">₹{meal.price}</span>
                    </div>
                    <Button
                      onClick={() => handleAddToCart(meal)}
                      className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all hover-elevate h-9 text-xs"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 bg-muted/50 rounded-xl border border-dashed">
              <p className="text-muted-foreground">No recommendations available.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
