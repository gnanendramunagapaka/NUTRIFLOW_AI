import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthCallback() {
  const { refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function handleCallback() {
      try {
        console.log("[AUTH CALLBACK] Processing Swiggy OAuth callback parameters...");

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
          setTimeout(() => {
            if (active) setLocation("/login");
          }, 2000);
          return;
        }

        if (swiggyError) {
          console.warn("[AUTH CALLBACK] Swiggy returned OAuth error:", swiggyError);
          toast({
            title: "Swiggy Authorization Failed",
            description: `Swiggy returned: ${swiggyError}`,
            variant: "destructive",
          });
          sessionStorage.removeItem("swiggy_pkce_state");
          sessionStorage.removeItem("swiggy_pkce_verifier");
          setLocation("/login");
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
          credentials: "include", // Receive and persist HttpOnly session cookie
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

        // Rehydrate NutriFlow user session state from the new session cookie
        await refreshUser();

        toast({
          title: "Swiggy Connected! ⚡",
          description: "Welcome to NutriFlow AI! Your Swiggy account is verified.",
        });

        const returnTo = sessionStorage.getItem("swiggy_auth_return_to");
        sessionStorage.removeItem("swiggy_auth_return_to");
        setLocation(returnTo || "/dashboard");
      } catch (err: any) {
        console.error("[AUTH CALLBACK] Callback failure:", err);
        if (!active) return;

        setError(err.message || "Failed to complete Swiggy authorization");
        toast({
          title: "Swiggy Connection Issue",
          description: err.message || "Could not complete authorization. Please try again.",
          variant: "destructive",
        });

        setTimeout(() => {
          if (active) setLocation("/login");
        }, 2500);
      }
    }

    handleCallback();

    return () => {
      active = false;
    };
  }, [refreshUser, setLocation, toast]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary/10 to-background px-4">
      <div className="max-w-md w-full text-center space-y-6 bg-card/85 backdrop-blur-md border border-border/80 p-8 rounded-2xl shadow-xl animate-fade-in">
        {error ? (
          <div className="space-y-4">
            <div className="mx-auto bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center text-destructive mb-3 shadow-inner">
              <span className="text-2xl font-bold">!</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Authorization Error</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground/80">Redirecting you back to login...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center text-primary mb-3 shadow-inner">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Connecting with Swiggy</h2>
            <p className="text-sm text-muted-foreground">
              Verifying your Swiggy authorization and securing your NutriFlow session...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
