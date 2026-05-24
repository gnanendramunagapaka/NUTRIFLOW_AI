import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  MapPin, 
  ShoppingBag, 
  Flame, 
  Dumbbell, 
  Activity, 
  Clock, 
  CheckCircle, 
  Coins, 
  Utensils, 
  User, 
  ShieldCheck, 
  ChevronRight, 
  Sparkles,
  ArrowLeft,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    items,
    subtotal,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    addresses,
    selectedAddress,
    setSelectedAddress,
    deliveryEstimate,
    deliveryFee,
    platformFee,
    discount,
    totalAmount,
    clearCart,
  } = useCart();

  const [isPlacing, setIsPlacing] = useState(false);
  const [couponCode, setCouponCode] = useState("WELLNESS10");

  const handlePlaceOrder = () => {
    if (items.length === 0) {
      toast({ title: "Cart is empty", description: "Add items before checking out.", variant: "destructive" });
      return;
    }

    setIsPlacing(true);

    // Simulate placing order
    setTimeout(() => {
      setIsPlacing(false);
      toast({
        title: "Order Placed Successfully! 🎉",
        description: "Your health meal is on its way via Swiggy Delivery.",
      });
      // Save order details to local storage so order-confirmation page can display it
      const orderDetails = {
        orderId: `NF-${Math.floor(100000 + Math.random() * 900000)}`,
        items: [...items],
        totalAmount,
        totalCalories,
        totalProtein,
        deliveryEstimate,
        address: selectedAddress.address,
        placedAt: new Date().toISOString(),
      };
      localStorage.setItem("nutriflow_last_order", JSON.stringify(orderDetails));
      clearCart();
      setLocation("/order-confirmation");
    }, 2000);
  };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container max-w-lg mx-auto p-4 md:p-8 text-center space-y-6 min-h-[70vh] flex flex-col justify-center items-center">
          <div className="h-16 w-16 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Your Cart is Empty</h1>
            <p className="text-muted-foreground mt-2 max-w-sm">
              You must add some nutritious meals or grocery items from discover or planner before proceeding.
            </p>
          </div>
          <Button onClick={() => setLocation("/discover")} className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-6">
            Explore Healthy Items
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-5xl mx-auto p-4 md:p-8 space-y-6 pb-24">
        {/* Back header */}
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation("/discover")} 
            className="rounded-full hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Secure Checkout</h1>
            <p className="text-xs text-muted-foreground">Verify details and place your healthy wellness order.</p>
          </div>
        </div>

        {/* Swiggy Integration Banner */}
        <div className="bg-gradient-to-r from-orange-500/10 via-emerald-600/5 to-emerald-600/10 border border-emerald-100 dark:border-emerald-900/40 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center text-orange-600">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Swiggy Delivery Partner Integration</h4>
              <p className="text-xs text-muted-foreground">Fast, contactless, hyper-local delivery from healthy certified kitchen partners.</p>
            </div>
          </div>
          <span className="text-[10px] font-extrabold text-orange-700 bg-orange-100/50 dark:bg-orange-950/40 px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto border border-orange-200/50">
            Swiggy Integration Ready
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column — Address and Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address Section */}
            <Card className="border border-border/80 rounded-3xl overflow-hidden shadow-2xs">
              <CardHeader className="bg-muted/15 pb-4 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-base font-bold">Delivery Address</CardTitle>
                </div>
                <CardDescription className="text-xs">Choose where you'd like your wellness order delivered.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  {addresses.map((addr) => {
                    const isSelected = selectedAddress.id === addr.id;
                    const emoji = addr.icon === "Home" ? "🏠" : addr.icon === "Briefcase" ? "💼" : "📍";
                    return (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddress(addr)}
                        className={cn(
                          "p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3",
                          isSelected 
                            ? "border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-xs" 
                            : "border-border hover:border-border/80 bg-background"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
                            <span>{emoji}</span> {addr.label}
                          </span>
                          {isSelected && (
                            <span className="h-4 w-4 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0">
                              <CheckCircle className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{addr.address}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* AI Recommendation Explanation Note */}
            <Card className="border border-emerald-100 dark:border-emerald-900 bg-emerald-50/10 dark:bg-emerald-950/5 rounded-3xl overflow-hidden shadow-2xs">
              <CardContent className="p-5 flex items-start gap-4 text-left">
                <div className="h-10 w-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 text-emerald-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">AI Wellness Co-Pilot Note</h4>
                  <p className="text-xs text-emerald-800/90 dark:text-emerald-400/90 leading-relaxed mt-1">
                    Based on your onboarding profile (goal: <span className="font-bold text-foreground">{user?.goal || "balanced nutrition"}</span>), this order delivers exactly <span className="font-bold text-foreground">{totalProtein}g of protein</span> representing <span className="font-bold text-foreground">{Math.round((totalProtein / 65) * 100)}%</span> of your daily target. The micro-nutrients are structured to optimize cellular recovery and support metabolism.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Smart Healthy Swaps Card */}
            <Card className="border border-amber-200 bg-amber-500/[0.02] rounded-3xl overflow-hidden shadow-2xs">
              <CardContent className="p-5 flex items-start gap-4 text-left">
                <div className="h-10 w-10 rounded-2xl bg-amber-100 dark:bg-amber-950/20 flex items-center justify-center shrink-0 text-amber-700">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-800">💡 Recommended Healthy Swap (Save 140 kcal!)</h4>
                  <p className="text-xs text-amber-800/95 dark:text-amber-750/95 leading-relaxed mt-1">
                    Swap your regular dressing for our **Lemon Tahini Mint Vinaigrette** to reduce sodium levels by 30% and eliminate refined sugars. 
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      toast({
                        title: "Swap Applied! 🥗",
                        description: "Dressing swapped for Lemon Tahini Mint Vinaigrette. 140 kcal saved!",
                      });
                    }}
                    className="mt-3 rounded-xl border-amber-200 text-amber-800 hover:bg-amber-100/50 text-[10px] font-bold h-8"
                  >
                    Apply Healthy Swap
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Items summary in Checkout */}
            <Card className="border border-border/80 rounded-3xl overflow-hidden shadow-2xs">
              <CardHeader className="bg-muted/15 pb-4 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-base font-bold">Review Items</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-border/40">
                {items.map((item) => (
                  <div key={`${item.id}-${item.type}`} className="flex gap-4 p-5 items-center">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-16 w-16 rounded-xl object-cover border border-border/40 shrink-0" />
                    ) : (
                      <div className="h-16 w-16 rounded-xl bg-secondary/15 flex items-center justify-center text-muted-foreground shrink-0 border border-dashed border-border/60">
                        <span className="text-[9px] font-bold uppercase text-foreground/45">
                          {item.type === 'meal' ? 'Meal' : 'Grocery'}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-foreground leading-tight truncate">{item.name}</h4>
                        <span className="text-sm font-bold text-foreground shrink-0">₹{item.price * item.quantity}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Qty: {item.quantity} x ₹{item.price} • {item.cuisine || item.category || (item.type === 'meal' ? 'Healthy Meal' : 'Fresh Grocery')}
                      </p>

                      {/* Item specific health info */}
                      {(item.calories || item.protein || item.healthScore) && (
                        <div className="flex items-center gap-2 mt-1.5">
                          {item.calories && (
                            <span className="text-[9px] bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-semibold px-1 rounded flex items-center gap-0.5">
                              <Flame className="h-2 w-2" /> {item.calories} kcal
                            </span>
                          )}
                          {item.protein && (
                            <span className="text-[9px] bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 font-semibold px-1 rounded flex items-center gap-0.5">
                              <Dumbbell className="h-2 w-2" /> {item.protein}g P
                            </span>
                          )}
                          {item.healthScore && (
                            <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-semibold px-1 rounded flex items-center gap-0.5">
                              <Activity className="h-2 w-2" /> {item.healthScore} Health Score
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column — Pricing, Nutrition Summary, Place Order */}
          <div className="space-y-6">
            {/* Delivery Estimate */}
            <Card className="border border-border/80 rounded-3xl overflow-hidden shadow-2xs">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center shrink-0 text-emerald-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Estimated Delivery</p>
                  <p className="text-sm font-extrabold text-foreground">{deliveryEstimate}</p>
                </div>
                <div className="ml-auto text-[10px] text-emerald-600 bg-emerald-100/50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full font-semibold">
                  Fulfilled via Swiggy
                </div>
              </CardContent>
            </Card>

            {/* Health / Nutrition Goals Summary Card */}
            <Card className="border border-emerald-100 dark:border-emerald-900 bg-gradient-to-br from-emerald-50/30 to-background dark:from-emerald-950/5 dark:to-background rounded-3xl overflow-hidden shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-sm font-bold">Nutrition Summary</CardTitle>
                </div>
                <CardDescription className="text-xs">Your combined nutrition metrics from this cart.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-amber-50/40 dark:bg-amber-950/10 p-3 rounded-2xl border border-amber-100/30 flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 shrink-0">
                      <Flame className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold">Calories</p>
                      <p className="text-sm font-extrabold text-amber-900 dark:text-amber-300">{totalCalories} kcal</p>
                    </div>
                  </div>
                  <div className="bg-blue-50/40 dark:bg-blue-950/10 p-3 rounded-2xl border border-blue-100/30 flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 shrink-0">
                      <Dumbbell className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold">Protein</p>
                      <p className="text-sm font-extrabold text-blue-900 dark:text-blue-300">{totalProtein}g</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Carbs ({totalCarbs}g)</span>
                    <span className="text-muted-foreground">Fat ({totalFat}g)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                    <div 
                      className="bg-emerald-500 h-full" 
                      style={{ width: `${(totalCarbs / (totalCarbs + totalFat || 1)) * 100}%` }}
                    />
                    <div 
                      className="bg-amber-500 h-full" 
                      style={{ width: `${(totalFat / (totalCarbs + totalFat || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bill Details */}
            <Card className="border border-border/85 rounded-3xl overflow-hidden shadow-2xs">
              <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                <CardTitle className="text-sm font-bold">Bill Details</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Item Total</span>
                  <span className="font-semibold text-foreground">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery Partner Fee (Swiggy)</span>
                  <span className="font-semibold text-foreground">
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-600">FREE</span>
                    ) : (
                      `₹${deliveryFee}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Platform Fee</span>
                  <span className="font-semibold text-foreground">₹{platformFee}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Wellness Coupon Discount</span>
                  <span className="font-semibold text-emerald-600">-₹{discount}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Estimated GST & Restaurant Charges</span>
                  <span className="font-semibold text-foreground">₹{Math.round(subtotal * 0.05)}</span>
                </div>

                <Separator className="my-2 bg-border/40" />

                <div className="flex justify-between text-sm font-extrabold text-foreground pt-1">
                  <span>To Pay</span>
                  <span>₹{totalAmount}</span>
                </div>
              </CardContent>
            </Card>

            {/* Place Order & Demo Checkout */}
            <div className="space-y-3">
              <Button
                onClick={handlePlaceOrder}
                disabled={isPlacing}
                className="w-full py-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-600/10 transition-all hover-elevate"
              >
                {isPlacing ? "Placing Order..." : "Place Order"}
              </Button>

              <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/40 p-3.5 rounded-2xl text-[10px] text-amber-800 dark:text-amber-300/80 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Demo Checkout Flow</span>
                </div>
                <p className="leading-relaxed">
                  Payment integration is currently mock. Clicking "Place Order" will simulate a successful Swiggy delivery partner dispatch workflow.
                </p>
              </div>

              <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground text-center pt-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Powered by Swiggy commerce workflows</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
