import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Mail, Loader2, RefreshCw, LogOut, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

export default function VerifyEmail() {
  const { user, supabaseUser, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);

  // Auto redirect if user profile exists and is verified
  useEffect(() => {
    if (supabaseUser) {
      // In Supabase, check if the email is confirmed
      if (supabaseUser.email_confirmed_at) {
        if (user?.onboardingCompleted) {
          setLocation("/dashboard");
        } else {
          setLocation("/onboarding");
        }
      }
    } else {
      setLocation("/login"); // Redirect to login if not logged in
    }
  }, [supabaseUser, user, setLocation]);

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

  const handleResend = async () => {
    if (!supabaseUser?.email || resendCooldown > 0 || isResending) return;

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: supabaseUser.email,
      });

      if (error) throw error;

      setResendCooldown(60); // Longer cooldown for production API limits
      toast({
        title: "Verification Email Sent",
        description: `We've sent a new activation link to ${supabaseUser.email}.`,
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
              We've sent an activation link to <span className="font-semibold text-foreground">{supabaseUser?.email}</span>.
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
              This page will automatically refresh and redirect you to onboarding once the confirmation link is clicked.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending || !supabaseUser}
              className="w-full h-11 text-sm font-medium rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground shadow-md transition-all hover:translate-y-[-1px] active:translate-y-[0px] flex items-center justify-center gap-1.5"
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
              className="w-full h-11 text-xs font-semibold rounded-lg border-muted-foreground/20 text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5"
            >
              <LogOut className="h-4 w-4" /> Back to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
