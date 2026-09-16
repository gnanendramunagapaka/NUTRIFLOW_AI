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
  const [error] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function handleCallback() {
      try {
        console.log("[AUTH CALLBACK] Processing callback parameters...");

        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

        // 1. Check for incoming Swiggy OAuth authorization codes & state
        const swiggyError = urlParams.get("error") || hashParams.get("error");
        const swiggyCode = urlParams.get("code");
        const swiggyState = urlParams.get("state");

        if (swiggyError) {
          console.warn("[AUTH CALLBACK] Swiggy OAuth error reported:", swiggyError);
          toast({
            title: "Swiggy Authorization Notice",
            description: `Swiggy OAuth returned: ${swiggyError}`,
            variant: "destructive",
          });
        }

        if (swiggyCode && swiggyState) {
          console.log("[AUTH CALLBACK] Processing authorization code server-side...");
          // TASK-013: Ensure access tokens are NEVER stored in browser storage
          localStorage.removeItem("swiggy_access_token");

          try {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            const tokenRes = await fetch("/api/swiggy/mcp/token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(currentSession?.access_token ? { Authorization: `Bearer ${currentSession.access_token}` } : {}),
              },
              body: JSON.stringify({ code: swiggyCode, state: swiggyState }),
            });

            if (tokenRes.ok) {
              toast({
                title: "Swiggy Connected! ⚡",
                description: "Your Swiggy account has been linked successfully.",
              });
            } else {
              const errPayload = await tokenRes.json().catch(() => null);
              toast({
                title: "Swiggy Connection Notice",
                description: errPayload?.error || "Token exchange returned error.",
                variant: "destructive",
              });
            }
          } catch (ex) {
            console.error("[AUTH CALLBACK] Swiggy server exchange exception:", ex);
          }
        }

        const recoveryPromise = (async () => {
          // 2. Get Supabase session. GoTrue client automatically exchanges the code/hash for a session.
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
            // If Swiggy OAuth was processed without an active Supabase session, proceed gracefully
            if (swiggyCode) {
              return { activeSession: null, profile: null };
            }
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
          setTimeout(() => reject(new Error("Timeout")), 5000)
        );

        const { profile, activeSession } = await Promise.race([recoveryPromise, timeoutPromise]);

        if (!active) return;

        console.log("[AUTH CALLBACK] Session restored successfully, redirecting...");
        toast({
          title: "Authentication Verified! 🎉",
          description: "Your session has been restored successfully.",
        });

        // 3. Redirect based on return-to or onboarding state
        const returnTo = localStorage.getItem("swiggy_auth_return_to");
        if (returnTo) {
          localStorage.removeItem("swiggy_auth_return_to");
          setLocation(returnTo);
          return;
        }

        const onboarded = profile?.onboarding_completed ?? (activeSession ? false : true);
        setLocation(onboarded ? "/dashboard" : "/onboarding");
      } catch (err: any) {
        console.error("[AUTH CALLBACK] Callback recovery failed:", err);
        if (!active) return;

        toast({
          title: "Callback Restore Delayed",
          description: "We are redirecting you to check your verification state manually.",
          variant: "destructive",
        });

        // Redirect back to verify email with recovery flag
        setLocation("/verify-email?recovery=true");
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
