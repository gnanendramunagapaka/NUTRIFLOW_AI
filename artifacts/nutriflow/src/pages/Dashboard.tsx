import { useState, useEffect } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Flame,
  Droplets,
  Heart,
  Plus,
  Minus,
  Sparkles,
  Utensils,
  ShoppingBag,
  Compass,
  ArrowRight,
  User as UserIcon,
  ShoppingCart,
  CalendarCheck,
  Check,
  Star,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import {
  useListMeals,
  useListRestaurants,
  useGetGroceryList,
} from "@workspace/api-client-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { addToCart, setIsCartOpen } = useCart();
  const { toast } = useToast();

  // Real database queries via API client
  const { data: databaseMeals, isLoading: loadingMeals } = useListMeals();
  const { data: restaurants, isLoading: loadingRestaurants } = useListRestaurants();
  const { data: groceryList, isLoading: loadingGroceries } = useGetGroceryList();

  const [savedMeals, setSavedMeals] = useState<any[]>([]);
  const [waterCups, setWaterCups] = useState(6);

  // Time-aware greeting
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Hydration target based on user metrics
  const targetWaterLiters = user?.weight
    ? Number((user.weight * 0.04).toFixed(1))
    : 3.0;
  const currentWaterLiters = Number((waterCups * 0.25).toFixed(2));
  const hydrationPercent = Math.min(100, Math.round((currentWaterLiters / targetWaterLiters) * 100));

  // Load saved meals for this user
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
      console.warn("[Dashboard] loadSavedMeals non-critical:", e);
      setSavedMeals([]);
    }
  };

  useEffect(() => {
    if (user) {
      loadSavedMeals();
    }
  }, [user]);

  // Save / Unsave Meal handler
  const toggleSaveMeal = async (meal: any) => {
    const isSaved = savedMeals.some(
      (sm: any) => sm.mealId === meal.id || sm.name === meal.name || sm.meal_id === meal.id
    );

    try {
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

  // Add Meal to Swiggy Commerce Basket
  const handleAddToCart = (meal: any) => {
    addToCart({
      id: `meal-db-${meal.id}`,
      name: meal.name,
      price: meal.price,
      type: "meal",
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
      title: "Added to Basket 🛒",
      description: `"${meal.name}" added to your Swiggy order.`,
    });
    setIsCartOpen(true);
  };

  // Adjust Water Intake
  const adjustWater = (amount: number) => {
    setWaterCups((prev) => Math.max(0, prev + amount));
  };

  // Deterministic daily guidance based on user goal
  const getGoalGuidance = (goal: string) => {
    const lower = goal.toLowerCase();
    if (lower.includes("muscle") || lower.includes("gain") || lower.includes("strength")) {
      return "Prioritize protein-forward meals and steady hydration to fuel muscle synthesis.";
    }
    if (lower.includes("loss") || lower.includes("weight") || lower.includes("cut")) {
      return "Focus on high-fiber whole foods and mindful portion sizes to maintain your deficit.";
    }
    if (lower.includes("energy")) {
      return "Opt for complex carbohydrates and regular hydration to maintain peak daily stamina.";
    }
    return "Focus on balanced, colorful meals and consistent daily hydration.";
  };

  // Streak days calculation (real user streak)
  const streakCount = user?.streak ?? 1;
  const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <Layout>
      <PageContainer className="space-y-6 sm:space-y-8">
        {/* ─── 1. Home Header: Warm & Time-Aware ─── */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {timeGreeting}, {user?.name?.split(" ")[0] || "Friend"}!
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {getGoalGuidance(user?.goal || "Healthy Eating")}
            </p>
          </div>

          {/* User Score & Streak Badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3.5 py-1.5 rounded-full border border-emerald-500/20 text-xs font-semibold shadow-2xs">
              <CalendarCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{streakCount} Day Streak</span>
            </div>

            <div className="flex items-center gap-2 bg-primary/10 text-primary px-3.5 py-1.5 rounded-full border border-primary/20 text-xs font-semibold shadow-2xs">
              <Activity className="h-4 w-4 text-primary" />
              <span>Wellness Score: {user?.wellnessScore ?? 78}%</span>
            </div>
          </div>
        </header>

        {/* ─── 2. Quick Actions Rail ─── */}
        <section aria-label="Quick Actions">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setLocation("/discover")}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/80 hover:border-primary/40 hover:bg-muted/40 transition-all text-left shadow-2xs group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-[#FC8019] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                <Utensils className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs sm:text-sm font-bold text-foreground truncate">
                  Find Meals
                </span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  Healthy dining
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setLocation("/grocery")}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/80 hover:border-primary/40 hover:bg-muted/40 transition-all text-left shadow-2xs group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs sm:text-sm font-bold text-foreground truncate">
                  Groceries
                </span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  Instamart picks
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setLocation("/chat")}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/80 hover:border-primary/40 hover:bg-muted/40 transition-all text-left shadow-2xs group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs sm:text-sm font-bold text-foreground truncate">
                  AI Copilot
                </span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  Ask NutriFlow
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setLocation("/profile")}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/80 hover:border-primary/40 hover:bg-muted/40 transition-all text-left shadow-2xs group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                <UserIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs sm:text-sm font-bold text-foreground truncate">
                  My Profile
                </span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  Goals & stats
                </span>
              </div>
            </button>
          </div>
        </section>

        {/* ─── 3. Main Dashboard Responsive Grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Left 2 Columns: Today's Focus & Food ─── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Daily Context Banner */}
            <AppCard className="p-5 sm:p-6 bg-gradient-to-r from-primary/5 via-card to-card">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <Pill variant="success">Today's Focus</Pill>
                    <span className="text-xs font-semibold text-muted-foreground">
                      Goal: {user?.goal || "Stay Healthy"}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    Consistent habits create lasting wellness
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Track your hydration, stay within your macro range, and enjoy clean dining tailored to your preferences.
                  </p>
                </div>

                <Link href="/discover">
                  <SecondaryButton size="sm" className="whitespace-nowrap shrink-0">
                    Discover Meals
                  </SecondaryButton>
                </Link>
              </div>
            </AppCard>

            {/* Hydration & Daily Progress Block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Real Hydration Tracker */}
              <AppCard className="p-5 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-5 w-5 text-sky-500" />
                    <h3 className="text-sm font-bold text-foreground">Hydration Tracker</h3>
                  </div>
                  <Pill variant="info">{hydrationPercent}% of Goal</Pill>
                </div>

                <div className="flex items-center justify-center gap-6 py-2">
                  <div className="text-center">
                    <span className="text-3xl font-extrabold text-sky-600 dark:text-sky-400">
                      {currentWaterLiters} L
                    </span>
                    <span className="block text-[11px] text-muted-foreground mt-0.5">
                      Target: {targetWaterLiters} L
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustWater(-1)}
                    disabled={waterCups <= 0}
                    className="h-9 w-9 rounded-xl border-border/80"
                    aria-label="Remove one cup of water"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-semibold text-foreground px-2">
                    {waterCups} Cups ({waterCups * 250} ml)
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustWater(1)}
                    className="h-9 w-9 rounded-xl border-border/80"
                    aria-label="Add one cup of water"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </AppCard>

              {/* Weekly Consistency Progress */}
              <AppCard className="p-5 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-sm font-bold text-foreground">Weekly Consistency</h3>
                  </div>
                  <Pill variant="success">{streakCount} Days Active</Pill>
                </div>

                <div className="space-y-2 py-1">
                  <p className="text-xs text-muted-foreground">
                    Maintaining routine habits improves metabolic recovery and wellness scores.
                  </p>
                  <div className="flex items-center justify-between gap-1.5 pt-2">
                    {daysOfWeek.map((day, idx) => {
                      const isActive = idx < Math.min(streakCount, 7);
                      return (
                        <div key={idx} className="flex flex-col items-center gap-1.5 flex-1">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                              isActive
                                ? "bg-primary text-primary-foreground shadow-2xs"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isActive ? <Check className="h-3.5 w-3.5" /> : day}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{day}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                  <span>Streak auto-syncs with daily activity</span>
                </div>
              </AppCard>
            </div>

            {/* ─── 4. Recommended Food Section ─── */}
            <section className="space-y-4 pt-2">
              <SectionHeader
                title="Curated Meals For You"
                subtitle="Clean, balanced meals aligned with your nutritional preferences"
                action={
                  <Link href="/discover">
                    <Button variant="ghost" size="sm" className="text-xs font-semibold gap-1 text-primary">
                      <span>View All</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                }
              />

              {loadingMeals ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-64 rounded-2xl" />
                  ))}
                </div>
              ) : databaseMeals && databaseMeals.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {databaseMeals.slice(0, 4).map((meal: any) => {
                    const isSaved = savedMeals.some(
                      (sm: any) => sm.mealId === meal.id || sm.name === meal.name || sm.meal_id === meal.id
                    );
                    return (
                      <AppCard
                        key={meal.id}
                        className="flex flex-col justify-between overflow-hidden group hover:border-primary/40 transition-all"
                      >
                        <div className="aspect-[16/9] bg-muted relative overflow-hidden">
                          {meal.imageUrl ? (
                            <img
                              src={meal.imageUrl}
                              alt={meal.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted/60 text-muted-foreground text-xs">
                              NutriFlow Clean Recipe
                            </div>
                          )}

                          {/* Save Heart Button */}
                          <button
                            type="button"
                            onClick={() => toggleSaveMeal(meal)}
                            className="absolute top-2.5 right-2.5 p-2 rounded-full bg-background/90 text-rose-500 shadow-xs hover:scale-110 transition-transform cursor-pointer"
                            aria-label={isSaved ? "Remove from saved" : "Save meal"}
                          >
                            <Heart className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} />
                          </button>

                          {meal.healthScore && (
                            <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-xs text-[10px] font-bold text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                              <Star className="h-3 w-3 fill-emerald-500 text-emerald-500" />
                              <span>{meal.healthScore}/10 Health</span>
                            </div>
                          )}
                        </div>

                        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-bold text-foreground line-clamp-1">
                                {meal.name}
                              </h4>
                              <span className="text-xs font-black text-emerald-600 shrink-0">
                                ₹{meal.price}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {meal.description}
                            </p>
                          </div>

                          <div className="space-y-3 pt-1">
                            <div className="grid grid-cols-2 gap-2 text-center text-xs bg-muted/30 p-2 rounded-xl">
                              <div>
                                <span className="text-[10px] text-muted-foreground uppercase block font-medium">
                                  Calories
                                </span>
                                <span className="font-bold text-foreground">{meal.calories} kcal</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-muted-foreground uppercase block font-medium">
                                  Protein
                                </span>
                                <span className="font-bold text-foreground">{meal.protein}g</span>
                              </div>
                            </div>

                            <PrimaryButton
                              size="sm"
                              onClick={() => handleAddToCart(meal)}
                              className="w-full h-10 text-xs font-semibold gap-1.5"
                            >
                              <ShoppingCart className="h-3.5 w-3.5" />
                              <span>Add to Basket</span>
                            </PrimaryButton>
                          </div>
                        </div>
                      </AppCard>
                    );
                  })}
                </div>
              ) : (
                <AppCard className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                    <Utensils className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">
                    Personalized Recommendations Pending
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Personalized meal picks based on your goal of "{user?.goal || 'healthy eating'}" will appear here.
                  </p>
                  <Link href="/discover">
                    <SecondaryButton size="sm">Explore Available Meals</SecondaryButton>
                  </Link>
                </AppCard>
              )}
            </section>
          </div>

          {/* ─── Right Column: Profile Summary, Copilot & Groceries ─── */}
          <div className="space-y-6">
            {/* Compact Profile Summary Card */}
            <AppCard className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4.5 w-4.5 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Your Profile Context</h3>
                </div>
                <Link href="/profile">
                  <span className="text-xs font-semibold text-primary hover:underline cursor-pointer">
                    Edit
                  </span>
                </Link>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Primary Goal</span>
                  <span className="font-bold text-foreground">{user?.goal || "Healthy Living"}</span>
                </div>

                <div className="flex justify-between items-start gap-2">
                  <span className="text-muted-foreground">Dietary</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {user?.dietaryPreferences && user.dietaryPreferences.length > 0 ? (
                      user.dietaryPreferences.slice(0, 2).map((d) => (
                        <Pill key={d} variant="default" className="text-[10px]">
                          {d}
                        </Pill>
                      ))
                    ) : (
                      <span className="font-medium text-foreground">Standard</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Activity Level</span>
                  <span className="font-medium text-foreground">
                    {user?.workoutFrequency || "Moderate"}
                  </span>
                </div>

                {user?.allergies && user.allergies.length > 0 && !user.allergies.includes("None") && (
                  <div className="flex justify-between items-start gap-2 pt-1 border-t border-border/40">
                    <span className="text-muted-foreground">Allergens</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {user.allergies.map((a) => (
                        <Pill key={a} variant="error" className="text-[10px]">
                          {a}
                        </Pill>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AppCard>

            {/* AI Copilot Quick Entry Card */}
            <AppCard className="p-5 bg-primary/5 border-primary/20 space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Ask NutriFlow Copilot</h3>
                  <span className="text-[11px] text-muted-foreground">AI Nutrition Assistant</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Have a question about what to eat next, daily macros, or finding certified clean food?
              </p>

              <div className="space-y-1.5">
                {[
                  "What should I order for lunch?",
                  "Suggest high-protein snacks",
                  "Plan my grocery basket",
                ].map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLocation("/chat")}
                    className="w-full text-left p-2 rounded-xl bg-background border border-border/70 hover:border-primary/40 text-[11px] font-medium text-foreground flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="truncate">"{prompt}"</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 ml-1" />
                  </button>
                ))}
              </div>

              <Link href="/chat">
                <PrimaryButton size="sm" className="w-full mt-1 text-xs">
                  Open AI Copilot
                </PrimaryButton>
              </Link>
            </AppCard>

            {/* Smart Grocery Picks (Instamart Direction) */}
            <AppCard className="p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4.5 w-4.5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-foreground">Smart Grocery Picks</h3>
                </div>
                <Pill variant="success">Instamart</Pill>
              </div>

              {groceryList && groceryList.items && groceryList.items.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    You have {groceryList.items.length} items planned on your weekly grocery basket.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {groceryList.items.slice(0, 4).map((item: any) => (
                      <span
                        key={item.id}
                        className="text-[11px] font-semibold bg-muted px-2 py-0.5 rounded-md text-foreground"
                      >
                        {item.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Generate healthy grocery lists and essential pantry items delivered via Swiggy Instamart.
                </p>
              )}

              <Link href="/grocery">
                <SecondaryButton size="sm" className="w-full text-xs">
                  Plan Groceries
                </SecondaryButton>
              </Link>
            </AppCard>

            {/* Dineout Discovery Direction */}
            <AppCard className="p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="h-4.5 w-4.5 text-orange-500" />
                  <h3 className="text-sm font-bold text-foreground">Eat Out, Your Way</h3>
                </div>
                <Pill variant="warning">Dineout</Pill>
              </div>

              {restaurants && restaurants.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {restaurants.length} partner restaurants serving certified wholesome dishes nearby.
                  </p>
                  <div className="space-y-1.5">
                    {restaurants.slice(0, 2).map((r: any) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-muted/30 border border-border/40 text-xs"
                      >
                        <span className="font-semibold text-foreground truncate max-w-[140px]">
                          {r.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {r.cuisine || "Healthy"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Discover partner restaurants serving certified clean meals tailored to your dietary goals.
                </p>
              )}

              <Link href="/discover">
                <SecondaryButton size="sm" className="w-full text-xs">
                  Explore Restaurants
                </SecondaryButton>
              </Link>
            </AppCard>
          </div>
        </div>
      </PageContainer>
    </Layout>
  );
}
