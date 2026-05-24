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
        console.log("[AUTH CALLBACK] Exchanging token/hash params...");
        
        const recoveryPromise = (async () => {
          // 1. Get session. GoTrue client automatically exchanges the code/hash for a session.
          const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
          if (sessionErr) {
            console.warn("[AUTH CALLBACK] Error getting session initially:", sessionErr.message);
          }
          
          let activeSession = session;
          if (!activeSession) {
            // No session found. Let's wait a brief moment in case GoTrue is still processing
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
          
          // 2. Refresh the auth state so AuthProvider gets the loaded user profile
          await refreshUser();
          
          // 3. Query the user profile again from Supabase to check onboarding status
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

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 5000)
        );

        const { profile } = await Promise.race([recoveryPromise, timeoutPromise]);

        if (!active) return;

        console.log("[AUTH CALLBACK] Session restored successfully, redirecting...");
        toast({
          title: "Authentication Verified! 🎉",
          description: "Your session has been restored successfully.",
        });

        // 4. Redirect based on onboarding state
        const onboarded = profile?.onboarding_completed ?? false;
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
