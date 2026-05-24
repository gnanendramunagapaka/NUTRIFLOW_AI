import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  Check, 
  ChevronLeft, 
  Loader2, 
  ArrowRight,
  ShieldCheck
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

// Validation Schemas
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  rememberMe: z.boolean().optional(),
});

const signupSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string(),
  agreeToTerms: z.boolean().refine((val) => val === true, "You must agree to the terms."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

type AuthMode = "login" | "signup" | "forgot";

export default function Login() {
  const { user, onboarded, login, signup, loginWithGoogle } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ssoLoading, setSsoLoading] = useState<"google" | "apple" | null>(null);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // Hook Forms
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
    reset: resetLoginForm,
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "demo@nutriflow.ai", password: "password", rememberMe: true },
  });

  const {
    register: registerSignup,
    handleSubmit: handleSignupSubmit,
    setValue: setSignupValue,
    watch: watchSignup,
    formState: { errors: signupErrors },
    reset: resetSignupForm,
  } = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { agreeToTerms: false },
  });

  const {
    register: registerForgot,
    handleSubmit: handleForgotSubmit,
    formState: { errors: forgotErrors },
    reset: resetForgotForm,
  } = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
  });

  // Mode Switch Handlers
  const changeMode = (newMode: AuthMode) => {
    setMode(newMode);
    setShowPassword(false);
    setForgotSubmitted(false);
    resetLoginForm();
    resetSignupForm();
    resetForgotForm();
  };

  // Auth Submit Handlers
  const onLogin = async (data: z.infer<typeof loginSchema>) => {
    setIsSubmitting(true);
    console.log("[Login DEBUG] Attempting login for email:", data.email);
    try {
      await login(data.email, data.password);
      console.log("[Login DEBUG] Supabase auth success triggered.");
      toast({
        title: "Signed in successfully",
        description: "Welcome back to NutriFlow AI!",
      });
    } catch (err: any) {
      console.error("[Login DEBUG] Supabase login error:", err);
      toast({
        title: "Authentication Failed",
        description: err.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSignup = async (data: z.infer<typeof signupSchema>) => {
    setIsSubmitting(true);
    try {
      await signup(data.name, data.email, data.password);
      toast({
        title: "Account created!",
        description: "Please verify your email address to continue.",
      });
      setLocation(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (err: any) {
      toast({
        title: "Signup Failed",
        description: err.message || "An error occurred. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onForgot = async (data: z.infer<typeof forgotSchema>) => {
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setForgotSubmitted(true);
      toast({
        title: "Reset link sent",
        description: `We've sent a password reset email to ${data.email}.`,
      });
    } catch {
      toast({
        title: "Request Failed",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // SSO Sign-in
  const handleSSO = async (provider: "google" | "apple") => {
    setSsoLoading(provider);
    try {
      if (provider === "google") {
        await loginWithGoogle();
      } else {
        // Fallback mock sign-in for Apple SSO
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await login("apple@example.com", "sso_token");
        toast({
          title: "Connected via OAuth",
          description: "Logged in successfully with your Apple ID.",
        });
      }
    } catch (err: any) {
      toast({
        title: "SSO Connection Failed",
        description: err.message || "Could not establish identity link.",
        variant: "destructive",
      });
    } finally {
      setSsoLoading(null);
    }
  };

  return (
    <AuthLayout>
      <Card className="border-none shadow-xl bg-card/85 backdrop-blur-md overflow-hidden rounded-2xl">
        <CardHeader className="text-center pb-4 pt-8">
          <AnimatePresence mode="wait">
            {mode === "login" && (
              <motion.div
                key="login-header"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-1.5"
              >
                <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                  Welcome Back 👋
                </CardTitle>
                <CardDescription className="text-muted-foreground/90 max-w-sm mx-auto">
                  Continue your wellness journey with AI-powered nutrition guidance.
                </CardDescription>
              </motion.div>
            )}
            
            {mode === "signup" && (
              <motion.div
                key="signup-header"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-1.5"
              >
                <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                  Start Your Journey 🌱
                </CardTitle>
                <CardDescription className="text-muted-foreground/90 max-w-sm mx-auto">
                  Create an account to build your personalized AI meal and wellness plan.
                </CardDescription>
              </motion.div>
            )}
            
            {mode === "forgot" && (
              <motion.div
                key="forgot-header"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-1.5"
              >
                <CardTitle className="text-2xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
                  {mode === "forgot" && !forgotSubmitted && (
                    <>Forgot Password?</>
                  )}
                  {mode === "forgot" && forgotSubmitted && (
                    <span className="flex items-center gap-1.5 text-primary">
                      <ShieldCheck className="h-6 w-6" /> Check Email
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-muted-foreground/90 max-w-sm mx-auto">
                  {!forgotSubmitted 
                    ? "Enter your email address and we'll send you a link to reset your password."
                    : "If an account exists, a link will arrive shortly. Please check your spam folder too."}
                </CardDescription>
              </motion.div>
            )}
          </AnimatePresence>
        </CardHeader>
        
        <CardContent className="px-6 pb-8">
          <AnimatePresence mode="wait">
            {mode === "login" && (
              <motion.div
                key="login-mode"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.2 }}
              >
                <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-4">
                  <div className="space-y-1.5 relative">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="yourname@domain.com"
                        className="pl-10 h-11 rounded-lg border-muted-foreground/25 focus-visible:ring-primary"
                        {...registerLogin("email")}
                        disabled={isSubmitting}
                      />
                    </div>
                    {loginErrors.email && (
                      <p className="text-xs text-destructive font-medium mt-1">{loginErrors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        onClick={() => changeMode("forgot")}
                        className="text-xs text-primary/95 hover:text-primary hover:underline font-semibold cursor-pointer"
                        disabled={isSubmitting}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10 h-11 rounded-lg border-muted-foreground/25 focus-visible:ring-primary"
                        {...registerLogin("password")}
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                        disabled={isSubmitting}
                      >
                        {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                    {loginErrors.password && (
                      <p className="text-xs text-destructive font-medium mt-1">{loginErrors.password.message}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox 
                      id="rememberMe" 
                      className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      checked={watchSignup("agreeToTerms")} // mock check
                      onCheckedChange={() => {}} // dummy action
                    />
                    <label
                      htmlFor="rememberMe"
                      className="text-xs text-muted-foreground hover:text-foreground cursor-pointer font-medium select-none"
                    >
                      Remember me on this device
                    </label>
                  </div>

                  <Button type="submit" className="w-full h-11 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover-elevate transition-all duration-200 mt-2" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4.5 w-4.5 animate-spin" /> Signing in...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1">
                        Sign In <ArrowRight className="h-4.5 w-4.5 ml-1" />
                      </span>
                    )}
                  </Button>
                </form>

                {/* Social Dividers */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground font-semibold">Or continue with</span>
                  </div>
                </div>

                {/* Social Login Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-10.5 rounded-lg border-muted-foreground/20 hover:bg-muted/50 cursor-pointer font-medium text-sm flex items-center justify-center"
                    onClick={() => handleSSO("google")}
                    disabled={isSubmitting || ssoLoading !== null}
                  >
                    {ssoLoading === "google" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Google
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10.5 rounded-lg border-muted-foreground/20 hover:bg-muted/50 cursor-pointer font-medium text-sm flex items-center justify-center"
                    onClick={() => handleSSO("apple")}
                    disabled={isSubmitting || ssoLoading !== null}
                  >
                    {ssoLoading === "apple" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.15.67-2.87 1.51-.62.72-1.16 1.86-1.01 2.98 1.12.09 2.22-.62 2.89-1.43z"/>
                        </svg>
                        Apple
                      </>
                    )}
                  </Button>
                </div>

                <div className="mt-8 text-center text-sm text-muted-foreground">
                  New to NutriFlow?{" "}
                  <button
                    onClick={() => changeMode("signup")}
                    className="text-primary hover:underline font-semibold cursor-pointer"
                    disabled={isSubmitting}
                  >
                    Start wellness profile
                  </button>
                </div>
              </motion.div>
            )}

            {mode === "signup" && (
              <motion.div
                key="signup-mode"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
              >
                <form onSubmit={handleSignupSubmit(onSignup)} className="space-y-3.5">
                  <div className="space-y-1 relative">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder="John Doe"
                        className="pl-10 h-11 rounded-lg border-muted-foreground/25 focus-visible:ring-primary"
                        {...registerSignup("name")}
                        disabled={isSubmitting}
                      />
                    </div>
                    {signupErrors.name && (
                      <p className="text-xs text-destructive font-medium mt-1">{signupErrors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-1 relative">
                    <Label htmlFor="signup-email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="name@domain.com"
                        className="pl-10 h-11 rounded-lg border-muted-foreground/25 focus-visible:ring-primary"
                        {...registerSignup("email")}
                        disabled={isSubmitting}
                      />
                    </div>
                    {signupErrors.email && (
                      <p className="text-xs text-destructive font-medium mt-1">{signupErrors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1 relative">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10 h-11 rounded-lg border-muted-foreground/25 focus-visible:ring-primary"
                        {...registerSignup("password")}
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                        disabled={isSubmitting}
                      >
                        {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                    {signupErrors.password && (
                      <p className="text-xs text-destructive font-medium mt-1">{signupErrors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-1 relative">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 h-11 rounded-lg border-muted-foreground/25 focus-visible:ring-primary"
                        {...registerSignup("confirmPassword")}
                        disabled={isSubmitting}
                      />
                    </div>
                    {signupErrors.confirmPassword && (
                      <p className="text-xs text-destructive font-medium mt-1">{signupErrors.confirmPassword.message}</p>
                    )}
                  </div>

                  {/* Agree to terms check */}
                  <div className="flex items-start space-x-2 pt-1">
                    <Checkbox 
                      id="agreeToTerms" 
                      className="border-muted-foreground/30 mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      checked={watchSignup("agreeToTerms")}
                      onCheckedChange={(checked) => setSignupValue("agreeToTerms", checked === true)}
                      disabled={isSubmitting}
                    />
                    <div className="grid gap-1 leading-none">
                      <label
                        htmlFor="agreeToTerms"
                        className="text-xs text-muted-foreground font-medium select-none cursor-pointer hover:text-foreground"
                      >
                        I agree to the{" "}
                        <span className="text-primary font-semibold hover:underline">Terms of Service</span> and{" "}
                        <span className="text-primary font-semibold hover:underline">Privacy Policy</span>.
                      </label>
                    </div>
                  </div>
                  {signupErrors.agreeToTerms && (
                    <p className="text-xs text-destructive font-medium">{signupErrors.agreeToTerms.message}</p>
                  )}

                  <Button type="submit" className="w-full h-11 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover-elevate transition-all duration-200 mt-2" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4.5 w-4.5 animate-spin" /> Creating profile...
                      </span>
                    ) : (
                      "Create Wellness Account"
                    )}
                  </Button>
                </form>

                {/* Social Dividers */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground font-semibold">Or register with</span>
                  </div>
                </div>

                {/* Social Registration */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-10.5 rounded-lg border-muted-foreground/20 hover:bg-muted/50 cursor-pointer font-medium text-sm flex items-center justify-center"
                    onClick={() => handleSSO("google")}
                    disabled={isSubmitting || ssoLoading !== null}
                  >
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10.5 rounded-lg border-muted-foreground/20 hover:bg-muted/50 cursor-pointer font-medium text-sm flex items-center justify-center"
                    onClick={() => handleSSO("apple")}
                    disabled={isSubmitting || ssoLoading !== null}
                  >
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.15.67-2.87 1.51-.62.72-1.16 1.86-1.01 2.98 1.12.09 2.22-.62 2.89-1.43z"/>
                    </svg>
                    Apple
                  </Button>
                </div>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    onClick={() => changeMode("login")}
                    className="text-primary hover:underline font-semibold cursor-pointer"
                    disabled={isSubmitting}
                  >
                    Sign In
                  </button>
                </div>
              </motion.div>
            )}

            {mode === "forgot" && (
              <motion.div
                key="forgot-mode"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                {!forgotSubmitted ? (
                  <form onSubmit={handleForgotSubmit(onForgot)} className="space-y-4">
                    <div className="space-y-1.5 relative">
                      <Label htmlFor="forgot-email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-muted-foreground" />
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder="yourname@domain.com"
                          className="pl-10 h-11 rounded-lg border-muted-foreground/25 focus-visible:ring-primary"
                          {...registerForgot("email")}
                          disabled={isSubmitting}
                        />
                      </div>
                      {forgotErrors.email && (
                        <p className="text-xs text-destructive font-medium mt-1">{forgotErrors.email.message}</p>
                      )}
                    </div>

                    <Button type="submit" className="w-full h-11 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover-elevate transition-all duration-200" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4.5 w-4.5 animate-spin" /> Processing request...
                        </span>
                      ) : (
                        "Send Reset Instructions"
                      )}
                    </Button>
                  </form>
                ) : (
                  <div className="text-center py-6 space-y-4">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 text-primary mb-2">
                      <Check className="h-7 w-7" />
                    </div>
                    <h3 className="text-lg font-bold">Verification Link Sent</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      Click the link in the email we sent to securely reset your credentials.
                    </p>
                    <Button 
                      onClick={() => setForgotSubmitted(false)}
                      variant="outline" 
                      className="w-full h-11 rounded-xl border-muted-foreground/20 font-medium"
                    >
                      Resend link
                    </Button>
                  </div>
                )}

                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => changeMode("login")}
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-semibold cursor-pointer transition-colors"
                    disabled={isSubmitting}
                  >
                    <ChevronLeft className="h-4 w-4" /> Back to Sign In
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
