import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, Sparkles, Utensils, HeartHandshake } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { loginWithSwiggy } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleContinueWithSwiggy = async () => {
    setLoading(true);
    try {
      await loginWithSwiggy("/dashboard");
    } catch (e: any) {
      console.error("[Login] Failed to start Swiggy OAuth:", e);
      toast({
        title: "Connection Failed",
        description: e?.message || "Could not initialize Swiggy OAuth flow. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-primary/5 via-background to-background px-4 py-12 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-[#FC8019]/15 to-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="border-border/80 shadow-2xl backdrop-blur-md bg-card/90 rounded-3xl overflow-hidden">
          <CardHeader className="text-center pb-4 pt-8 px-8">
            <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FC8019] to-[#E26E10] flex items-center justify-center shadow-lg shadow-[#FC8019]/25">
              <span className="text-3xl font-black text-white tracking-wider">S</span>
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3 self-center">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Official Swiggy Builders Club Partner</span>
            </div>

            <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome to NutriFlow AI
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Connect your Swiggy account to access intelligent meal planning, nutritional guidance, and one-tap healthy ordering.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-8 pt-2 space-y-6">
            {/* Feature highlights */}
            <div className="grid grid-cols-1 gap-3 py-2">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50 text-xs">
                <Utensils className="h-4 w-4 text-[#FC8019] shrink-0" />
                <span className="text-foreground/90 font-medium">Auto-sync delivery addresses & active restaurants</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50 text-xs">
                <HeartHandshake className="h-4 w-4 text-primary shrink-0" />
                <span className="text-foreground/90 font-medium">Personalized macro goals based on food habits</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50 text-xs">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-foreground/90 font-medium">100% passwordless login with Swiggy Phone OTP</span>
              </div>
            </div>

            {/* Sole Primary Login CTA: Continue with Swiggy */}
            <div className="pt-2">
              <Button
                size="lg"
                onClick={handleContinueWithSwiggy}
                disabled={loading}
                className="w-full h-13 text-base font-bold bg-[#FC8019] hover:bg-[#E26E10] text-white shadow-lg shadow-[#FC8019]/25 hover:shadow-xl hover:shadow-[#FC8019]/30 transition-all rounded-xl flex items-center justify-center gap-3 group"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Connecting to Swiggy...</span>
                  </>
                ) : (
                  <>
                    <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-xs font-black">
                      S
                    </div>
                    <span>Continue with Swiggy</span>
                  </>
                )}
              </Button>
            </div>

            <p className="text-center text-[11px] text-muted-foreground/80 leading-normal">
              By connecting, you authorize NutriFlow to interact with Swiggy food & delivery services via official MCP protocols. Tokens expire safely after 5 days.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
