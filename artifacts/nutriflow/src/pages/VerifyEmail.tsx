import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Mail, Loader2, RefreshCw, LogOut, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

export default function VerifyEmail() {
  const { user, supabaseUser, logout, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [isChecking, setIsChecking] = useState(false);

  const [search] = useState(() => typeof window !== "undefined" ? window.location.search : "");
  const searchParams = new URLSearchParams(search);
  const email = searchParams.get("email") || supabaseUser?.email || "";
  const isRecovery = searchParams.get("recovery") === "true";

  // Auto redirect if user profile exists and is verified
  useEffect(() => {
    if (supabaseUser && supabaseUser.email_confirmed_at && user) {
      if (user.onboardingCompleted) {
        setLocation("/dashboard");
      } else {
        setLocation("/onboarding");
      }
    }
  }, [supabaseUser, user, setLocation]);

  // Auth state listener for instant verification redirect when session changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && session.user.email_confirmed_at) {
        toast({
          title: "Email Verified! 🎉",
          description: "Welcome to NutriFlow AI.",
        });
        await refreshUser();
      }
    });
    return () => subscription.unsubscribe();
  }, [refreshUser, toast]);

  // Automatic session recovery: poll Supabase every 3 seconds to check if the session is verified
  useEffect(() => {
    let interval: NodeJS.Timeout;

    async function checkVerification() {
      try {
        // Force refresh session to get latest confirmed state from Supabase servers
        const { data: { session }, error: refreshErr } = await supabase.auth.refreshSession();
        if (refreshErr) {
          console.warn("[VerifyEmail] refreshSession background error:", refreshErr.message);
          return;
        }

        const { data: { user: sbUser }, error: userErr } = await supabase.auth.getUser();
        if (userErr) {
          console.warn("[VerifyEmail] getUser background error:", userErr.message);
          return;
        }

        if (sbUser && sbUser.email_confirmed_at) {
          await refreshUser();
          toast({
            title: "Email Verified! 🎉",
            description: "Automatically continuing to your setup...",
          });
        }
      } catch (err) {
        console.warn("[VerifyEmail] Automatic verification check failed:", err);
      }
    }

    if (!supabaseUser || !supabaseUser.email_confirmed_at) {
      interval = setInterval(checkVerification, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [supabaseUser, refreshUser, toast]);

  // Resend cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resendCooldown]);

  const handleProceedCheck = useCallback(async () => {
    setIsChecking(true);
    console.log("[VERIFY FLOW] Starting proceed check...");

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 5000)
    );

    try {
      await Promise.race([
        (async () => {
          // STEP 1: refreshSession
          console.log("[VERIFY FLOW] [SESSION RECOVERY] STEP 1: Refreshing session");
          try {
            await supabase.auth.refreshSession();
          } catch (refreshErr: any) {
            console.warn("[VERIFY FLOW] [SESSION RECOVERY] refreshSession error:", refreshErr?.message || refreshErr);
          }

          // STEP 2: getSession
          console.log("[VERIFY FLOW] [SESSION RECOVERY] STEP 2: Fetching active session");
          const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
          if (sessionErr) {
            console.warn("[VERIFY FLOW] [SESSION RECOVERY] getSession error:", sessionErr.message);
          }

          // STEP 3: if session exists
          if (session) {
            console.log("[VERIFY FLOW] [SESSION RECOVERY] STEP 3: Active session found. Syncing profile");
            const sbUser = session.user;
            
            await refreshUser();

            let onboarded = false;
            try {
              const { data: profile } = await supabase
                .from("user_profiles")
                .select("onboarding_completed")
                .eq("id", sbUser.id)
                .maybeSingle();
              if (profile) {
                onboarded = profile.onboarding_completed;
              }
            } catch (profileErr) {
              console.warn("[VERIFY FLOW] [SESSION RECOVERY] Profile fetch warning:", profileErr);
            }

            toast({
              title: "Verification Successful! 🎉",
              description: "Taking you to the app...",
            });
            setLocation(onboarded ? "/dashboard" : "/onboarding");
            return;
          }

          // STEP 4: silent recovery getUser()
          console.log("[VERIFY FLOW] [SESSION RECOVERY] STEP 4: Session missing, attempting silent recovery via getUser()");
          const { data: { user: sbUser }, error: getUserErr } = await supabase.auth.getUser();
          if (getUserErr) {
            console.warn("[VERIFY FLOW] [SESSION RECOVERY] getUser error:", getUserErr.message);
          }

          // STEP 5: if user exists but no active session
          if (sbUser) {
            console.log("[VERIFY FLOW] [SESSION RECOVERY] STEP 5: User exists but no active session. Redirecting to login page");
            toast({
              title: "Email verified successfully.",
              description: "Please login to continue.",
            });
            const targetEmail = sbUser.email || email || "";
            setLocation(`/login?verified=true&email=${encodeURIComponent(targetEmail)}`);
            return;
          }

          // Fallback if absolutely no user or session
          console.warn("[VERIFY FLOW] [SESSION RECOVERY] Silent recovery failed: No user or session found.");
          toast({
            title: "Verification Pending",
            description: "Please check your inbox or spam folder and click the verification link.",
            variant: "destructive",
          });
        })(),
        timeoutPromise
      ]);
    } catch (e: any) {
      console.error("[VERIFY FLOW] [SESSION RECOVERY] Proceed flow failed/timed out:", e);
      toast({
        title: "Session Recovery Delayed",
        description: "Checking status took too long. You can sign in directly.",
        variant: "destructive",
      });
      setLocation(`/login?email=${encodeURIComponent(email || "")}`);
    } finally {
      setIsChecking(false);
    }
  }, [email, refreshUser, setLocation, toast]);

  // Trigger recovery check automatically if land via callback failure (?recovery=true)
  useEffect(() => {
    if (isRecovery) {
      console.log("[VERIFY FLOW] Landed on verify-email with recovery=true. Automatically checking status...");
      toast({
        title: "Restoring Session",
        description: "Checking if your email has been verified. Please wait...",
      });
      handleProceedCheck();
    }
  }, [isRecovery, handleProceedCheck, toast]);

  const handleResend = async () => {
    const targetEmail = email || supabaseUser?.email;
    if (!targetEmail || resendCooldown > 0 || isResending) return;

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined
        }
      });

      if (error) throw error;

      setResendCooldown(60); // Longer cooldown for production API limits
      toast({
        title: "Verification Email Sent",
        description: `We've sent a new activation link to ${targetEmail}.`,
      });
    } catch (err: any) {
      toast({
        title: "Resend Failed",
        description: err.message || "Failed to resend confirmation email.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="border-none shadow-xl bg-card/85 backdrop-blur-md overflow-hidden rounded-2xl">
        <CardHeader className="text-center pb-4 pt-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-1.5"
          >
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center text-primary mb-3 shadow-inner">
              <Mail className="h-7 w-7 animate-pulse" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              Confirm Your Email
            </CardTitle>
            <CardDescription className="text-muted-foreground/90 max-w-sm mx-auto text-center px-2">
              We've sent an activation link to <span className="font-semibold text-foreground">{email || supabaseUser?.email || "your email address"}</span>.
            </CardDescription>
          </motion.div>
        </CardHeader>

        <CardContent className="px-6 pb-8 space-y-6 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Please open your inbox, check your email, and click the confirmation link to activate your account.
          </p>

          <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl space-y-1">
            <span className="text-[10px] font-bold tracking-wider uppercase text-primary block">
              Waiting for Confirmation
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This page will automatically refresh once verified. You can also click the button below to check manually.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              onClick={handleProceedCheck}
              disabled={isChecking}
              className="w-full h-11 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center justify-center gap-1.5 hover-elevate transition-all duration-200"
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  I've Confirmed My Email — Proceed
                </>
              )}
            </Button>


            <Button
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending || !(email || supabaseUser)}
              className="w-full h-11 text-sm font-semibold rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-md transition-all hover:translate-y-[-1px] active:translate-y-[0px] flex items-center justify-center gap-1.5"
            >
              {isResending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <RefreshCw className={`h-4 w-4 ${resendCooldown > 0 ? "" : "animate-spin"}`} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Verification Email"}
                </>
              )}
            </Button>

            <Button
              variant="outline"
              type="button"
              onClick={() => logout()}
              className="w-full h-11 text-xs font-bold rounded-xl border-muted-foreground/20 text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 hover:bg-muted/50"
            >
              <LogOut className="h-4 w-4" /> Back to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
