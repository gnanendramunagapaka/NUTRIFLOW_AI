import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  Utensils,
  ShoppingBag,
  Heart,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Compass,
} from "lucide-react";

export default function Landing() {
  const { user, onboarded, loginWithSwiggy } = useAuth();
  const { toast } = useToast();
  const [connecting, setConnecting] = useState(false);

  const handleSwiggyConnect = async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      await loginWithSwiggy("/dashboard");
    } catch (e: any) {
      console.error("[Landing] Failed to start Swiggy connection:", e);
      toast({
        title: "Connection Failed",
        description: "Could not initialize Swiggy connection. Please try again.",
        variant: "destructive",
      });
      setConnecting(false);
    }
  };

  return (
    <Layout>
      <div className="w-full flex flex-col items-center">
        {/* ─── Hero Section ────────────────────────────────────────── */}
        <section className="w-full max-w-4xl mx-auto px-4 pt-8 pb-12 sm:pt-16 sm:pb-16 text-center space-y-6">
          {/* Swiggy Partner Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold shadow-2xs animate-in fade-in">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Official Swiggy Builders Club Partner</span>
          </div>

          {/* Headline & Value Proposition */}
          <div className="space-y-3 sm:space-y-4">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              Personalized Nutrition, <br className="hidden sm:inline" />
              <span className="text-primary">Connected to Swiggy</span>
            </h1>
            <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              NutriFlow uses your preferences, health goals, and lifestyle to personalize your daily food, grocery, and dining choices across the Swiggy ecosystem.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3 max-w-md mx-auto w-full">
            {user ? (
              <Link href={onboarded ? "/dashboard" : "/onboarding"} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-12 sm:h-13 px-8 text-sm sm:text-base font-semibold rounded-2xl bg-primary text-primary-foreground hover:bg-primary/95 shadow-xs gap-2"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Button
                type="button"
                size="lg"
                onClick={handleSwiggyConnect}
                disabled={connecting}
                aria-label="Continue with Swiggy"
                className="w-full sm:w-auto h-12 sm:h-13 px-7 text-sm sm:text-base font-bold rounded-2xl bg-[#FC8019] hover:bg-[#e26e10] text-white shadow-md shadow-[#FC8019]/25 hover:shadow-lg hover:shadow-[#FC8019]/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-80"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Connecting to Swiggy...</span>
                  </>
                ) : (
                  <>
                    <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center text-[10px] font-black">
                      S
                    </div>
                    <span>Continue with Swiggy</span>
                  </>
                )}
              </Button>
            )}

            <Link href="/discover" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-12 sm:h-13 px-6 text-sm sm:text-base font-medium rounded-2xl border-border/80 hover:bg-muted/60 transition-colors gap-2"
              >
                <Compass className="h-4 w-4 text-muted-foreground" />
                <span>Explore Meals</span>
              </Button>
            </Link>
          </div>

          {/* Simple Trust Subtitle */}
          <p className="text-[11px] sm:text-xs text-muted-foreground pt-1">
            Passwordless Swiggy OTP • Secure MCP Token Storage • No credit card required
          </p>
        </section>

        {/* ─── 3 Core Pillars ────────────────────────────────────────── */}
        <section className="w-full max-w-5xl mx-auto px-4 py-8 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Pillar 1: AI Nutrition Guidance */}
            <Card className="rounded-2xl border border-border/80 bg-card shadow-xs transition-transform hover:-translate-y-0.5">
              <CardContent className="p-6 space-y-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Heart className="h-5 w-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  AI Nutrition Guidance
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Tailored calorie and macronutrient targets calibrated to your fitness goals, dietary restrictions, and daily habits.
                </p>
              </CardContent>
            </Card>

            {/* Pillar 2: Swiggy Food Integration */}
            <Card className="rounded-2xl border border-border/80 bg-card shadow-xs transition-transform hover:-translate-y-0.5">
              <CardContent className="p-6 space-y-3">
                <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#FC8019]">
                  <Utensils className="h-5 w-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  Clean Dining on Swiggy
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Discover certified healthy meals from nearby partner restaurants that fit your macros with one-tap ordering.
                </p>
              </CardContent>
            </Card>

            {/* Pillar 3: Instamart Grocery Planning */}
            <Card className="rounded-2xl border border-border/80 bg-card shadow-xs transition-transform hover:-translate-y-0.5">
              <CardContent className="p-6 space-y-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  Smart Instamart Baskets
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Curate whole-food groceries and nutritious pantry staples delivered directly to your doorstep through Swiggy Instamart.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ─── How Swiggy Connection Works ───────────────────────────── */}
        <section className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 border-t border-border/60">
          <div className="text-center space-y-2 mb-8 sm:mb-10">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              How Swiggy Connection Works
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              NutriFlow connects directly to your existing Swiggy account to eliminate passwords and sync your local dining options.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center space-y-2.5 p-4 rounded-2xl bg-muted/30 border border-border/40">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                1
              </div>
              <h4 className="text-sm font-semibold text-foreground">Authorize with Swiggy</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Log in via Swiggy using your registered phone number and OTP.
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-2.5 p-4 rounded-2xl bg-muted/30 border border-border/40">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                2
              </div>
              <h4 className="text-sm font-semibold text-foreground">Define Your Goals</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Set your wellness aspirations, dietary preferences, and daily routine.
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-2.5 p-4 rounded-2xl bg-muted/30 border border-border/40">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                3
              </div>
              <h4 className="text-sm font-semibold text-foreground">Experience NutriFlow</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Receive personalized guidance, order healthy food, and track your daily streak.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Footer Attribution ────────────────────────────────────── */}
        <footer className="w-full border-t border-border/60 py-8 px-4 text-center space-y-2 mt-8">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Official Swiggy Builders Club Partner • Powered by Swiggy MCP</span>
          </div>
          <p className="text-[11px] text-muted-foreground/70">
            &copy; {new Date().getFullYear()} NutriFlow AI. All rights reserved.
          </p>
        </footer>
      </div>
    </Layout>
  );
}
