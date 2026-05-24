import { Layout } from "@/components/layout/Layout";
import { useListMeals } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Flame, Droplets, Activity, Zap, ShoppingCart, Heart, Plus, Minus, Trophy, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  Legend,
  CartesianGrid,
} from "recharts";

import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { MOCK_TRENDING_MEALS, MOCK_WEEKLY_STATS, MOCK_WELLNESS_SUMMARY } from "@/lib/mockData";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: databaseMeals, isLoading: loadingMeals } = useListMeals();
  const { addToCart, setIsCartOpen } = useCart();
  const { toast } = useToast();

  const [summary, setSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [savedMeals, setSavedMeals] = useState<any[]>([]);
  const [waterCups, setWaterCups] = useState(6);

  // Blend loaded meals with mock meals to always display high-quality trending content
  const meals = databaseMeals && databaseMeals.length > 0 
    ? [...databaseMeals, ...MOCK_TRENDING_MEALS.slice(databaseMeals.length)]
    : MOCK_TRENDING_MEALS;

  const loadWellnessSummary = async () => {
    const goalLower = (user?.goal || "").toLowerCase();
    
    let caloriesGoal = 2000;
    let proteinGoal = 120;
    let waterGoal = 3.5;

    if (goalLower.includes("loss") || goalLower.includes("lose") || goalLower.includes("slim") || goalLower.includes("cut")) {
      caloriesGoal = 1700;
      proteinGoal = 110;
      waterGoal = 2.7;
    } else if (goalLower.includes("muscle") || goalLower.includes("gain") || goalLower.includes("bulk") || goalLower.includes("gym")) {
      caloriesGoal = 2700;
      proteinGoal = 160;
      waterGoal = 3.8;
    }

    if (user?.weight) {
      proteinGoal = Math.round(user.weight * (goalLower.includes("muscle") ? 2.2 : 1.6));
      waterGoal = Number((user.weight * 0.04).toFixed(1));
    }

    setSummary({
      proteinIntake: Math.round(proteinGoal * 0.65),
      proteinGoal,
      waterGoal,
      caloriesConsumed: Math.round(caloriesGoal * 0.72),
      caloriesGoal,
      streak: user?.streak || MOCK_WELLNESS_SUMMARY.streak,
      wellnessScore: user?.wellnessScore || MOCK_WELLNESS_SUMMARY.wellnessScore,
      aiInsight: MOCK_WELLNESS_SUMMARY.aiInsight,
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

  // Water cup interaction helper (approx. 250ml per cup)
  const adjustWater = (amount: number) => {
    setWaterCups(prev => Math.max(0, prev + amount));
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-8 space-y-8 pb-24">
        {/* Header Block */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
              Good Morning, {user?.name || "Fitness Enthusiast"}!
            </h1>
            <p className="text-muted-foreground mt-1">Here is your wellness overview for today.</p>
          </div>
          <div className="flex gap-2.5">
            <div className="flex items-center gap-2 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/20 font-semibold shadow-xs">
              <Trophy className="h-4.5 w-4.5 text-emerald-600" />
              <span>{summary?.streak || 5} Day Streak</span>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full border border-primary/20 font-semibold shadow-xs">
              <Activity className="h-4.5 w-4.5 text-primary" />
              <span>Score: {summary?.wellnessScore || 84}%</span>
            </div>
          </div>
        </header>

        {/* AI Insight Header Banner */}
        {loadingSummary ? (
          <Skeleton className="h-32 w-full rounded-2xl" />
        ) : summary ? (
          <Card className="bg-gradient-to-tr from-emerald-500/5 via-primary/5 to-background border-primary/20 shadow-xs relative overflow-hidden rounded-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
            <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-1 space-y-3 w-full">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="text-primary h-4.5 w-4.5 animate-pulse" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground flex items-center gap-1.5">
                    AI Wellness Co-Pilot
                  </h3>
                </div>
                <p className="text-foreground/80 leading-relaxed text-sm">{summary.aiInsight}</p>
              </div>
              <div className="w-full md:w-1/3 space-y-4 border-t md:border-t-0 md:border-l border-border/60 pt-4 md:pt-0 md:pl-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>Daily Calories</span>
                    <span>{summary.caloriesConsumed} / {summary.caloriesGoal} kcal</span>
                  </div>
                  <Progress value={(summary.caloriesConsumed / summary.caloriesGoal) * 100} className="h-2.5 bg-muted rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>Protein Target</span>
                    <span>{summary.proteinIntake}g / {summary.proteinGoal}g</span>
                  </div>
                  <Progress value={(summary.proteinIntake / summary.proteinGoal) * 100} className="h-2.5 bg-muted rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hydration Tracker */}
          <Card className="rounded-2xl border-border/50 shadow-xs flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Droplets className="text-blue-500 h-5 w-5" />
                Hydration Tracker
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="flex flex-col items-center justify-center space-y-3 py-4">
                <div className="relative flex items-center justify-center">
                  <div className="h-28 w-28 rounded-full border-4 border-blue-500/20 flex flex-col items-center justify-center bg-blue-500/5">
                    <span className="text-2xl font-extrabold text-blue-600">{(waterCups * 0.25).toFixed(2)}L</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">of {summary?.waterGoal || 3.5}L</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-medium text-center">
                  You logged {waterCups} cups of pure water today.
                </p>
              </div>
              <div className="flex justify-center items-center gap-4">
                <Button 
                  onClick={() => adjustWater(-1)} 
                  variant="outline" 
                  size="icon" 
                  className="h-10 w-10 rounded-full border-blue-200 hover:bg-blue-50 text-blue-600"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-sm font-bold text-foreground">{waterCups} Cups</span>
                <Button 
                  onClick={() => adjustWater(1)} 
                  variant="outline" 
                  size="icon" 
                  className="h-10 w-10 rounded-full border-blue-200 hover:bg-blue-50 text-blue-600"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Calorie & Protein Analytics */}
          <Card className="lg:col-span-2 rounded-2xl border-border/50 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="text-emerald-600 h-5 w-5" />
                Weekly Progress Trends
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_WEEKLY_STATS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 500 }} stroke="#888888" />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#888888" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#10b981" />
                  <ChartTooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} 
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 500 }} />
                  <Bar yAxisId="left" dataKey="Calories" fill="#3b82f6" name="Calories (kcal)" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar yAxisId="right" dataKey="Protein" fill="#10b981" name="Protein (g)" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recommended Foods Block */}
        <div className="space-y-5 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Flame className="text-orange-500 h-6 w-6" />
              Healthy Swiggy Meals For You
            </h2>
          </div>

          {loadingMeals ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meals.slice(0, 3).map((meal: any) => {
                const isSaved = savedMeals.some((sm: any) => sm.meal_id === meal.id || sm.name === meal.name);
                return (
                  <Card key={meal.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50 rounded-2xl flex flex-col justify-between">
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      {meal.imageUrl ? (
                        <img 
                          src={meal.imageUrl} 
                          alt={meal.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-secondary/10">
                          <span className="text-muted-foreground text-xs">No Image</span>
                        </div>
                      )}
                      
                      {/* Save Button */}
                      <button
                        onClick={() => toggleSaveMeal(meal)}
                        className="absolute top-3 left-3 p-2 rounded-full bg-background/90 text-rose-500 shadow-md transition-all hover:scale-110 z-10"
                        title={isSaved ? "Unsave meal" : "Save meal"}
                      >
                        <Heart className="h-4.5 w-4.5" fill={isSaved ? "currentColor" : "none"} />
                      </button>

                      {/* AI Pick Badge */}
                      {meal.isAiRecommended && (
                        <div className="absolute top-3 right-3 bg-emerald-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-full shadow-md uppercase tracking-wider">
                          AI Pick
                        </div>
                      )}

                      {/* Delivery Time Overlay */}
                      <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                        {meal.deliveryTime || "20-25 mins"}
                      </div>
                    </div>

                    <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="text-base font-extrabold text-foreground leading-tight line-clamp-1">
                            {meal.name}
                          </h3>
                          <span className="text-sm font-black text-emerald-600 shrink-0">₹{meal.price}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {meal.description}
                        </p>
                      </div>

                      <div className="space-y-4 pt-1">
                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5">
                          {(meal.tags || []).slice(0, 3).map((tag: string) => (
                            <span 
                              key={tag} 
                              className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-md uppercase"
                            >
                              {tag.replace("-", " ")}
                            </span>
                          ))}
                        </div>

                        {/* Nutrition values */}
                        <div className="grid grid-cols-3 gap-2 bg-muted/40 p-2.5 rounded-xl text-center text-xs">
                          <div>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase">Calories</p>
                            <p className="font-bold text-foreground mt-0.5">{meal.calories} kcal</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase">Protein</p>
                            <p className="font-bold text-foreground mt-0.5">{meal.protein}g</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase">Health</p>
                            <p className="font-extrabold text-emerald-600 mt-0.5">
                              ⭐ {meal.healthScore || meal.health_score || 9.0}/10
                            </p>
                          </div>
                        </div>

                        {/* Add to Basket Action */}
                        <Button
                          onClick={() => handleAddToCart(meal)}
                          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-md transition-all hover:scale-[1.01] h-10 text-xs"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Add to Basket
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

