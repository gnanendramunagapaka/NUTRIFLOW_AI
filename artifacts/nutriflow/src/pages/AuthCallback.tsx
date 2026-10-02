import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthCallback() {
  const { refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    async function handleCallback() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const swiggyCode = urlParams.get("code");
        const swiggyState = urlParams.get("state");
        const swiggyError = urlParams.get("error");

        // Validate state against stored PKCE state
        const storedState = sessionStorage.getItem("swiggy_pkce_state");
        const isSwiggyCallback = swiggyState && storedState && swiggyState === storedState;

        if (!isSwiggyCallback) {
          console.warn("[AUTH CALLBACK] Unrecognized or invalid OAuth state parameter");
          setError("Invalid authentication state. Please try connecting Swiggy again.");
          return;
        }

        if (swiggyError) {
          console.warn("[AUTH CALLBACK] Swiggy returned OAuth error:", swiggyError);
          sessionStorage.removeItem("swiggy_pkce_state");
          sessionStorage.removeItem("swiggy_pkce_verifier");
          setError(
            swiggyError === "access_denied"
              ? "Swiggy authorization was cancelled."
              : `Swiggy authorization error: ${swiggyError}`
          );
          return;
        }

        if (!swiggyCode) {
          throw new Error("No authorization code received from Swiggy.");
        }

        const codeVerifier = sessionStorage.getItem("swiggy_pkce_verifier");
        if (!codeVerifier) {
          throw new Error("PKCE verification data not found. Please try connecting again.");
        }

        const redirectUri = window.location.origin + "/auth/callback";

        // Exchange authorization code for authenticated session via backend
        // Cookie (nutriflow_session) is set automatically by the server response
        const response = await fetch("/api/swiggy/oauth/callback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            code: swiggyCode,
            code_verifier: codeVerifier,
            redirect_uri: redirectUri,
          }),
        });

        const result = await response.json().catch(() => ({}));

        // Always clean up PKCE storage
        sessionStorage.removeItem("swiggy_pkce_state");
        sessionStorage.removeItem("swiggy_pkce_verifier");

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Swiggy token exchange failed");
        }

        if (!active) return;

        setSuccess(true);

        // Rehydrate NutriFlow user session state from the new session cookie
        await refreshUser();

        toast({
          title: "Swiggy Connected! ⚡",
          description: "Welcome to NutriFlow AI! Your Swiggy account is verified.",
        });

        const returnTo = sessionStorage.getItem("swiggy_auth_return_to");
        sessionStorage.removeItem("swiggy_auth_return_to");

        // Small delay to provide smooth visual feedback
        setTimeout(() => {
          if (!active) return;
          if (result.user?.onboardingCompleted === false) {
            setLocation("/onboarding");
          } else {
            setLocation(returnTo || "/dashboard");
          }
        }, 800);
      } catch (err: any) {
        console.error("[AUTH CALLBACK] Callback failure:", err);
        if (!active) return;

        setError(err.message || "Failed to complete Swiggy authorization. Please try again.");
      }
    }

    handleCallback();

    return () => {
      active = false;
    };
  }, [refreshUser, setLocation, toast]);

  return (
    <AuthLayout>
      <div className="w-full max-w-md mx-auto">
        <Card className="border border-border/80 shadow-md bg-card rounded-3xl overflow-hidden p-6 sm:p-8 text-center">
          <CardContent className="p-0 space-y-5">
            {error ? (
              <div className="space-y-4 py-2">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                  <AlertCircle className="h-7 w-7" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-foreground">Connection Issue</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {error}
                  </p>
                </div>
                <Button
                  onClick={() => setLocation("/login")}
                  className="rounded-xl px-5 h-11 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/95"
                >
                  Return to Connection Screen
                </Button>
              </div>
            ) : success ? (
              <div className="space-y-4 py-2">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-7 w-7 animate-in zoom-in" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-foreground">Swiggy Connected!</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Loading your personalized wellness experience...
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Loader2 className="h-7 w-7 animate-spin" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-foreground">Verifying Connection</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Connecting to Swiggy and securing your session...
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  );
}
