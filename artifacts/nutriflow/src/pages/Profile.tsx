import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { getSwiggyConnectionStatus } from "@/lib/swiggyAuth";
import {
  Scale,
  Heart,
  Sparkles,
  Calendar,
  Check,
  Activity,
  User,
  ShieldCheck,
  LogOut,
  Save,
  Trash2,
  ShoppingCart,
  Loader2,
  RefreshCw,
  Utensils,
  Flame,
  Dumbbell,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Predefined choices matching onboarding schema
const GOAL_OPTIONS = [
  "Stay Fit & Lean",
  "Muscle Building & Strength",
  "Fat Loss & Metabolism",
  "Balanced Healthy Eating",
  "High Energy & Endurance",
];

const DIETARY_OPTIONS = [
  "Vegetarian",
  "High Protein",
  "Vegan",
  "Eggetarian",
  "Keto Friendly",
  "Low Carb",
];

const ALLERGY_OPTIONS = [
  "Peanuts",
  "Dairy / Lactose",
  "Gluten / Wheat",
  "Soy",
  "Shellfish",
  "Tree Nuts",
];

const ACTIVITY_OPTIONS = [
  "Light (1-2 days/week)",
  "Moderate (3-4 days/week)",
  "Active (5+ days/week)",
  "Sedentary / Desk Job",
];

const HYDRATION_OPTIONS = [
  "1 - 2 Litres / day",
  "2 - 3 Litres / day",
  "3+ Litres / day",
];

const MEAL_HABIT_OPTIONS = [
  "3 Balanced Meals",
  "Frequent Small Meals",
  "Intermittent Fasting",
];

export default function Profile() {
  const { user: profile, updateOnboarding, logout, loading: isLoading } = useAuth();
  const { addToCart, setIsCartOpen } = useCart();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"overview" | "edit" | "saved" | "settings">("overview");

  // Form State
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [goal, setGoal] = useState("");
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [workoutFrequency, setWorkoutFrequency] = useState("");
  const [waterIntake, setWaterIntake] = useState("");
  const [mealHabits, setMealHabits] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Swiggy connection status
  const [swiggyStatus, setSwiggyStatus] = useState<{ connected: boolean; user?: any } | null>(null);

  // Saved Meals
  const [savedMeals, setSavedMeals] = useState<any[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setAge(profile.age?.toString() || "24");
      setWeight(profile.weight?.toString() || "72");
      setHeight(profile.height?.toString() || "178");
      setGoal(profile.goal || "Stay Fit & Lean");
      setDietaryPrefs(profile.dietaryPreferences || []);
      setAllergies(profile.allergies || []);
      setWorkoutFrequency(profile.workoutFrequency || "Moderate (3-4 days/week)");
      setWaterIntake(profile.waterIntake || "2 - 3 Litres / day");
      setMealHabits(profile.mealHabits || "3 Balanced Meals");
    }
  }, [profile]);

  useEffect(() => {
    getSwiggyConnectionStatus().then((status) => {
      setSwiggyStatus(status);
    });
    loadSavedMeals();
  }, [profile]);

  // Load Saved Meals from GET /api/meals/saved
  const loadSavedMeals = async () => {
    if (!profile) return;
    setIsLoadingSaved(true);
    try {
      const res = await fetch("/api/meals/saved", {
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setSavedMeals(Array.isArray(data) ? data : []);
      } else {
        setSavedMeals([]);
      }
    } catch {
      setSavedMeals([]);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const handleDeleteSavedMeal = async (savedId: number | string) => {
    try {
      const res = await fetch(`/api/meals/saved/${savedId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setSavedMeals((prev) => prev.filter((m) => m.id !== savedId));
        toast({ title: "Removed from Saved Meals" });
      } else {
        toast({ title: "Could not remove meal", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error deleting saved meal", variant: "destructive" });
    }
  };

  const handleAddSavedToCart = (meal: any) => {
    addToCart({
      id: `saved-meal-${meal.id}`,
      name: meal.name,
      price: meal.price || 199,
      type: "meal",
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      healthScore: meal.healthScore,
      imageUrl: meal.imageUrl,
    });
    toast({
      title: "Added to Basket 🛒",
      description: `"${meal.name}" added to Food Basket.`,
    });
    setIsCartOpen(true);
  };

  // Toggle helpers for multi-select
  const toggleDietary = (item: string) => {
    setDietaryPrefs((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleAllergy = (item: string) => {
    setAllergies((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      await updateOnboarding({
        name,
        age: age ? Number(age) : undefined,
        weight: weight ? Number(weight) : undefined,
        height: height ? Number(height) : undefined,
        goals: goal ? [goal] : undefined,
        dietaryPreferences: dietaryPrefs,
        allergies,
        workoutFrequency,
        waterIntake,
        mealHabits,
      });

      toast({
        title: "Profile Updated ✨",
        description: "Your wellness parameters and food preferences have been saved.",
      });
      setActiveTab("overview");
    } catch (err: any) {
      const msg = err?.message || "Failed to update profile. Please try again.";
      setSaveError(msg);
      toast({
        title: "Save Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const initials = ((profile?.name || "U").trim().substring(0, 2)).toUpperCase();

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto p-4 md:p-8 space-y-6 pb-24 text-left">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            Wellness Profile & Settings
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage your personal metrics, dietary targets, and account settings.
          </p>
        </header>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-3xl" />
            <Skeleton className="h-72 w-full rounded-3xl" />
          </div>
        ) : profile ? (
          <>
            {/* Upper Profile Summary Header */}
            <Card className="overflow-hidden border border-border/70 shadow-xs bg-gradient-to-r from-emerald-600/10 via-primary/5 to-background rounded-3xl">
              <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
                <Avatar className="h-20 w-20 border-4 border-background shadow-md">
                  <AvatarImage src={profile.avatarUrl || ""} />
                  <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <h2 className="text-xl font-extrabold text-foreground truncate">
                      {profile.name || "NutriFlow Member"}
                    </h2>
                    <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-200/50 inline-flex items-center gap-1 self-center sm:self-auto">
                      ⚡ Swiggy Connected
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Wellness Goal:{" "}
                    <span className="text-foreground font-semibold">
                      {profile.goal || "Balanced Nutrition"}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2.5 shrink-0">
                  <div className="bg-background px-3.5 py-2 rounded-2xl text-center shadow-2xs border border-border/60">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-extrabold">
                      Active Streak
                    </p>
                    <p className="text-base font-black text-orange-500">
                      {profile.streak || 5} Days
                    </p>
                  </div>
                  <div className="bg-background px-3.5 py-2 rounded-2xl text-center shadow-2xs border border-border/60">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-extrabold">
                      Wellness Score
                    </p>
                    <p className="text-base font-black text-emerald-600">
                      {profile.wellnessScore || 84}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-2xl border border-border/60 text-xs font-semibold overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap text-center",
                  activeTab === "overview"
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap text-center",
                  activeTab === "edit"
                    ? "bg-background text-primary shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Edit Parameters
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("saved")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap text-center",
                  activeTab === "saved"
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Saved Dishes ({savedMeals.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap text-center",
                  activeTab === "settings"
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Account & Settings
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left: Biometrics */}
                <Card className="rounded-3xl border border-border/70 shadow-2xs md:col-span-1">
                  <CardHeader className="pb-3 border-b border-border/40">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Scale className="h-4 w-4 text-emerald-600" />
                      Body Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-2.5 text-center">
                      <div className="p-3 bg-muted/30 rounded-2xl border border-border/40">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                          Height
                        </span>
                        <span className="text-xl font-black text-foreground">
                          {profile.height || 178}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">cm</span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-2xl border border-border/40">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                          Weight
                        </span>
                        <span className="text-xl font-black text-foreground">
                          {profile.weight || 72}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">kg</span>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-border/40 pb-2">
                        <span className="text-muted-foreground">Height</span>
                        <span className="font-bold">{profile.height || 178} cm</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-2">
                        <span className="text-muted-foreground">Weight</span>
                        <span className="font-bold">{profile.weight || 72} kg</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span className="text-muted-foreground">Age</span>
                        <span className="font-bold">{profile.age || 24} years</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("edit")}
                      className="w-full rounded-xl text-xs font-semibold h-8"
                    >
                      Update Parameters
                    </Button>
                  </CardContent>
                </Card>

                {/* Right: Preferences & Routine */}
                <div className="md:col-span-2 space-y-6">
                  {/* Preferences Card */}
                  <Card className="rounded-3xl border border-border/70 shadow-2xs">
                    <CardHeader className="pb-3 border-b border-border/40">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Dietary Preferences & Allergies
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                          Dietary Preferences
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.dietaryPreferences && profile.dietaryPreferences.length > 0 ? (
                            profile.dietaryPreferences.map((d: string) => (
                              <span
                                key={d}
                                className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold text-xs"
                              >
                                {d}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground">No specific diet configured</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                          Allergies & Exclusions
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.allergies && profile.allergies.length > 0 ? (
                            profile.allergies.map((a: string) => (
                              <span
                                key={a}
                                className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 font-semibold text-xs"
                              >
                                {a}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground">None reported</span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/40 space-y-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Routine & Hydration
                        </span>
                        <p className="text-foreground font-medium">
                          {profile.workoutFrequency || "Moderate workout (3-4 days/week)"}
                          {profile.waterIntake ? ` • ${profile.waterIntake}` : ""}
                          {profile.mealHabits ? ` • ${profile.mealHabits}` : ""}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Action Banner */}
                  <Card className="rounded-3xl border border-primary/20 bg-primary/5 p-5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-foreground">Need to tune your profile?</h4>
                      <p className="text-xs text-muted-foreground">
                        Keep your preferences updated for accurate meal and grocery planning.
                      </p>
                    </div>
                    <Button
                      onClick={() => setActiveTab("edit")}
                      className="rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                    >
                      Edit Profile
                    </Button>
                  </Card>
                </div>
              </div>
            )}

            {/* TAB 2: EDIT PARAMETERS */}
            {activeTab === "edit" && (
              <Card className="rounded-3xl border border-border/70 shadow-2xs">
                <CardHeader className="border-b border-border/40 pb-4">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Heart className="h-5 w-5 text-primary" />
                    Edit Wellness & Food Parameters
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Updates are saved securely via NutriFlow's profile service.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    {/* 1. Personal Information */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        1. Personal Details
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-name" className="text-xs font-semibold">
                            Full Name
                          </Label>
                          <Input
                            id="edit-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="rounded-xl text-xs"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-age" className="text-xs font-semibold">
                            Age (years)
                          </Label>
                          <Input
                            id="edit-age"
                            type="number"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            className="rounded-xl text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-weight" className="text-xs font-semibold">
                            Weight (kg)
                          </Label>
                          <Input
                            id="edit-weight"
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            className="rounded-xl text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="edit-height" className="text-xs font-semibold">
                            Height (cm)
                          </Label>
                          <Input
                            id="edit-height"
                            type="number"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            className="rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2. Wellness Goal */}
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        2. Wellness Goal
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {GOAL_OPTIONS.map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGoal(g)}
                            className={cn(
                              "p-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer",
                              goal === g
                                ? "bg-primary/10 border-primary text-primary shadow-xs"
                                : "bg-card border-border/70 text-foreground hover:bg-muted"
                            )}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 3. Dietary Preferences */}
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        3. Dietary Preferences (Select all that apply)
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {DIETARY_OPTIONS.map((d) => {
                          const isSelected = dietaryPrefs.includes(d);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => toggleDietary(d)}
                              className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer",
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-card border-border/70 text-foreground hover:bg-muted"
                              )}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4. Allergies */}
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        4. Allergies & Exclusions
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {ALLERGY_OPTIONS.map((a) => {
                          const isSelected = allergies.includes(a);
                          return (
                            <button
                              key={a}
                              type="button"
                              onClick={() => toggleAllergy(a)}
                              className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer",
                                isSelected
                                  ? "bg-rose-600 text-white border-rose-600"
                                  : "bg-card border-border/70 text-foreground hover:bg-muted"
                              )}
                            >
                              {a}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 5. Routine */}
                    <div className="space-y-3 pt-2 border-t border-border/40">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        5. Lifestyle & Routine
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-muted-foreground">
                            Activity Level
                          </Label>
                          <select
                            value={workoutFrequency}
                            onChange={(e) => setWorkoutFrequency(e.target.value)}
                            className="w-full text-xs p-2 rounded-xl border border-border/70 bg-background"
                          >
                            {ACTIVITY_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-muted-foreground">
                            Daily Water Intake
                          </Label>
                          <select
                            value={waterIntake}
                            onChange={(e) => setWaterIntake(e.target.value)}
                            className="w-full text-xs p-2 rounded-xl border border-border/70 bg-background"
                          >
                            {HYDRATION_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-muted-foreground">
                            Meal Timing Habits
                          </Label>
                          <select
                            value={mealHabits}
                            onChange={(e) => setMealHabits(e.target.value)}
                            className="w-full text-xs p-2 rounded-xl border border-border/70 bg-background"
                          >
                            {MEAL_HABIT_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Error Banner with Retry */}
                    {saveError && (
                      <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center justify-between">
                        <span>{saveError}</span>
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          disabled={isSaving}
                          className="h-7 text-xs border-destructive/30"
                        >
                          Retry
                        </Button>
                      </div>
                    )}

                    {/* Save Action */}
                    <div className="pt-4 flex gap-3">
                      <Button
                        type="submit"
                        disabled={isSaving}
                        className="rounded-xl px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 h-10"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            <span>Save Profile Changes</span>
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setActiveTab("overview")}
                        className="rounded-xl text-xs h-10"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* TAB 3: SAVED MEALS */}
            {activeTab === "saved" && (
              <Card className="rounded-3xl border border-border/70 shadow-2xs">
                <CardHeader className="border-b border-border/40 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Heart className="h-4 w-4 text-rose-500 fill-rose-500/20" />
                        Saved Meals ({savedMeals.length})
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Dishes bookmarked during your food exploration.
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadSavedMeals}
                      className="rounded-xl h-8 px-2.5 text-xs text-muted-foreground gap-1"
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", isLoadingSaved && "animate-spin")} />
                      <span>Refresh</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  {isLoadingSaved ? (
                    <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                      <span>Loading saved meals...</span>
                    </div>
                  ) : savedMeals.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto text-muted-foreground">
                        <Utensils className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-foreground">No saved meals yet</h4>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                          Tap the heart icon on any meal in Food Discovery to save it here for quick reordering.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {savedMeals.map((meal) => (
                        <div
                          key={meal.id}
                          className="p-4 rounded-2xl border border-border/70 bg-card hover:border-border transition-all flex flex-col justify-between space-y-3 shadow-2xs"
                        >
                          <div className="flex gap-3 items-start">
                            {meal.imageUrl ? (
                              <img
                                src={meal.imageUrl}
                                alt={meal.name}
                                className="h-16 w-16 rounded-xl object-cover border border-border/40 shrink-0"
                              />
                            ) : (
                              <div className="h-16 w-16 rounded-xl bg-secondary/15 flex items-center justify-center text-muted-foreground shrink-0 border border-dashed border-border/60">
                                <Utensils className="h-6 w-6 text-muted-foreground/60" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-bold text-foreground truncate">
                                {meal.name}
                              </h5>
                              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                                ₹{meal.price || 199}
                              </span>
                              {(meal.calories !== undefined || meal.protein !== undefined) && (
                                <div className="flex items-center gap-2 pt-1 text-[10px] text-muted-foreground">
                                  {meal.calories !== undefined && (
                                    <span className="bg-muted px-1.5 py-0.5 rounded font-medium">
                                      {meal.calories} kcal
                                    </span>
                                  )}
                                  {meal.protein !== undefined && (
                                    <span className="bg-muted px-1.5 py-0.5 rounded font-medium">
                                      {meal.protein}g protein
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                            <Button
                              size="sm"
                              onClick={() => handleAddSavedToCart(meal)}
                              className="flex-1 h-8 rounded-xl text-xs font-semibold gap-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                              <ShoppingCart className="h-3.5 w-3.5" />
                              <span>Add to Basket</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteSavedMeal(meal.id)}
                              className="h-8 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-destructive"
                              aria-label="Remove saved meal"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* TAB 4: ACCOUNT & SETTINGS */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                {/* Connected Swiggy Account */}
                <Card className="rounded-3xl border border-border/70 shadow-2xs">
                  <CardHeader className="border-b border-border/40 pb-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                      Connected Swiggy Account
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Session status and Swiggy service linkage.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4 text-xs">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-border/40 pb-3">
                        <span className="text-muted-foreground font-medium">Link Status</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100/60 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200/60 inline-flex items-center gap-1.5 text-[10px]">
                          <Check className="h-3 w-3" />
                          <span>Active NutriFlow Session</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-b border-border/40 pb-3">
                        <span className="text-muted-foreground font-medium">Integration Mode</span>
                        <span className="text-orange-700 bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300 px-3 py-1 rounded-full font-bold text-[10px] border border-orange-200/60">
                          ⚡ Swiggy Production MCP
                        </span>
                      </div>

                      <div className="flex items-center justify-between pb-1">
                        <span className="text-muted-foreground font-medium">Account Name</span>
                        <span className="font-bold text-foreground">
                          {profile.name || "Swiggy Connected User"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sign Out Section */}
                <Card className="rounded-3xl border border-destructive/20 bg-destructive/5 p-5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-foreground">Sign Out of Session</h4>
                      <p className="text-xs text-muted-foreground">
                        Disconnect current session and clear local credentials.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => logout()}
                      className="rounded-xl text-xs font-semibold gap-1.5 h-9 shrink-0"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </>
        ) : (
          <div className="text-center p-12 rounded-2xl border border-dashed border-border/80">
            <p className="text-muted-foreground text-xs">
              Unable to load profile. Please verify your Swiggy connection.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
