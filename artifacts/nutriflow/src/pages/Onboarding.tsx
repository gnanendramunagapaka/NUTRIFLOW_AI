import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Heart,
  Dumbbell,
  Apple,
  Zap,
  ShieldCheck,
  Target,
  Leaf,
  Scale,
  Activity,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
  Utensils,
  Droplets,
  Clock,
  User as UserIcon,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;
const TOTAL_STEPS = 7;

export default function Onboarding() {
  const { user, onboardingData, updateOnboarding, completeOnboarding } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Step 1: Body Metrics State
  const [name, setName] = useState(user?.name || onboardingData.name || "");
  const [age, setAge] = useState(onboardingData.age?.toString() || "");
  const [weight, setWeight] = useState(onboardingData.weight?.toString() || "");
  const [height, setHeight] = useState(onboardingData.height?.toString() || "");
  const [metricsError, setMetricsError] = useState("");

  // Step 2: Goal State
  const [selectedGoal, setSelectedGoal] = useState<string>(
    user?.goal || onboardingData.goals[0] || "Healthy Eating"
  );

  // Step 3: Dietary Preference State
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>(
    onboardingData.dietaryPreferences.filter(
      (d) =>
        ["Vegetarian", "Non-Vegetarian", "Eggetarian", "Vegan", "No Specific Preference"].includes(d)
    )
  );

  // Step 4: Allergies State
  const [allergies, setAllergies] = useState<string[]>(
    onboardingData.allergies.length > 0 ? onboardingData.allergies : ["None"]
  );

  // Step 5: Activity & Lifestyle State
  const [workoutFrequency, setWorkoutFrequency] = useState(
    onboardingData.workoutFrequency || "Moderately Active"
  );
  const [waterIntake, setWaterIntake] = useState(
    onboardingData.waterIntake || "2.5 – 3.5 Liters"
  );
  const [mealHabits, setMealHabits] = useState(
    onboardingData.mealHabits || "3 Meals"
  );

  // Step 6: Food / Cuisine Preferences State
  const [cuisinePrefs, setCuisinePrefs] = useState<string[]>(
    onboardingData.dietaryPreferences.filter(
      (d) =>
        [
          "South Indian",
          "North Indian",
          "Pan-Asian",
          "Continental",
          "High-Protein Bowls",
          "Home-Style Comfort",
        ].includes(d)
    )
  );

  // Sync initial user name when loaded
  useEffect(() => {
    if (user?.name && !name) {
      setName(user.name);
    }
    if (user?.onboardingCompleted) {
      setLocation("/dashboard");
    }
  }, [user, name, setLocation]);

  // Validation per step
  const validateStep1 = () => {
    setMetricsError("");
    if (!name.trim()) {
      setMetricsError("Please enter your name.");
      return false;
    }
    const ageNum = Number(age);
    if (age && (isNaN(ageNum) || ageNum < 12 || ageNum > 110)) {
      setMetricsError("Please enter an age between 12 and 110.");
      return false;
    }
    const weightNum = Number(weight);
    if (weight && (isNaN(weightNum) || weightNum < 30 || weightNum > 250)) {
      setMetricsError("Please enter a valid weight between 30 kg and 250 kg.");
      return false;
    }
    const heightNum = Number(height);
    if (height && (isNaN(heightNum) || heightNum < 100 || heightNum > 240)) {
      setMetricsError("Please enter a valid height between 100 cm and 240 cm.");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setSaveError(null);

    if (step === 1) {
      if (!validateStep1()) return;
      updateOnboarding({
        name: name.trim(),
        age: age ? Number(age) : undefined,
        weight: weight ? Number(weight) : undefined,
        height: height ? Number(height) : undefined,
      }).catch((e) => console.warn("Background sync step 1:", e));
    } else if (step === 2) {
      updateOnboarding({ goals: [selectedGoal] }).catch((e) =>
        console.warn("Background sync step 2:", e)
      );
    } else if (step === 3) {
      const combinedDiet = Array.from(new Set([...dietaryPrefs, ...cuisinePrefs]));
      updateOnboarding({ dietaryPreferences: combinedDiet }).catch((e) =>
        console.warn("Background sync step 3:", e)
      );
    } else if (step === 4) {
      updateOnboarding({ allergies }).catch((e) =>
        console.warn("Background sync step 4:", e)
      );
    } else if (step === 5) {
      updateOnboarding({
        workoutFrequency,
        waterIntake,
        mealHabits,
      }).catch((e) => console.warn("Background sync step 5:", e));
    } else if (step === 6) {
      const combinedDiet = Array.from(new Set([...dietaryPrefs, ...cuisinePrefs]));
      updateOnboarding({ dietaryPreferences: combinedDiet }).catch((e) =>
        console.warn("Background sync step 6:", e)
      );
    }

    if (step < TOTAL_STEPS) {
      setStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    setSaveError(null);
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  // Toggle helpers
  const toggleDietaryPref = (diet: string) => {
    if (diet === "No Specific Preference") {
      setDietaryPrefs(["No Specific Preference"]);
      return;
    }
    const filtered = dietaryPrefs.filter((d) => d !== "No Specific Preference");
    if (filtered.includes(diet)) {
      setDietaryPrefs(filtered.filter((d) => d !== diet));
    } else {
      setDietaryPrefs([...filtered, diet]);
    }
  };

  const toggleAllergy = (allergy: string) => {
    if (allergy === "None") {
      setAllergies(["None"]);
      return;
    }
    const filtered = allergies.filter((a) => a !== "None");
    if (filtered.includes(allergy)) {
      const next = filtered.filter((a) => a !== allergy);
      setAllergies(next.length === 0 ? ["None"] : next);
    } else {
      setAllergies([...filtered, allergy]);
    }
  };

  const toggleCuisine = (cuisine: string) => {
    if (cuisinePrefs.includes(cuisine)) {
      setCuisinePrefs(cuisinePrefs.filter((c) => c !== cuisine));
    } else {
      setCuisinePrefs([...cuisinePrefs, cuisine]);
    }
  };

  // Atomic finish: saves all fields and only marks completed on confirmed server success
  const handleCompleteSetup = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const combinedDiet = Array.from(new Set([...dietaryPrefs, ...cuisinePrefs]));

      // 1. Sync full profile data to backend
      await updateOnboarding({
        name: name.trim(),
        age: age ? Number(age) : undefined,
        weight: weight ? Number(weight) : undefined,
        height: height ? Number(height) : undefined,
        goals: [selectedGoal],
        dietaryPreferences: combinedDiet,
        allergies,
        workoutFrequency,
        waterIntake,
        mealHabits,
      });

      // 2. Mark onboardingCompleted in database
      await completeOnboarding();

      toast({
        title: "Wellness Profile Created! 🌿",
        description: "Welcome to NutriFlow AI. Your personalized experience is ready.",
      });

      // 3. Navigate to dashboard only upon verified success
      setLocation("/dashboard");
    } catch (err: any) {
      console.error("[Onboarding] Failed to save profile setup:", err);
      setSaveError(
        err?.message ||
          "Unable to save your wellness profile at this time. Your selections have been preserved. Please try again."
      );
      toast({
        title: "Save Failed",
        description: "Could not finalize profile setup. Please retry.",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  };

  const progressPercent = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between bg-background text-foreground px-4 py-6 sm:py-10">
      {/* Top Header & Clean Progress Indicator */}
      <header className="w-full max-w-xl mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold text-base sm:text-lg">
            <Activity className="h-5 w-5" />
            <span className="tracking-tight font-extrabold">NutriFlow AI</span>
          </div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Step {step} of {TOTAL_STEPS}
          </span>
        </div>
        <Progress value={progressPercent} className="h-1.5 rounded-full bg-muted" />
      </header>

      {/* Main Guided Card Container */}
      <main className="w-full max-w-xl mx-auto my-auto py-6">
        <Card className="border border-border/80 shadow-md bg-card rounded-3xl overflow-hidden p-6 sm:p-8">
          <CardContent className="p-0 space-y-6">
            {/* ─── STEP 1: Personal Basics ─── */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-1">
                    <UserIcon className="h-3.5 w-3.5" />
                    <span>Basic Profile</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    Welcome to NutriFlow AI
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Let's establish your baseline information to personalize daily nutrition, calorie targets, and hydration recommendations.
                  </p>
                </div>

                <div className="space-y-4 pt-1">
                  <div className="space-y-1.5 text-left">
                    <Label htmlFor="onboard-name" className="text-xs font-semibold">
                      Full Name
                    </Label>
                    <Input
                      id="onboard-name"
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="rounded-xl h-11"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5 text-left">
                      <Label htmlFor="onboard-age" className="text-xs font-semibold">
                        Age
                      </Label>
                      <Input
                        id="onboard-age"
                        type="number"
                        placeholder="e.g. 26"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="rounded-xl h-11"
                      />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <Label htmlFor="onboard-weight" className="text-xs font-semibold">
                        Weight (kg)
                      </Label>
                      <Input
                        id="onboard-weight"
                        type="number"
                        placeholder="e.g. 68"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="rounded-xl h-11"
                      />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <Label htmlFor="onboard-height" className="text-xs font-semibold">
                        Height (cm)
                      </Label>
                      <Input
                        id="onboard-height"
                        type="number"
                        placeholder="e.g. 174"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="rounded-xl h-11"
                      />
                    </div>
                  </div>

                  {metricsError && (
                    <p className="text-xs text-destructive font-medium text-left">
                      {metricsError}
                    </p>
                  )}

                  <p className="text-[11px] text-muted-foreground leading-normal">
                    NutriFlow respects your privacy. These metrics are strictly used for your daily metabolic calculation.
                  </p>
                </div>
              </div>
            )}

            {/* ─── STEP 2: Wellness Goal ─── */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-1">
                    <Target className="h-3.5 w-3.5" />
                    <span>Your Health Focus</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    What is your primary wellness goal?
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Select your main objective. You can adjust this anytime in your profile.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {[
                    {
                      id: "Healthy Eating",
                      label: "Healthy Eating",
                      desc: "Focus on balanced, nutrient-dense daily meals",
                      icon: Heart,
                    },
                    {
                      id: "Weight Management",
                      label: "Weight Management",
                      desc: "Calorie-conscious portions and sustainable deficit",
                      icon: Scale,
                    },
                    {
                      id: "Muscle & Strength",
                      label: "Muscle & Strength",
                      desc: "High-protein fueling for strength and recovery",
                      icon: Dumbbell,
                    },
                    {
                      id: "Better Daily Energy",
                      label: "Better Daily Energy",
                      desc: "Consistent energy levels to eliminate afternoon fatigue",
                      icon: Zap,
                    },
                    {
                      id: "Improve Everyday Nutrition",
                      label: "Everyday Nutrition",
                      desc: "More whole foods, dietary fiber, and hydration",
                      icon: Apple,
                    },
                    {
                      id: "Maintain Current Lifestyle",
                      label: "Maintain Balance",
                      desc: "Smart, guilt-free choices within your active routine",
                      icon: Target,
                    },
                  ].map((goal) => {
                    const isSelected = selectedGoal === goal.id;
                    return (
                      <div
                        key={goal.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedGoal(goal.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedGoal(goal.id);
                          }
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between text-left space-y-3 min-h-[96px] ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                            : "border-border/80 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <goal.icon className="h-4.5 w-4.5" />
                          </div>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground leading-tight">
                            {goal.label}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                            {goal.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── STEP 3: Dietary Preferences ─── */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-1">
                    <Leaf className="h-3.5 w-3.5" />
                    <span>Dietary Preference</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    Do you follow a specific diet?
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Select your eating pattern to filter recipe and restaurant recommendations.
                  </p>
                </div>

                <div className="space-y-2.5 pt-1">
                  {[
                    {
                      id: "Vegetarian",
                      label: "Vegetarian",
                      desc: "Plant foods with dairy, no meat, poultry, or fish",
                    },
                    {
                      id: "Non-Vegetarian",
                      label: "Non-Vegetarian",
                      desc: "Includes chicken, meat, fish, and seafood",
                    },
                    {
                      id: "Eggetarian",
                      label: "Eggetarian",
                      desc: "Vegetarian diet plus whole eggs",
                    },
                    {
                      id: "Vegan",
                      label: "Vegan",
                      desc: "100% plant-based, no animal products or dairy",
                    },
                    {
                      id: "No Specific Preference",
                      label: "No Specific Preference",
                      desc: "Flexible, open to all wholesome options",
                    },
                  ].map((diet) => {
                    const isSelected = dietaryPrefs.includes(diet.id);
                    return (
                      <div
                        key={diet.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleDietaryPref(diet.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleDietaryPref(diet.id);
                          }
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-left ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                            : "border-border/80 hover:bg-muted/40"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-semibold text-foreground">
                            {diet.label}
                          </h4>
                          <p className="text-xs text-muted-foreground">{diet.desc}</p>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ml-3 ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border/80 bg-background"
                          }`}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── STEP 4: Allergies & Food Restrictions ─── */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Food Safety & Allergies</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    Any food allergies or exclusions?
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    NutriFlow will exclude dishes containing these items from your recommendations.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {[
                    { id: "Milk / Dairy", label: "Milk / Dairy", desc: "No milk, cheese, or butter" },
                    { id: "Gluten / Wheat", label: "Gluten / Wheat", desc: "No wheat, barley, or rye" },
                    { id: "Peanuts & Tree Nuts", label: "Peanuts & Nuts", desc: "Nut-free kitchen recipes" },
                    { id: "Eggs", label: "Eggs", desc: "No whole eggs or egg albumen" },
                    { id: "Soy", label: "Soy Products", desc: "No tofu, edamame, or soy sauce" },
                    { id: "Seafood & Shellfish", label: "Seafood & Shellfish", desc: "No fish, prawns, or shellfish" },
                    { id: "None", label: "None / No Restrictions", desc: "No known food allergies" },
                  ].map((allergy) => {
                    const isSelected = allergies.includes(allergy.id);
                    return (
                      <div
                        key={allergy.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleAllergy(allergy.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleAllergy(allergy.id);
                          }
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-left ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                            : "border-border/80 hover:bg-muted/40"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                            {allergy.label}
                          </h4>
                          <p className="text-[11px] text-muted-foreground">{allergy.desc}</p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-2 ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border/80 bg-background"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── STEP 5: Activity & Lifestyle ─── */}
            {step === 5 && (
              <div className="space-y-5">
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-1">
                    <Activity className="h-3.5 w-3.5" />
                    <span>Activity & Habits</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    What does your daily routine look like?
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Helps calibrate your hydration goals and daily meal schedule.
                  </p>
                </div>

                <div className="space-y-4 pt-1 text-left">
                  {/* Activity Level */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-primary" /> Daily Activity Level
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "Sedentary", label: "Sedentary", desc: "Mostly desk-based" },
                        { id: "Lightly Active", label: "Light Activity", desc: "Some walking daily" },
                        { id: "Moderately Active", label: "Moderate", desc: "Regular workouts" },
                        { id: "Very Active", label: "Very Active", desc: "High daily training" },
                      ].map((work) => {
                        const isSelected = workoutFrequency === work.id;
                        return (
                          <button
                            key={work.id}
                            type="button"
                            onClick={() => setWorkoutFrequency(work.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                                : "bg-muted/40 border-border/80 text-foreground hover:bg-muted"
                            }`}
                          >
                            <p className="text-xs font-bold leading-tight">{work.label}</p>
                            <p
                              className={`text-[10px] mt-0.5 ${
                                isSelected ? "text-primary-foreground/90" : "text-muted-foreground"
                              }`}
                            >
                              {work.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Water Intake */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Droplets className="h-3.5 w-3.5 text-sky-500" /> Typical Daily Hydration
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "< 1.5 Liters", label: "< 1.5 L" },
                        { id: "1.5 – 2.5 Liters", label: "1.5 – 2.5 L" },
                        { id: "2.5 – 3.5 Liters", label: "2.5 – 3.5 L" },
                        { id: "3.5+ Liters", label: "3.5 L+" },
                      ].map((wat) => {
                        const isSelected = waterIntake === wat.id;
                        return (
                          <button
                            key={wat.id}
                            type="button"
                            onClick={() => setWaterIntake(wat.id)}
                            className={`py-2 px-3 rounded-xl border text-center text-xs font-semibold transition-all ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                : "bg-muted/40 border-border/80 text-foreground hover:bg-muted"
                            }`}
                          >
                            {wat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Meal Habits */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-500" /> Daily Meal Schedule
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "2 Meals", label: "2 Meals" },
                        { id: "3 Meals", label: "3 Meals" },
                        { id: "4+ Meals", label: "4+ Meals" },
                        { id: "Flexible / Snacking", label: "Flexible" },
                      ].map((habit) => {
                        const isSelected = mealHabits === habit.id;
                        return (
                          <button
                            key={habit.id}
                            type="button"
                            onClick={() => setMealHabits(habit.id)}
                            className={`py-2 px-3 rounded-xl border text-center text-xs font-semibold transition-all ${
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                : "bg-muted/40 border-border/80 text-foreground hover:bg-muted"
                            }`}
                          >
                            {habit.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── STEP 6: Food & Cuisine Favorites ─── */}
            {step === 6 && (
              <div className="space-y-5">
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-1">
                    <Utensils className="h-3.5 w-3.5" />
                    <span>Food Preferences</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    What cuisines do you enjoy most?
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Select your favorites. NutriFlow will highlight healthy restaurant options and recipes in these styles.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {[
                    {
                      id: "South Indian",
                      label: "South Indian",
                      desc: "Dosas, idlis, sambar, light coconut curries",
                    },
                    {
                      id: "North Indian",
                      label: "North Indian",
                      desc: "Tandoori, roti, dal, aromatic wholesome curries",
                    },
                    {
                      id: "Pan-Asian",
                      label: "Pan-Asian",
                      desc: "Stir-fries, steamed dumplings, clean broths",
                    },
                    {
                      id: "Continental",
                      label: "Continental",
                      desc: "Salads, grills, sourdough, Mediterranean bowls",
                    },
                    {
                      id: "High-Protein Bowls",
                      label: "High-Protein Bowls",
                      desc: "Grain bowls, sprouts, roasted greens & proteins",
                    },
                    {
                      id: "Home-Style Comfort",
                      label: "Home-Style Comfort",
                      desc: "Simple low-oil everyday home-style cooking",
                    },
                  ].map((cuisine) => {
                    const isSelected = cuisinePrefs.includes(cuisine.id);
                    return (
                      <div
                        key={cuisine.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleCuisine(cuisine.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleCuisine(cuisine.id);
                          }
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-left ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                            : "border-border/80 hover:bg-muted/40"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <h4 className="text-xs sm:text-sm font-semibold text-foreground">
                            {cuisine.label}
                          </h4>
                          <p className="text-[11px] text-muted-foreground">{cuisine.desc}</p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-2 ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border/80 bg-background"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── STEP 7: Review & Finish ─── */}
            {step === 7 && (
              <div className="space-y-5">
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Review Profile</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    Your Wellness Profile Summary
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Review your baseline configuration. You can update these settings anytime.
                  </p>
                </div>

                {saveError && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs text-destructive text-left"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="font-semibold text-foreground">Save Error</p>
                      <p className="text-muted-foreground">{saveError}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-1 text-left text-xs sm:text-sm">
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
                    <div>
                      <span className="text-muted-foreground block text-xs">Full Name</span>
                      <span className="font-semibold text-foreground">{name || user?.name}</span>
                    </div>
                    {age && weight && height && (
                      <div className="text-right">
                        <span className="text-muted-foreground block text-xs">Biometrics</span>
                        <span className="font-medium text-foreground">
                          {age} yrs • {weight} kg • {height} cm
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block text-xs mb-1">Primary Goal</span>
                    <span className="font-bold text-foreground text-sm flex items-center gap-1.5 text-primary">
                      <Target className="h-4 w-4" /> {selectedGoal}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block text-xs mb-1">Dietary Preferences</span>
                    <div className="flex flex-wrap gap-1.5">
                      {dietaryPrefs.length > 0 ? (
                        dietaryPrefs.map((d) => (
                          <span
                            key={d}
                            className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold"
                          >
                            {d}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground">None specified</span>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block text-xs mb-1">Allergies & Restrictions</span>
                    <div className="flex flex-wrap gap-1.5">
                      {allergies.map((a) => (
                        <span
                          key={a}
                          className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-semibold"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60">
                    <span className="text-muted-foreground block text-xs mb-1">Lifestyle & Hydration</span>
                    <p className="text-foreground font-medium">
                      {workoutFrequency} • {waterIntake} water • {mealHabits} schedule
                    </p>
                  </div>

                  {cuisinePrefs.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60">
                      <span className="text-muted-foreground block text-xs mb-1">Favorite Cuisines</span>
                      <div className="flex flex-wrap gap-1.5">
                        {cuisinePrefs.map((c) => (
                          <span
                            key={c}
                            className="px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-700 dark:text-orange-400 text-xs font-semibold"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── Navigation Footer ─── */}
            <div className="flex items-center gap-3 pt-3 border-t border-border/60">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSaving}
                  className="rounded-2xl h-11 sm:h-12 px-5 font-semibold text-xs sm:text-sm border-border/80 flex-1 sm:flex-initial"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                </Button>
              )}

              {step < TOTAL_STEPS ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="rounded-2xl h-11 sm:h-12 px-6 font-semibold text-xs sm:text-sm bg-primary text-primary-foreground hover:bg-primary/95 flex-1 shadow-xs"
                >
                  Continue <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleCompleteSetup}
                  disabled={isSaving}
                  className="rounded-2xl h-11 sm:h-12 px-6 font-bold text-xs sm:text-sm bg-primary text-primary-foreground hover:bg-primary/95 flex-1 shadow-xs gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving Wellness Profile...</span>
                    </>
                  ) : saveError ? (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      <span>Retry Setup</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Setup & Launch NutriFlow</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer Attribution */}
      <footer className="w-full max-w-xl mx-auto text-center pt-2">
        <p className="text-[11px] text-muted-foreground/75">
          &copy; {new Date().getFullYear()} NutriFlow AI. Official Swiggy Builders Club Partner.
        </p>
      </footer>
    </div>
  );
}
