import { useState, useEffect } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  Utensils,
  HeartHandshake,
  ShieldCheck,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function Login() {
  const { loginWithSwiggy } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check URL query parameters for return path or error redirects
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const returnTo = urlParams?.get("returnTo") || "/dashboard";
  const urlError = urlParams?.get("error");

  useEffect(() => {
    if (urlError) {
      setErrorMessage(
        urlError === "access_denied"
          ? "Swiggy authorization was cancelled. Please try again when ready."
          : "Swiggy connection could not be completed. Please try connecting again."
      );
    }
  }, [urlError]);

  const handleContinueWithSwiggy = async () => {
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      await loginWithSwiggy(returnTo);
    } catch (e: any) {
      console.error("[Login] Failed to start Swiggy OAuth:", e);
      setErrorMessage(
        "Could not initialize Swiggy authorization. Please verify your connection and try again."
      );
      toast({
        title: "Connection Failed",
        description: "Unable to start Swiggy connection. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md mx-auto">
        <Card className="border border-border/80 shadow-md bg-card rounded-3xl overflow-hidden">
          <CardHeader className="text-center pb-3 pt-7 px-6 sm:px-8 space-y-3">
            {/* Swiggy Logo Icon */}
            <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#FC8019] flex items-center justify-center shadow-md shadow-[#FC8019]/20 transition-transform hover:scale-105">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-wider select-none">
                S
              </span>
            </div>

            {/* Official Swiggy Partner Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold self-center">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Official Swiggy Builders Club Partner</span>
            </div>

            {/* Title & Description */}
            <div className="space-y-2 pt-1">
              <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Welcome to NutriFlow AI
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Connect your Swiggy account to access intelligent meal planning, nutritional guidance, and one-tap healthy ordering.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-6 sm:px-8 pb-7 pt-2 space-y-5">
            {/* Connection Error Banner (if error occurred) */}
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-3 p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs text-destructive animate-in fade-in"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-foreground">Connection Issue</p>
                  <p className="text-muted-foreground">{errorMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-muted-foreground hover:text-foreground text-xs p-1"
                  aria-label="Dismiss alert"
                >
                  ✕
                </button>
              </div>
            )}

            {/* 3 Core Value Highlight Rows */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/60 text-xs">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Utensils className="h-4 w-4 text-[#FC8019]" />
                </div>
                <span className="text-foreground/90 font-medium leading-snug">
                  Auto-sync delivery addresses & active restaurants
                </span>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/60 text-xs">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <HeartHandshake className="h-4 w-4 text-primary" />
                </div>
                <span className="text-foreground/90 font-medium leading-snug">
                  Personalized macro goals based on food habits
                </span>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 border border-border/60 text-xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-foreground/90 font-medium leading-snug">
                  100% passwordless login with Swiggy Phone OTP
                </span>
              </div>
            </div>

            {/* Primary Action Button: Continue with Swiggy */}
            <div className="pt-2 space-y-2">
              <Button
                type="button"
                onClick={handleContinueWithSwiggy}
                disabled={loading}
                aria-label="Continue with Swiggy"
                className="w-full h-12 sm:h-13 text-sm sm:text-base font-bold bg-[#FC8019] hover:bg-[#e26e10] text-white shadow-md shadow-[#FC8019]/25 hover:shadow-lg hover:shadow-[#FC8019]/30 transition-all rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FC8019]"
              >
                {loading ? (
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

              {loading && (
                <p className="text-center text-[11px] text-muted-foreground animate-pulse">
                  Redirecting to Swiggy secure authorization...
                </p>
              )}
            </div>

            {/* Disclaimer & Privacy Attribution */}
            <p className="text-center text-[11px] text-muted-foreground leading-normal px-2">
              By connecting, you authorize NutriFlow to interact with Swiggy food & delivery services via official MCP protocols. Tokens expire safely after 5 days.
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  );
}
