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
  Utensils,
  Phone,
  Star,
  Shield,
  Navigation,
  ThumbsUp
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
  const [notification, setNotification] = useState<string | null>(null);

  // Load last order details
  useEffect(() => {
    try {
      const stored = localStorage.getItem("nutriflow_last_order");
      if (stored) {
        setOrder(JSON.parse(stored));
      } else {
        // Fallback for demo mode if they somehow refresh without placing an order
        const fallbackOrder: OrderDetails = {
          orderId: "NF-" + Math.floor(100000 + Math.random() * 900000),
          items: [
            { name: "Keto Paneer Tikka Salad Bowl", price: 260, quantity: 1 },
            { name: "Organic Avocados (2 pcs)", price: 199, quantity: 1 }
          ],
          totalAmount: 459,
          totalCalories: 480,
          totalProtein: 26,
          deliveryEstimate: "22 mins",
          address: "Flat 402, Elite Residency, Gachibowli, Hyderabad",
          placedAt: new Date().toISOString()
        };
        setOrder(fallbackOrder);
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
    }, 8000); // Progress tracker every 8 seconds

    return () => clearInterval(timer);
  }, []);

  const triggerCallNotification = () => {
    setNotification("Calling Ramesh Kumar (Swiggy Delivery Partner)... 📞");
    setTimeout(() => setNotification(null), 4000);
  };

  const triggerMessageNotification = () => {
    setNotification("Chat window opened with Ramesh Kumar. 'Please drop at security gate if not reachable.' 💬");
    setTimeout(() => setNotification(null), 4000);
  };

  const steps = [
    { title: "Order Accepted", desc: "Kitchen partner has accepted your health request.", time: "1 min ago" },
    { title: "Preparing Food", desc: "Chef is using certified organic, low-sodium ingredients.", time: "Just now" },
    { title: "Delivery Partner Assigned", desc: "Swiggy Delivery Partner is moving towards the kitchen.", time: "Arriving shortly" },
    { title: "On The Way", desc: "Your meal is hot & on its way to your address.", time: "15 min left" },
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
      <div className="container max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-24 relative">
        {/* Real-time notification toast */}
        {notification && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 text-emerald-100 border border-emerald-500/30 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
            <div className="h-2.5 w-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="text-xs font-bold">{notification}</span>
          </div>
        )}

        {/* Success header */}
        <div className="text-center space-y-3 max-w-lg mx-auto">
          <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10 relative">
            <CheckCircle className="h-10 w-10 fill-emerald-100 dark:fill-transparent" />
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Order Confirmed!</h1>
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
            <Card className="border border-border/80 rounded-3xl overflow-hidden shadow-md bg-card transition-all duration-300">
              <CardHeader className="bg-muted/15 border-b border-border/40 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-950/30 text-orange-600">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">Delivery Partner Tracker</CardTitle>
                      <CardDescription className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {step === 0 && "Waiting for kitchen acceptance..."}
                        {step === 1 && "Chef is preparing your healthy meal..."}
                        {step === 2 && "Delivery partner picking up..."}
                        {step === 3 && "Delivery partner is on the way!"}
                      </CardDescription>
                    </div>
                  </div>
                  <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-200/50 dark:border-emerald-900/40">
                    ETA: {order.deliveryEstimate}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Visual Map/Tracker simulation */}
                <div className="relative h-44 rounded-2xl bg-slate-100 dark:bg-zinc-950 border overflow-hidden flex items-center justify-center">
                  {/* Delivery Route Grid */}
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#a3a3a3_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#4b5563_1px,transparent_1px)]" />
                  
                  {/* Animated Road Line */}
                  <div className="absolute h-0.5 w-[75%] bg-muted dark:bg-zinc-800 z-0">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all duration-1000" 
                      style={{ width: `${(step / 3) * 100}%` }}
                    />
                  </div>

                  {/* Route milestones */}
                  <div className="relative w-full max-w-sm px-6 flex justify-between items-center z-10">
                    {/* Kitchen */}
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-sm border",
                        step >= 1 ? "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-500 text-emerald-600" : "bg-muted text-muted-foreground border-transparent"
                      )}>
                        <Utensils className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground mt-2">Health Kitchen</span>
                    </div>

                    {/* Middle Waypoint */}
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-500 shadow-xs border text-xs font-extrabold",
                        step >= 2 ? "bg-orange-50 dark:bg-orange-950/30 border-orange-400 text-orange-600" : "bg-muted text-muted-foreground border-transparent"
                      )}>
                        <Navigation className={cn("h-4 w-4 rotate-45", step === 2 && "animate-pulse")} />
                      </div>
                      <span className="text-[9px] font-bold text-muted-foreground mt-1.5">On the Road</span>
                    </div>

                    {/* Customer Home */}
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-sm border",
                        step === 3 ? "bg-emerald-600 text-white border-emerald-700 animate-pulse" : "bg-muted text-muted-foreground border-transparent"
                      )}>
                        <MapPin className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-bold text-foreground mt-2">Your Home</span>
                    </div>
                  </div>

                  {/* Delivery Guy sliding along the line */}
                  <div 
                    className="absolute h-9 w-9 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-lg transition-all duration-1000 z-20 border-2 border-background"
                    style={{ left: `calc(12.5% + ${(step / 3) * 75}% - 18px)` }}
                  >
                    <Truck className="h-4 w-4 animate-bounce" />
                    <div className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 bg-emerald-500 rounded-full border border-white flex items-center justify-center">
                      <CheckCircle className="h-2 w-2 text-white fill-white" />
                    </div>
                  </div>

                  {/* Floating Distance HUD */}
                  <div className="absolute top-3 bg-background/90 backdrop-blur-xs px-3 py-1 rounded-full border text-[10px] font-extrabold shadow-sm flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 bg-orange-500 rounded-full animate-ping" />
                    <span>
                      {step === 0 && "Locating delivery partner..."}
                      {step === 1 && "Food is being packed in insulated container"}
                      {step === 2 && "Partner is 1.4 km from restaurant"}
                      {step === 3 && "Partner is 350m away from your door"}
                    </span>
                  </div>
                  
                  <div className="absolute bottom-2 left-3 right-3 text-center">
                    <span className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase">
                      Swiggy Delivery Partner network: GPS tracking is simulated
                    </span>
                  </div>
                </div>

                {/* Swiggy Delivery Executive Card (Becomes active when step >= 2) */}
                <div className="border border-border/70 rounded-2xl p-4 bg-muted/20 dark:bg-zinc-900/30 transition-all duration-500">
                  {step < 2 ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted/60 animate-pulse flex items-center justify-center">
                          <Truck className="h-5 w-5 text-muted-foreground/50" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                          <div className="h-2.5 w-24 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground italic font-semibold animate-pulse">
                        Assigning partner...
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                      {/* Left: Partner Profile */}
                      <div className="flex items-center gap-3.5">
                        <div className="relative">
                          {/* Simulated Avatar Image */}
                          <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-orange-500 to-yellow-500 text-white font-extrabold text-sm flex items-center justify-center border-2 border-orange-200">
                            RK
                          </div>
                          {/* Active green indicator */}
                          <div className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-500 border-2 border-background rounded-full" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-extrabold text-foreground">Ramesh Kumar</h4>
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 px-1.5 py-0.25 rounded">
                              <Star className="h-2.5 w-2.5 fill-orange-500 text-orange-500" />
                              4.9
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <span>⚡ Swiggy Express Executive</span>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">EV Rider</span>
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground font-semibold">
                            <Shield className="h-3 w-3 text-emerald-600" />
                            <span>Sanitized bag & regular health status check OK</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Quick Action Contact Buttons */}
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          onClick={triggerMessageNotification}
                          className="flex-1 sm:flex-none h-8 rounded-xl text-xs font-bold gap-1 px-3 border-border hover:bg-muted"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                          Chat
                        </Button>
                        <Button
                          onClick={triggerCallNotification}
                          className="flex-1 sm:flex-none h-8 rounded-xl text-xs font-bold gap-1 px-3 bg-orange-600 hover:bg-orange-700 text-white"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          Call Partner
                        </Button>
                      </div>
                    </div>
                  )}
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
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" 
                            : isCurrent 
                              ? "bg-background border-emerald-600 text-emerald-600 animate-pulse shadow-md"
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
                            <h4 className={cn(
                              "text-sm font-bold leading-none transition-all duration-300", 
                              isCurrent ? "text-emerald-700 dark:text-emerald-400" : isCompleted ? "text-foreground" : "text-muted-foreground"
                            )}>
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
            <Card className="border border-emerald-100 dark:border-emerald-900 bg-gradient-to-br from-emerald-50/20 to-background dark:from-emerald-950/10 dark:to-background rounded-3xl overflow-hidden shadow-xs">
              <CardHeader className="pb-3 border-b border-emerald-100/30">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-600 animate-pulse" />
                  <CardTitle className="text-sm font-bold">Nutrition Summary Recorded</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 p-3 rounded-2xl bg-orange-50/30 dark:bg-orange-950/10 border border-orange-100/30">
                    <p className="text-[10px] text-muted-foreground font-semibold">Calories</p>
                    <div className="flex items-baseline gap-1">
                      <Flame className="h-4 w-4 text-orange-500 fill-orange-500/20" />
                      <span className="text-lg font-extrabold text-foreground">{order.totalCalories}</span>
                      <span className="text-[10px] text-muted-foreground">kcal</span>
                    </div>
                  </div>
                  <div className="space-y-1 p-3 rounded-2xl bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100/30">
                    <p className="text-[10px] text-muted-foreground font-semibold">Protein</p>
                    <div className="flex items-baseline gap-1">
                      <Dumbbell className="h-4 w-4 text-blue-500" />
                      <span className="text-lg font-extrabold text-foreground">{order.totalProtein}</span>
                      <span className="text-[10px] text-muted-foreground">g</span>
                    </div>
                  </div>
                </div>

                <Separator className="bg-emerald-100/30" />

                <div className="flex gap-3">
                  <div className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 h-fit shrink-0 mt-0.5">
                    <Heart className="h-4 w-4 fill-emerald-600/20" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-emerald-900 dark:text-emerald-400 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                      Wellness Co-Pilot Insight
                    </h5>
                    <p className="text-[11px] text-emerald-800/90 dark:text-emerald-400/95 leading-relaxed mt-1 italic">
                      "Eating this meal at your regular lunch time keeps your energy curve flat and avoids late afternoon sugar crashes. Great job sticking to your meal streak!"
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items List Summary */}
            <Card className="border border-border/80 rounded-3xl overflow-hidden shadow-xs">
              <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                <CardTitle className="text-sm font-bold">Items Ordered</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5 text-xs">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground bg-muted dark:bg-zinc-800 px-2 py-0.5 rounded">
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
                  <span className="text-emerald-600 dark:text-emerald-400 text-base">₹{order.totalAmount}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setLocation("/dashboard")}
                variant="outline"
                className="rounded-2xl py-5 h-auto text-xs font-bold border-border hover:bg-muted"
              >
                Go to Dashboard
              </Button>
              <Button
                onClick={() => setLocation("/chat")}
                className="rounded-2xl py-5 h-auto text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
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
