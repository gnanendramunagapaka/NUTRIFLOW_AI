import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { MOCK_HISTORICAL_ORDERS } from "@/lib/mockData";
import { Scale, Heart, Sparkles, TrendingUp, Calendar, Check, Activity, Star } from "lucide-react";

export default function Profile() {
  const { user: profile, updateOnboarding, loading: isLoading } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: "",
      age: "",
      weight: "",
      height: "",
      goal: "",
    }
  });

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name || "",
        age: profile.age?.toString() || "24",
        weight: profile.weight?.toString() || "72",
        height: profile.height?.toString() || "178",
        goal: profile.goal || "Stay Fit & Lean",
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: any) => {
    setIsSaving(true);
    try {
      await updateOnboarding({
        name: data.name,
        age: data.age ? Number(data.age) : undefined,
        weight: data.weight ? Number(data.weight) : undefined,
        height: data.height ? Number(data.height) : undefined,
        goals: data.goal ? [data.goal] : undefined,
      });
      toast({ title: "Profile updated successfully!" });
    } catch (err: any) {
      toast({ title: "Failed to update profile", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const initials = ((profile?.name || "U").trim().substring(0, 2)).toUpperCase();

  // Dynamic BMI Calculation
  const w = profile?.weight || 72;
  const h = (profile?.height || 178) / 100;
  const bmi = Number((w / (h * h)).toFixed(1));

  let bmiCategory = "Normal Weight";
  let bmiColor = "text-emerald-600";
  if (bmi < 18.5) {
    bmiCategory = "Underweight";
    bmiColor = "text-amber-500";
  } else if (bmi >= 25 && bmi < 29.9) {
    bmiCategory = "Overweight";
    bmiColor = "text-amber-500";
  } else if (bmi >= 30) {
    bmiCategory = "Obese";
    bmiColor = "text-red-500";
  }

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-24">
        <header>
          <h1 className="text-3xl font-extrabold tracking-tight">Wellness Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your details, biometric stats, and wellness goals.</p>
        </header>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-2xl animate-pulse" />
            <Skeleton className="h-96 w-full rounded-2xl animate-pulse" />
          </div>
        ) : profile ? (
          <>
            {/* Upper profile summary */}
            <Card className="overflow-hidden border-none shadow-md bg-gradient-to-r from-emerald-600/10 via-primary/5 to-background rounded-3xl relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
              <CardContent className="p-8 flex flex-col sm:flex-row items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                  <AvatarImage src={profile.avatarUrl || ""} />
                  <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left space-y-2">
                  <h2 className="text-2xl font-extrabold text-foreground">{profile.name || "Healthy Builder"}</h2>
                  <p className="text-sm font-semibold text-muted-foreground">
                    Core Objective: <span className="text-emerald-700 dark:text-emerald-400 font-bold">{profile.goal || "Stay Healthy"}</span>
                  </p>
                </div>
                <div className="sm:ml-auto flex gap-3">
                  <div className="bg-background px-4 py-2.5 rounded-2xl text-center shadow-2xs border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-extrabold">Active Streak</p>
                    <p className="text-lg font-black text-orange-500">{profile.streak || 5} Days</p>
                  </div>
                  <div className="bg-background px-4 py-2.5 rounded-2xl text-center shadow-2xs border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-extrabold">Wellness Score</p>
                    <p className="text-lg font-black text-emerald-600">{profile.wellnessScore || 84}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Side: Biometrics and Analytics */}
              <div className="md:col-span-1 space-y-6">
                
                {/* Biometrics BMI Card */}
                <Card className="rounded-3xl border-border/60 shadow-2xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Scale className="h-4.5 w-4.5 text-emerald-600" />
                      Biometrics & BMI
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col items-center justify-center py-4 bg-muted/30 rounded-2xl">
                      <span className="text-3xl font-black text-foreground">{bmi}</span>
                      <span className={`text-xs font-bold ${bmiColor} mt-1`}>{bmiCategory}</span>
                    </div>
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between border-b border-border/40 pb-2">
                        <span className="text-muted-foreground font-medium">Height</span>
                        <span className="font-bold">{profile.height || 178} cm</span>
                      </div>
                      <div className="flex justify-between border-b border-border/40 pb-2">
                        <span className="text-muted-foreground font-medium">Weight</span>
                        <span className="font-bold">{profile.weight || 72} kg</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span className="text-muted-foreground font-medium">Age</span>
                        <span className="font-bold">{profile.age || 24} Yrs</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Insights Card */}
                <Card className="rounded-3xl border-border/60 bg-emerald-500/[0.02] shadow-2xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold flex items-center gap-1.5">
                      <Sparkles className="h-4.5 w-4.5 text-emerald-600" />
                      AI Health Diagnostics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-left">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 text-xs">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Excellent Recovery Index</p>
                          <p className="text-muted-foreground mt-0.5">Your metabolism recovers quickly based on active streaks.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-xs">
                        <Activity className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Optimized Calorie Caps</p>
                          <p className="text-muted-foreground mt-0.5">We adjusted your budget to support muscle gain and protein synthesis.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Side: Details Form & Order History */}
              <div className="md:col-span-2 space-y-6">
                
                {/* Personal Details Form */}
                <Card className="rounded-3xl border-border/60 shadow-2xs">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Heart className="h-5 w-5 text-emerald-600" />
                      Edit Wellness Parameters
                    </CardTitle>
                    <CardDescription className="text-xs">Adjust your body configuration so the AI copilot rebuilds your targets.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-left">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="profile-name" className="text-xs font-semibold">Full Name</Label>
                          <Input id="profile-name" className="rounded-xl" {...register("name")} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="profile-goal" className="text-xs font-semibold">Goal Description</Label>
                          <Input id="profile-goal" className="rounded-xl" {...register("goal")} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="profile-age" className="text-xs font-semibold">Age</Label>
                          <Input id="profile-age" type="number" className="rounded-xl" {...register("age")} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="profile-weight" className="text-xs font-semibold">Weight (kg)</Label>
                          <Input id="profile-weight" type="number" className="rounded-xl" {...register("weight")} />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor="profile-height" className="text-xs font-semibold">Height (cm)</Label>
                          <Input id="profile-height" type="number" className="rounded-xl" {...register("height")} />
                        </div>
                      </div>
                      <Button type="submit" disabled={isSaving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-6">
                        {isSaving ? "Syncing..." : "Update Wellness Targets"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Historic Orders */}
                <Card className="rounded-3xl border-border/60 shadow-2xs">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-emerald-600" />
                      Order History & Ratings
                    </CardTitle>
                    <CardDescription className="text-xs">Past meals and ingredients ordered via Swiggy integrations.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 divide-y divide-border/40 text-left">
                    {MOCK_HISTORICAL_ORDERS.map((order) => (
                      <div key={order.id} className="p-5 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-extrabold text-foreground">{order.id} • {order.date}</span>
                          <span className="text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[9px]">
                            {order.status}
                          </span>
                        </div>
                        
                        <div className="space-y-1 pt-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="font-semibold text-foreground/80">{item.name}</span>
                              <span className="text-muted-foreground text-xs">Qty: {item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center border-t border-muted/50 pt-2.5 text-xs">
                          <span className="font-black text-foreground">Total Paid: ₹{order.price}</span>
                          <div className="flex items-center gap-0.5 text-amber-500 font-bold bg-amber-500/5 px-2 py-0.5 rounded border border-amber-200/20">
                            {Array.from({ length: order.rating }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-current" />
                            ))}
                            <span className="ml-1 text-[10px]">{order.rating}.0</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center p-12 rounded-2xl border border-dashed border-border/80">
            <p className="text-muted-foreground">Unable to load profile. Please try refreshing.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
