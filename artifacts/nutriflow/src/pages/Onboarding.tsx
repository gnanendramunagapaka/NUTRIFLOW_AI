import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, 
  Dumbbell, 
  Apple, 
  Zap, 
  ShieldCheck, 
  Target, 
  Leaf, 
  Flame, 
  Scale, 
  Activity, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Coffee,
  Sparkles,
  Info,
  DollarSign,
  Loader2
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export default function Onboarding() {
  const { user, onboardingData, updateOnboarding, completeOnboarding } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();


  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isSyncing, setIsSyncing] = useState(false);

  // Body metrics form state (Step 5)
  const [age, setAge] = useState(onboardingData.age?.toString() || "");
  const [weight, setWeight] = useState(onboardingData.weight?.toString() || "");
  const [height, setHeight] = useState(onboardingData.height?.toString() || "");
  const [metricsError, setMetricsError] = useState("");

  // Sync state values when onboardingData changes (e.g. after initial load or step saves)
  useEffect(() => {
    if (onboardingData.age) setAge(onboardingData.age.toString());
    if (onboardingData.weight) setWeight(onboardingData.weight.toString());
    if (onboardingData.height) setHeight(onboardingData.height.toString());
  }, [onboardingData.age, onboardingData.weight, onboardingData.height]);

  // Dynamically determine the step to resume from — run only ONCE on mount
  useEffect(() => {
    if (!user) return;
    if (user.onboardingCompleted) {
      setLocation("/dashboard");
      return;
    }
    // Resume from the furthest incomplete step
    if (onboardingData.goals.length === 0) {
      setStep(1);
    } else if (onboardingData.dietaryPreferences.length === 0) {
      setStep(3);
    } else if (onboardingData.allergies.length === 0) {
      setStep(4);
    } else if (!onboardingData.workoutFrequency || !onboardingData.waterIntake || !onboardingData.mealHabits) {
      setStep(5);
    } else if (!onboardingData.budget) {
      setStep(6);
    } else {
      setStep(7);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only re-run when the user identity changes

  const totalSteps = 7;
  const progressPercent = ((step - 1) / (totalSteps - 1)) * 100;

  // Next / Back Handlers
  const handleNext = async () => {
    setIsSyncing(true);
    setMetricsError("");
    try {
      if (step === 2) {
        await updateOnboarding({ goals: onboardingData.goals });
      } else if (step === 3) {
        await updateOnboarding({ dietaryPreferences: onboardingData.dietaryPreferences });
      } else if (step === 4) {
        await updateOnboarding({ allergies: onboardingData.allergies });
      } else if (step === 5) {
        // Validate metrics in Step 5
        const ageNum = Number(age);
        const weightNum = Number(weight);
        const heightNum = Number(height);

        if (!onboardingData.workoutFrequency || !onboardingData.waterIntake || !onboardingData.mealHabits) {
          setMetricsError("Please select all lifestyle options.");
          setIsSyncing(false);
          return;
        }

        if (age && (isNaN(ageNum) || ageNum < 10 || ageNum > 100)) {
          setMetricsError("Please enter a valid age between 10 and 100.");
          setIsSyncing(false);
          return;
        }
        if (weight && (isNaN(weightNum) || weightNum < 30 || weightNum > 200)) {
          setMetricsError("Please enter a valid weight between 30kg and 200kg.");
          setIsSyncing(false);
          return;
        }
        if (height && (isNaN(heightNum) || heightNum < 100 || heightNum > 250)) {
          setMetricsError("Please enter a valid height between 100cm and 250cm.");
          setIsSyncing(false);
          return;
        }

        await updateOnboarding({
          age: age ? ageNum : undefined,
          weight: weight ? weightNum : undefined,
          height: height ? heightNum : undefined,
        });
      } else if (step === 6) {
        await updateOnboarding({ budget: onboardingData.budget });
      }

      if (step < totalSteps) {
        setDirection(1);
        setStep((prev) => (prev + 1) as Step);
      }
    } catch (err: any) {
      toast({
        title: "Sync Failed",
        description: err.message || "Could not save your preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setDirection(-1);
      setStep((prev) => (prev - 1) as Step);
    }
  };

  // Option Toggles — write to local state only (non-blocking, no async)
  const toggleGoal = (goal: string) => {
    const current = onboardingData.goals;
    const updated = current.includes(goal)
      ? current.filter((g) => g !== goal)
      : [...current, goal];
    updateOnboarding({ goals: updated }); // non-blocking local write
  };

  const toggleDiet = (diet: string) => {
    const current = onboardingData.dietaryPreferences;
    const updated = current.includes(diet)
      ? current.filter((d) => d !== diet)
      : [...current, diet];
    updateOnboarding({ dietaryPreferences: updated }); // non-blocking local write
  };

  const toggleAllergy = (allergy: string) => {
    const current = onboardingData.allergies;
    let updated: string[];

    if (allergy === "None") {
      updated = current.includes("None") ? [] : ["None"];
    } else {
      updated = current.filter((a) => a !== "None");
      updated = updated.includes(allergy)
        ? updated.filter((a) => a !== allergy)
        : [...updated, allergy];
    }
    updateOnboarding({ allergies: updated }); // non-blocking local write
  };

  // Save flow — always navigates to dashboard, even if DB write fails
  const handleFinish = async () => {
    setIsSyncing(true);
    try {
      await completeOnboarding();
      toast({
        title: "Wellness Profile Synced!",
        description: "Your personalized dashboard is ready.",
      });
    } catch (err: any) {
      // Non-critical — still navigate forward
      console.warn("[Onboarding] completeOnboarding error (non-critical):", err.message);
      toast({
        title: "Profile saved locally",
        description: "Continuing to your dashboard.",
      });
    } finally {
      setIsSyncing(false);
      setLocation("/dashboard");
    }
  };

  // Sliding Framer Motion Specs
  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.25, ease: "easeOut" as const },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
      opacity: 0,
      transition: { duration: 0.2, ease: "easeIn" as const },
    }),
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between py-6 bg-gradient-to-tr from-green-50/50 via-background to-emerald-50/30 overflow-hidden">
      {/* Visual background blur details */}
      <div className="absolute top-[-15%] right-[-10%] w-[55%] h-[55%] bg-primary/8 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[55%] h-[55%] bg-emerald-500/8 rounded-full blur-[90px] pointer-events-none" />

      {/* Top Header & Progress */}
      <header className="container max-w-xl mx-auto px-4 z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-primary font-bold text-lg">
            <Activity className="h-5.5 w-5.5 animate-pulse" />
            <span>NutriFlow AI</span>
          </div>
          {step > 1 && step < totalSteps && (
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Step {step - 1} of {totalSteps - 2}
            </span>
          )}
        </div>
        {step > 1 && step < totalSteps && (
          <Progress value={progressPercent} className="h-1.5 bg-muted border border-border/20 [&>div]:bg-primary rounded-full transition-all duration-300" />
        )}
      </header>

      {/* Main Form Body */}
      <main className="container max-w-xl mx-auto px-4 z-10 py-6 flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`step-${step}`}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full"
          >
            {/* STEP 1: WELCOME SCREEN */}
            {step === 1 && (
              <div className="space-y-6 text-center max-w-md mx-auto">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-2 shadow-inner">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                    Hey {user?.name || "there"}! 👋
                  </h1>
                  <p className="text-muted-foreground leading-relaxed">
                    Welcome to NutriFlow. Let's create your AI wellness profile to customize your nutrition, meals, and grocery lists.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3.5 text-left pt-2">
                  {[
                    { icon: Flame, title: "AI-Powered Nutrition", desc: "Get highly customized calorie and macronutrient budgets based on your lifestyle." },
                    { icon: Heart, title: "Swiggy & Apple Health Style", desc: "Track calories, water intake, and discover healthy local meal alternatives." },
                    { icon: ShieldCheck, title: "Precision Exclusions", desc: "Define allergies and dietary goals to filter out ingredients instantly." }
                  ].map((feat, i) => (
                    <div key={i} className="flex gap-3.5 p-4 rounded-xl border border-border/40 bg-card/65 backdrop-blur-sm shadow-2xs">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <feat.icon className="h-5.5 w-5.5" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-bold text-foreground">{feat.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button onClick={handleNext} className="w-full h-11.5 text-base font-semibold rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm hover-elevate transition-all duration-200 mt-2">
                  Build My Profile <ArrowRight className="h-4.5 w-4.5 ml-1" />
                </Button>
              </div>
            )}

            {/* STEP 2: GOALS SELECTION */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center space-y-1.5">
                  <h2 className="text-2xl font-bold tracking-tight">What are your primary goals?</h2>
                  <p className="text-muted-foreground text-sm">Select all that apply to tailor your AI meal planner.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  {[
                    { id: "Weight Loss", label: "Weight Loss", desc: "Burn fat & cut down calories", icon: Target },
                    { id: "Muscle Gain", label: "Muscle Gain", desc: "Build mass & load proteins", icon: Dumbbell },
                    { id: "Healthy Lifestyle", label: "Healthy Living", desc: "Maintain energy & wellness", icon: Heart },
                    { id: "Better Nutrition", label: "Better Nutrition", desc: "Optimize micronutrients", icon: Apple },
                    { id: "Diabetic-Friendly Eating", label: "Diabetic Care", desc: "Lower sugar & insulin loads", icon: ShieldCheck },
                    { id: "Fitness & Gym", label: "Fitness & Gym", desc: "Fuel workouts & activity", icon: Zap }
                  ].map((goal) => {
                    const isSelected = onboardingData.goals.includes(goal.id);
                    return (
                      <Card 
                        key={goal.id} 
                        className={`cursor-pointer border transition-all duration-200 rounded-xl overflow-hidden shadow-2xs hover:border-primary/50 hover:bg-primary/[0.01] ${isSelected ? "border-primary bg-primary/[0.03] ring-1 ring-primary" : "border-border/60"}`}
                        onClick={() => toggleGoal(goal.id)}
                      >
                        <CardContent className="p-4 flex flex-col gap-3.5 select-none h-full justify-between">
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            <goal.icon className="h-5 w-5" />
                          </div>
                          <div className="space-y-0.5 text-left">
                            <h3 className="text-sm font-bold text-foreground">{goal.label}</h3>
                            <p className="text-[11px] text-muted-foreground leading-normal">{goal.desc}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={handleBack} variant="outline" className="h-11 rounded-xl font-semibold border-border/60 flex-1">
                    <ArrowLeft className="h-4.5 w-4.5 mr-1" /> Back
                  </Button>
                  <Button onClick={handleNext} disabled={onboardingData.goals.length === 0} className="h-11 rounded-xl font-semibold bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm flex-1">
                    Next <ArrowRight className="h-4.5 w-4.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: DIETARY PREFERENCES */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center space-y-1.5">
                  <h2 className="text-2xl font-bold tracking-tight">Do you follow a specific diet?</h2>
                  <p className="text-muted-foreground text-sm">Select options to filter recipe and grocery matches.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  {[
                    { id: "Vegetarian", label: "Vegetarian", desc: "No meat, poultry, or fish", icon: Leaf },
                    { id: "Vegan", label: "Vegan", desc: "100% plant-based inputs", icon: Sparkles },
                    { id: "High Protein", label: "High Protein", desc: "Emphasis on protein loads", icon: Flame },
                    { id: "Low Carb", label: "Low Carb", desc: "Avoid sugar and starch", icon: Scale },
                    { id: "Keto", label: "Ketogenic", desc: "High fat, extremely low carb", icon: Zap },
                    { id: "Balanced Diet", label: "Balanced", desc: "Clean, standard macros", icon: Apple }
                  ].map((diet) => {
                    const isSelected = onboardingData.dietaryPreferences.includes(diet.id);
                    return (
                      <Card 
                        key={diet.id} 
                        className={`cursor-pointer border transition-all duration-200 rounded-xl overflow-hidden shadow-2xs hover:border-primary/50 hover:bg-primary/[0.01] ${isSelected ? "border-primary bg-primary/[0.03] ring-1 ring-primary" : "border-border/60"}`}
                        onClick={() => toggleDiet(diet.id)}
                      >
                        <CardContent className="p-4 flex flex-col gap-3.5 select-none h-full justify-between">
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            <diet.icon className="h-5 w-5" />
                          </div>
                          <div className="space-y-0.5 text-left">
                            <h3 className="text-sm font-bold text-foreground">{diet.label}</h3>
                            <p className="text-[11px] text-muted-foreground leading-normal">{diet.desc}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={handleBack} variant="outline" className="h-11 rounded-xl font-semibold border-border/60 flex-1">
                    <ArrowLeft className="h-4.5 w-4.5 mr-1" /> Back
                  </Button>
                  <Button onClick={handleNext} disabled={onboardingData.dietaryPreferences.length === 0} className="h-11 rounded-xl font-semibold bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm flex-1">
                    Next <ArrowRight className="h-4.5 w-4.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: ALLERGIES & EXCLUSIONS */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center space-y-1.5">
                  <h2 className="text-2xl font-bold tracking-tight">Any food allergies or exclusions?</h2>
                  <p className="text-muted-foreground text-sm">We'll flag ingredients that contain these items.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  {[
                    { id: "Dairy", label: "Dairy Free", desc: "No milk, cheese, or butter" },
                    { id: "Gluten", label: "Gluten Free", desc: "Exclude wheat, rye, or barley" },
                    { id: "Nuts", label: "Nut Free", desc: "No tree nuts or peanuts" },
                    { id: "None", label: "No Exclusions", desc: "No food allergies" }
                  ].map((allergy) => {
                    const isSelected = onboardingData.allergies.includes(allergy.id);
                    return (
                      <Card 
                        key={allergy.id} 
                        className={`cursor-pointer border transition-all duration-200 rounded-xl overflow-hidden shadow-2xs hover:border-primary/50 hover:bg-primary/[0.01] ${isSelected ? "border-primary bg-primary/[0.03] ring-1 ring-primary" : "border-border/60"}`}
                        onClick={() => toggleAllergy(allergy.id)}
                      >
                        <CardContent className="p-4 flex flex-col gap-3 select-none h-full justify-between text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-foreground">{allergy.label}</span>
                            {isSelected && (
                              <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                <Check className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-normal mt-1">{allergy.desc}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={handleBack} variant="outline" className="h-11 rounded-xl font-semibold border-border/60 flex-1">
                    <ArrowLeft className="h-4.5 w-4.5 mr-1" /> Back
                  </Button>
                  <Button onClick={handleNext} disabled={onboardingData.allergies.length === 0} className="h-11 rounded-xl font-semibold bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm flex-1">
                    Next <ArrowRight className="h-4.5 w-4.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 5: DAILY LIFESTYLE & BODY METRICS */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="text-center space-y-1.5">
                  <h2 className="text-2xl font-bold tracking-tight">Lifestyle & Body Metrics</h2>
                  <p className="text-muted-foreground text-sm">Help us build your metabolic index and calorie goals.</p>
                </div>

                <div className="space-y-4 pt-1.5">
                  {/* Workout Frequency */}
                  <div className="space-y-2 text-left">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workout Frequency</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "sedentary", label: "Rarely / Sedentary" },
                        { id: "light", label: "1-2 times a week" },
                        { id: "active", label: "3-4 times a week" },
                        { id: "pro", label: "5+ times a week" }
                      ].map((work) => {
                        const isSelected = onboardingData.workoutFrequency === work.id;
                        return (
                          <Button
                            key={work.id}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            className={`h-10 rounded-lg justify-start font-medium text-xs border-muted-foreground/20 ${isSelected ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted/50"}`}
                            onClick={() => updateOnboarding({ workoutFrequency: work.id })}
                          >
                            {work.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Water Intake */}
                  <div className="space-y-2 text-left">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Water Intake</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: "under1.5L", label: "<1.5L" },
                        { id: "1.5-2.5L", label: "1.5-2.5L" },
                        { id: "2.5-3.5L", label: "2.5-3.5L" },
                        { id: "3.5L+", label: "3.5L+" }
                      ].map((wat) => {
                        const isSelected = onboardingData.waterIntake === wat.id;
                        return (
                          <Button
                            key={wat.id}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            className={`h-10 rounded-lg font-medium text-xs border-muted-foreground/20 ${isSelected ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted/50"}`}
                            onClick={() => updateOnboarding({ waterIntake: wat.id })}
                          >
                            {wat.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Meal Habits */}
                  <div className="space-y-2 text-left">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daily Meal Frequency</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: "2meals", label: "2 Meals" },
                        { id: "3meals", label: "3 Meals" },
                        { id: "4meals", label: "4+ Meals" },
                        { id: "irregular", label: "Snacking" }
                      ].map((habit) => {
                        const isSelected = onboardingData.mealHabits === habit.id;
                        return (
                          <Button
                            key={habit.id}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            className={`h-10 rounded-lg font-medium text-xs border-muted-foreground/20 ${isSelected ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted/50"}`}
                            onClick={() => updateOnboarding({ mealHabits: habit.id })}
                          >
                            {habit.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Body Metrics inputs */}
                  <div className="grid grid-cols-3 gap-3.5 pt-2">
                    <div className="space-y-1.5 text-left">
                      <Label htmlFor="onboard-age" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Age</Label>
                      <Input
                        id="onboard-age"
                        type="number"
                        placeholder="24"
                        value={age}
                        className="h-10.5 rounded-lg border-muted-foreground/25 focus-visible:ring-primary text-center font-bold"
                        onChange={(e) => setAge(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <Label htmlFor="onboard-weight" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weight (kg)</Label>
                      <Input
                        id="onboard-weight"
                        type="number"
                        placeholder="70"
                        value={weight}
                        className="h-10.5 rounded-lg border-muted-foreground/25 focus-visible:ring-primary text-center font-bold"
                        onChange={(e) => setWeight(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <Label htmlFor="onboard-height" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Height (cm)</Label>
                      <Input
                        id="onboard-height"
                        type="number"
                        placeholder="175"
                        value={height}
                        className="h-10.5 rounded-lg border-muted-foreground/25 focus-visible:ring-primary text-center font-bold"
                        onChange={(e) => setHeight(e.target.value)}
                      />
                    </div>
                  </div>

                  {metricsError && (
                    <p className="text-xs text-destructive text-center font-semibold animate-shake">{metricsError}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={handleBack} variant="outline" className="h-11 rounded-xl font-semibold border-border/60 flex-1">
                    <ArrowLeft className="h-4.5 w-4.5 mr-1" /> Back
                  </Button>
                  <Button onClick={handleNext} className="h-11 rounded-xl font-semibold bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm flex-1">
                    Next <ArrowRight className="h-4.5 w-4.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 6: BUDGET PREFERENCES */}
            {step === 6 && (
              <div className="space-y-6">
                <div className="text-center space-y-1.5">
                  <h2 className="text-2xl font-bold tracking-tight">What is your meal budget?</h2>
                  <p className="text-muted-foreground text-sm">We'll prioritize local dishes matching your budget.</p>
                </div>

                <div className="space-y-3 pt-2">
                  {[
                    { id: "Budget Friendly", label: "Budget Friendly", desc: "Wallet-conscious everyday healthy options", icon: DollarSign, scale: "1" },
                    { id: "Moderate", label: "Moderate Budget", desc: "Standard, organic choices and mid-range healthy eating", icon: DollarSign, scale: "2" },
                    { id: "Premium Healthy Meals", label: "Premium Healthy", desc: "Top-tier premium wellness foods, supplements & items", icon: Sparkles, scale: "3" }
                  ].map((budget) => {
                    const isSelected = onboardingData.budget === budget.id;
                    return (
                      <Card 
                        key={budget.id} 
                        className={`cursor-pointer border transition-all duration-200 rounded-xl overflow-hidden shadow-2xs hover:border-primary/50 hover:bg-primary/[0.01] ${isSelected ? "border-primary bg-primary/[0.03] ring-1 ring-primary" : "border-border/60"}`}
                        onClick={() => updateOnboarding({ budget: budget.id })}
                      >
                        <CardContent className="p-4 flex items-center justify-between select-none">
                          <div className="flex items-center gap-4 text-left">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                              {budget.icon === DollarSign ? (
                                <span className="flex text-sm font-extrabold leading-none">
                                  {Array.from({ length: Number(budget.scale) }).map((_, i) => (
                                    <DollarSign key={i} className="h-4 w-4 -mx-[2px]" />
                                  ))}
                                </span>
                              ) : (
                                <Sparkles className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-foreground">{budget.label}</h3>
                              <p className="text-xs text-muted-foreground leading-normal mt-0.5">{budget.desc}</p>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                              <Check className="h-4 w-4" />
                            </span>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={handleBack} variant="outline" className="h-11 rounded-xl font-semibold border-border/60 flex-1">
                    <ArrowLeft className="h-4.5 w-4.5 mr-1" /> Back
                  </Button>
                  <Button onClick={handleNext} disabled={!onboardingData.budget} className="h-11 rounded-xl font-semibold bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm flex-1">
                    Next <ArrowRight className="h-4.5 w-4.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 7: COMPLETION */}
            {step === 7 && (
              <div className="space-y-6 text-center max-w-sm mx-auto">
                <div className="relative inline-flex mb-2">
                  {/* Subtle pulsing background */}
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping duration-1000 opacity-60" />
                  <div className="relative inline-flex items-center justify-center h-18 w-18 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                    <Check className="h-10 w-10 text-primary-foreground stroke-[3px]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">AI Wellness Profile Ready!</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Great job, {user?.name}! We've built your custom nutrition budget and integrated your food selections.
                  </p>
                </div>

                <Card className="border-none bg-primary/5 p-4 rounded-xl text-left shadow-2xs">
                  <CardContent className="p-0 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="text-xs">
                        <p className="font-bold text-foreground">AI Recommendations Exclusions</p>
                        <p className="text-muted-foreground mt-0.5 leading-normal">
                          {onboardingData.allergies.includes("None") 
                            ? "All ingredients active." 
                            : `Filtered ingredients: ${onboardingData.allergies.join(", ")}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Heart className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="text-xs">
                        <p className="font-bold text-foreground">Core Goals Active</p>
                        <p className="text-muted-foreground mt-0.5 leading-normal">
                          {onboardingData.goals.join(" • ")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button 
                  onClick={handleFinish} 
                  disabled={isSyncing}
                  className="w-full h-11.5 text-base font-semibold rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm hover-elevate transition-all duration-200 mt-2"
                >
                  {isSyncing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4.5 w-4.5 animate-spin" /> Preparing plan...
                    </span>
                  ) : (
                    "Go To Dashboard"
                  )}
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      <footer className="container max-w-xl mx-auto px-4 z-10 text-center">
        <p className="text-[10px] text-muted-foreground/70 inline-flex items-center gap-1">
          <Info className="h-3 w-3" /> All calculations adapt dynamically to Apple Health metrics.
        </p>
      </footer>
    </div>
  );
}
