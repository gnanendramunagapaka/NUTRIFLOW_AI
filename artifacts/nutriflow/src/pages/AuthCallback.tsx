import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabaseClient";
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
        console.log("[AUTH CALLBACK] Processing callback parameters...");

        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

        // ─── 1. Check for Swiggy OAuth PKCE callback (code + state in query params) ───
        const swiggyCode = urlParams.get("code");
        const swiggyState = urlParams.get("state");
        const swiggyError = urlParams.get("error");

        // Detect if this is a Swiggy callback by checking for state that matches our stored PKCE state
        const storedState = sessionStorage.getItem("swiggy_pkce_state");
        const isSwiggyCallback = swiggyState && storedState && swiggyState === storedState;

        if (isSwiggyCallback) {
          console.log("[AUTH CALLBACK] Detected Swiggy OAuth callback");

          if (swiggyError) {
            console.warn("[AUTH CALLBACK] Swiggy OAuth error:", swiggyError);
            toast({
              title: "Swiggy Authorization Failed",
              description: `Swiggy returned an error: ${swiggyError}`,
              variant: "destructive",
            });
            // Clean up PKCE storage
            sessionStorage.removeItem("swiggy_pkce_state");
            sessionStorage.removeItem("swiggy_pkce_verifier");
            setLocation("/profile");
            return;
          }

          if (swiggyCode) {
            const codeVerifier = sessionStorage.getItem("swiggy_pkce_verifier");
            if (!codeVerifier) {
              console.error("[AUTH CALLBACK] Missing PKCE code_verifier in sessionStorage");
              toast({
                title: "Authorization Error",
                description: "PKCE verification data not found. Please try connecting Swiggy again.",
                variant: "destructive",
              });
              setLocation("/profile");
              return;
            }

            try {
              // Retrieve user's Supabase session to link Swiggy token to their profile
              const { data: { session } } = await supabase.auth.getSession();
              const authHeaders: Record<string, string> = { "Content-Type": "application/json" };
              if (session?.access_token) {
                authHeaders["Authorization"] = `Bearer ${session.access_token}`;
              }

              const redirectUri = window.location.origin + "/auth/callback";

              // Exchange code + verifier via backend
              const response = await fetch("/api/swiggy/oauth/callback", {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify({
                  code: swiggyCode,
                  code_verifier: codeVerifier,
                  redirect_uri: redirectUri,
                }),
              });

              const result = await response.json();

              if (response.ok && !result.error && result.connected) {
                toast({
                  title: "Swiggy Connected! ⚡",
                  description: "Your Swiggy account has been linked successfully.",
                });
              } else {
                console.warn("[AUTH CALLBACK] Swiggy token exchange failed:", result);
                toast({
                  title: "Swiggy Connection Issue",
                  description: result.error || "Token exchange failed. Please try connecting again.",
                  variant: "destructive",
                });
              }
            } catch (err: any) {
              console.error("[AUTH CALLBACK] Swiggy token exchange error:", err);
              toast({
                title: "Connection Error",
                description: "Failed to complete Swiggy authorization. Please try again.",
                variant: "destructive",
              });
            } finally {
              // Always clean up PKCE storage
              sessionStorage.removeItem("swiggy_pkce_state");
              sessionStorage.removeItem("swiggy_pkce_verifier");
            }
          }

          // Redirect to return URL or profile
          const returnTo = sessionStorage.getItem("swiggy_auth_return_to");
          sessionStorage.removeItem("swiggy_auth_return_to");
          setLocation(returnTo || "/profile");
          return;
        }

        // ─── 2. Supabase Auth Callback (GoTrue session recovery) ───
        const recoveryPromise = (async () => {
          // GoTrue client automatically exchanges the code/hash for a session
          const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
          if (sessionErr) {
            console.warn("[AUTH CALLBACK] Error getting session initially:", sessionErr.message);
          }

          let activeSession = session;
          if (!activeSession) {
            // Wait a brief moment in case GoTrue is still processing
            await new Promise((resolve) => setTimeout(resolve, 1500));
            const { data: { session: retrySession }, error: retryErr } = await supabase.auth.getSession();
            if (retryErr) {
              console.warn("[AUTH CALLBACK] Error getting session on retry:", retryErr.message);
            }
            activeSession = retrySession;
          }

          if (!activeSession) {
            throw new Error("No active session found.");
          }

          console.log("[AUTH CALLBACK] Session resolved, refreshing user context...");

          // Refresh the auth state so AuthProvider gets the loaded user profile
          await refreshUser();

          // Query the user profile from Supabase to check onboarding status
          const { data: profile, error: profileErr } = await supabase
            .from("user_profiles")
            .select("onboarding_completed")
            .eq("id", activeSession.user.id)
            .maybeSingle();

          if (profileErr) {
            console.warn("[AUTH CALLBACK] Error querying profile (non-critical):", profileErr.message);
          }

          return { activeSession, profile };
        })();

        const timeoutPromise = new Promise<{ activeSession: any; profile: any }>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 8000)
        );

        const { profile, activeSession } = await Promise.race([recoveryPromise, timeoutPromise]);

        if (!active) return;

        console.log("[AUTH CALLBACK] Session restored successfully, redirecting...");
        toast({
          title: "Authentication Verified! 🎉",
          description: "Your session has been restored successfully.",
        });

        // Redirect based on onboarding state
        const onboarded = profile?.onboarding_completed ?? false;
        setLocation(onboarded ? "/dashboard" : "/onboarding");
      } catch (err: any) {
        console.error("[AUTH CALLBACK] Callback recovery failed:", err);
        if (!active) return;

        setError(err.message || "Authentication failed");
        toast({
          title: "Authentication Issue",
          description: "We couldn't verify your session. Redirecting to login...",
          variant: "destructive",
        });

        // Redirect back to login after a brief delay
        setTimeout(() => {
          if (active) setLocation("/login");
        }, 2000);
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
            <h2 className="text-2xl font-bold text-foreground">Verification Error</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground/80">Redirecting you to the sign in page...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center text-primary mb-3 shadow-inner">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Verifying Your Session</h2>
            <p className="text-sm text-muted-foreground">
              Please wait while we secure your account and restore your session...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
