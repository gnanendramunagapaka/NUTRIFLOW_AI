import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Compass,
  Home,
  Info,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

export default function OrderConfirmation() {
  const [, setLocation] = useLocation();

  return (
    <Layout>
      <div className="container max-w-lg mx-auto p-4 md:p-8 space-y-6 min-h-[75vh] flex flex-col justify-center items-center text-center">
        <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs">
          <ShoppingBag className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-200/50 inline-flex items-center gap-1">
            ⚡ Powered by Swiggy
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Order Fulfillment Foundation
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
            NutriFlow Phase 1 provides the user interface foundation for Food Delivery, Instamart groceries, and Dineout reservations. Live order placement, driver tracking, and digital confirmations will be connected in the transaction phase.
          </p>
        </div>

        <Card className="border border-border/70 rounded-2xl bg-muted/20 text-left p-4 w-full max-w-md">
          <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              No transactions or payment authorizations were processed. You can freely explore meals, groceries, and table availability across all domains.
            </p>
          </div>
        </Card>

        <div className="flex gap-3 w-full max-w-xs justify-center pt-2">
          <Button
            onClick={() => setLocation("/dashboard")}
            variant="outline"
            className="flex-1 rounded-xl text-xs font-semibold gap-1.5 h-10"
          >
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </Button>
          <Button
            onClick={() => setLocation("/discover")}
            className="flex-1 rounded-xl text-xs font-semibold gap-1.5 h-10 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Compass className="h-4 w-4" />
            <span>Explore</span>
          </Button>
        </div>

        <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground pt-4">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Swiggy Commerce Workflows Foundation</span>
        </div>
      </div>
    </Layout>
  );
}
