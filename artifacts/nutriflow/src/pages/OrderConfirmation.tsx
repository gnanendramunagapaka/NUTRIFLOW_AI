import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  MapPin, 
  Clock, 
  Activity, 
  Flame, 
  Dumbbell, 
  Sparkles, 
  ChevronRight, 
  ShoppingBag, 
  MessageSquare, 
  Heart,
  Truck,
  Utensils
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderDetails {
  orderId: string;
  items: any[];
  totalAmount: number;
  totalCalories: number;
  totalProtein: number;
  deliveryEstimate: string;
  address: string;
  placedAt: string;
}

export default function OrderConfirmation() {
  const [, setLocation] = useLocation();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [step, setStep] = useState(0);

  // Load last order details
  useEffect(() => {
    try {
      const stored = localStorage.getItem("nutriflow_last_order");
      if (stored) {
        setOrder(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load last order info:", e);
    }
  }, []);

  // Simulate delivery tracker steps
  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => {
        if (prev < 3) return prev + 1;
        return prev;
      });
    }, 6000); // Progress tracker every 6 seconds

    return () => clearInterval(timer);
  }, []);

  const steps = [
    { title: "Order Accepted", desc: "Kitchen partner has accepted your health request.", time: "1 min ago" },
    { title: "Preparing Food", desc: "Chef is using certified organic, low-sodium ingredients.", time: "Just now" },
    { title: "Delivery Partner Assigned", desc: "Swiggy Delivery Partner is moving towards the kitchen.", time: "Arriving shortly" },
    { title: "On The Way", desc: "Your meal is hot & on its way to HSR Layout.", time: "15 min left" },
  ];

  if (!order) {
    return (
      <Layout>
        <div className="container max-w-lg mx-auto p-4 md:p-8 text-center space-y-6 min-h-[70vh] flex flex-col justify-center items-center">
          <div className="h-16 w-16 rounded-full bg-muted/45 flex items-center justify-center text-muted-foreground">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">No Order Found</h1>
            <p className="text-muted-foreground mt-2 max-w-sm">
              You haven't placed an order recently in this session.
            </p>
          </div>
          <Button onClick={() => setLocation("/discover")} className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-6">
            Go to Discover
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-24">
        {/* Success header */}
        <div className="text-center space-y-3 max-w-lg mx-auto">
          <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10">
            <CheckCircle className="h-10 w-10 fill-emerald-100 dark:fill-transparent" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Order Confirmed!</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Order ID: <span className="font-bold text-foreground">{order.orderId}</span>
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/30">
              Fulfilled via Swiggy Delivery
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Tracker Card - Left 3 cols */}
          <div className="md:col-span-3 space-y-6">
            <Card className="border border-border/80 rounded-3xl overflow-hidden shadow-sm">
              <CardHeader className="bg-muted/15 border-b border-border/40 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-emerald-600" />
                    <CardTitle className="text-base font-bold">Delivery Partner Tracker</CardTitle>
                  </div>
                  <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full">
                    ETA: {order.deliveryEstimate}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Visual Map/Tracker placeholder */}
                <div className="relative h-44 rounded-2xl bg-slate-100 dark:bg-zinc-900 border overflow-hidden flex items-center justify-center mb-6">
                  {/* Delivery Route Simulation */}
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#a3a3a3_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#4b5563_1px,transparent_1px)]" />
                  
                  <div className="relative w-full max-w-sm px-6 flex justify-between items-center z-10">
                    <div className="flex flex-col items-center">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shadow-xs">
                        <Utensils className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground mt-2">Health Kitchen</span>
                    </div>

                    <div className="flex-1 h-1 bg-muted mx-4 relative overflow-hidden rounded-full">
                      <div 
                        className="absolute top-0 bottom-0 left-0 bg-emerald-600 rounded-full transition-all duration-1000" 
                        style={{ width: `${(step / 3) * 100}%` }}
                      />
                      {/* Delivery Guy Icon sliding along the bar */}
                      <div 
                        className="absolute -top-3 h-7 w-7 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-md transition-all duration-1000"
                        style={{ left: `calc(${(step / 3) * 100}% - 14px)` }}
                      >
                        <Truck className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-bold text-foreground mt-2">Your Home</span>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-2 left-3 right-3 text-center">
                    <span className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase">
                      Swiggy Delivery Partner assigned from Swiggy ecosystem
                    </span>
                  </div>
                </div>

                {/* Tracker Steps */}
                <div className="space-y-6 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60">
                  {steps.map((s, idx) => {
                    const isCompleted = idx < step;
                    const isCurrent = idx === step;
                    return (
                      <div key={idx} className="flex gap-4 items-start relative pl-1">
                        <div className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center shrink-0 z-10 transition-all border-2",
                          isCompleted 
                            ? "bg-emerald-600 border-emerald-600 text-white" 
                            : isCurrent 
                              ? "bg-background border-emerald-600 text-emerald-600 animate-pulse shadow-sm"
                              : "bg-background border-border text-muted-foreground"
                        )}>
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4 fill-emerald-600 text-white" />
                          ) : (
                            <span className="text-xs font-bold">{idx + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline">
                            <h4 className={cn("text-sm font-bold leading-none", isCurrent ? "text-emerald-700 dark:text-emerald-400" : isCompleted ? "text-foreground" : "text-muted-foreground")}>
                              {s.title}
                            </h4>
                            <span className="text-[10px] text-muted-foreground font-semibold">{s.time}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Nutrition Insight and Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Apple Health Nutrition Card */}
            <Card className="border border-emerald-100 dark:border-emerald-900 bg-gradient-to-br from-emerald-50/20 to-background dark:from-emerald-950/10 dark:to-background rounded-3xl overflow-hidden shadow-2xs">
              <CardHeader className="pb-3 border-b border-emerald-100/30">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-sm font-bold">Nutrition summary recorded</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold">Calories</p>
                    <div className="flex items-baseline gap-1">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span className="text-base font-extrabold text-foreground">{order.totalCalories}</span>
                      <span className="text-[10px] text-muted-foreground">kcal</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-semibold">Protein</p>
                    <div className="flex items-baseline gap-1">
                      <Dumbbell className="h-4 w-4 text-blue-500" />
                      <span className="text-base font-extrabold text-foreground">{order.totalProtein}</span>
                      <span className="text-[10px] text-muted-foreground">g</span>
                    </div>
                  </div>
                </div>

                <Separator className="bg-emerald-100/30" />

                <div className="flex gap-3">
                  <Heart className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-emerald-900 dark:text-emerald-400">Wellness Co-Pilot Insight</h5>
                    <p className="text-[11px] text-emerald-800/90 dark:text-emerald-400/95 leading-relaxed mt-1 italic">
                      "Eating this meal at your regular lunch time keeps your energy curve flat and avoids late afternoon sugar crashes. Great job sticking to your meal streak!"
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items List Summary */}
            <Card className="border border-border/80 rounded-3xl overflow-hidden shadow-2xs">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-bold">Items Ordered</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground bg-muted px-1.5 py-0.5 rounded">
                        {item.quantity}x
                      </span>
                      <span className="font-semibold text-foreground truncate max-w-[150px]">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-bold text-foreground">₹{item.price * item.quantity}</span>
                  </div>
                ))}

                <Separator className="bg-border/40" />

                <div className="flex justify-between items-center text-sm font-extrabold pt-1 text-foreground">
                  <span>Paid Total</span>
                  <span>₹{order.totalAmount}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setLocation("/dashboard")}
                variant="outline"
                className="rounded-2xl py-5 h-auto text-xs font-bold"
              >
                Go to Dashboard
              </Button>
              <Button
                onClick={() => setLocation("/chat")}
                className="rounded-2xl py-5 h-auto text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                Chat with AI
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
