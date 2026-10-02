import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCart, useSwiggyAddresses, Address } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  ShoppingBag,
  Clock,
  CheckCircle,
  Coins,
  Utensils,
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Info,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { connectSwiggyAccount, getSwiggyConnectionStatus } from "@/lib/swiggyAuth";

export default function Checkout() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    mealItems,
    groceryItems,
    mealSubtotal,
    grocerySubtotal,
    addresses,
    selectedAddress,
    setSelectedAddress,
  } = useCart();

  const { data: liveAddresses, isLoading: isLoadingAddresses } = useSwiggyAddresses();
  const activeAddresses = liveAddresses && liveAddresses.length > 0 ? liveAddresses : addresses;

  // Determine initial domain from query param ?domain=grocery or ?domain=food
  const searchParams = new URLSearchParams(window.location.search);
  const domainParam = searchParams.get("domain");

  const [activeDomain, setActiveDomain] = useState<"food" | "grocery">(() => {
    if (domainParam === "grocery") return "grocery";
    if (domainParam === "food") return "food";
    if (mealItems.length > 0) return "food";
    if (groceryItems.length > 0) return "grocery";
    return "food";
  });

  const [swiggyConnected, setSwiggyConnected] = useState(false);
  const [isConnectingSwiggy, setIsConnectingSwiggy] = useState(false);
  const [showFoundationModal, setShowFoundationModal] = useState(false);

  useEffect(() => {
    getSwiggyConnectionStatus().then((status) => {
      setSwiggyConnected(status.connected);
    });
  }, []);

  const handleConnectSwiggy = async () => {
    setIsConnectingSwiggy(true);
    try {
      await connectSwiggyAccount("/checkout");
    } catch (err: any) {
      toast({
        title: "Connection Failed",
        description: err?.message || "Failed to initiate Swiggy connection",
        variant: "destructive",
      });
    } finally {
      setIsConnectingSwiggy(false);
    }
  };

  const isFood = activeDomain === "food";
  const currentItems = isFood ? mealItems : groceryItems;
  const currentSubtotal = isFood ? mealSubtotal : grocerySubtotal;

  // Real item totals only; fees and taxes are calculated at checkout
  const totalPayable = currentSubtotal;

  // Restaurant names for Food Checkout
  const restaurantNames = Array.from(
    new Set(mealItems.map((i) => i.cuisine || "Partner Kitchen"))
  );

  const handlePlaceOrderClick = () => {
    if (currentItems.length === 0) {
      toast({
        title: "Basket is empty",
        description: `Add ${isFood ? "food" : "grocery"} items before checking out.`,
        variant: "destructive",
      });
      return;
    }
    // Controlled Phase 1 notice only — NO fake transactions, NO fake orders
    setShowFoundationModal(true);
  };

  if (mealItems.length === 0 && groceryItems.length === 0) {
    return (
      <Layout>
        <div className="container max-w-lg mx-auto p-4 md:p-8 text-center space-y-6 min-h-[70vh] flex flex-col justify-center items-center">
          <div className="h-16 w-16 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight">Your Cart is Empty</h1>
            <p className="text-muted-foreground text-xs max-w-sm mx-auto leading-relaxed">
              Explore wholesome meals in Food Delivery or fresh groceries from Swiggy Instamart to proceed to checkout.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setLocation("/discover")}
              className="rounded-full bg-[#FC8019] hover:bg-[#E26E10] text-white px-5 text-xs font-semibold"
            >
              Explore Food Delivery
            </Button>
            <Button
              onClick={() => setLocation("/grocery")}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 text-xs font-semibold"
            >
              Explore Instamart
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-5xl mx-auto p-4 md:p-8 space-y-6 pb-24">
        {/* Back header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(isFood ? "/discover" : "/grocery")}
            className="rounded-full hover:bg-muted"
            aria-label="Back to explore"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {isFood ? "Food Delivery Checkout" : "Instamart Grocery Checkout"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Review your items, delivery address, and price breakdown.
            </p>
          </div>
        </div>

        {/* Domain Cart Toggle (if items exist in both or user wants to switch) */}
        {(mealItems.length > 0 || groceryItems.length > 0) && (
          <div className="flex items-center gap-2 p-1.5 bg-muted/50 rounded-2xl border border-border/60 max-w-md">
            <button
              type="button"
              onClick={() => setActiveDomain("food")}
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                isFood
                  ? "bg-background text-[#FC8019] shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Utensils className="h-3.5 w-3.5" />
              <span>Food Basket ({mealItems.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDomain("grocery")}
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                !isFood
                  ? "bg-background text-emerald-600 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Instamart Basket ({groceryItems.length})</span>
            </button>
          </div>
        )}

        {/* Swiggy Integration Banner */}
        <div className="bg-gradient-to-r from-orange-500/10 via-emerald-600/5 to-emerald-600/10 border border-emerald-100 dark:border-emerald-900/40 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center text-orange-600 shrink-0">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Swiggy {isFood ? "Food Delivery" : "Instamart"} Integration
              </h4>
              <p className="text-xs text-muted-foreground">
                {isFood
                  ? "Contactless delivery from verified kitchen partners."
                  : "Hyperlocal grocery fulfillment from Swiggy Instamart pods."}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-orange-700 bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300 px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto border border-orange-200/60 flex items-center gap-1">
            ⚡ Powered by Swiggy
          </span>
        </div>

        {currentItems.length === 0 ? (
          <Card className="p-8 text-center space-y-3 rounded-3xl border-border/80">
            <p className="font-bold text-foreground">
              No items in your {isFood ? "Food" : "Instamart"} Basket
            </p>
            <p className="text-xs text-muted-foreground">
              Switch to the other basket above or browse more items.
            </p>
            <Button
              onClick={() => setLocation(isFood ? "/discover" : "/grocery")}
              className={cn(
                "rounded-full text-white text-xs font-semibold px-5",
                isFood ? "bg-[#FC8019] hover:bg-[#E26E10]" : "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              Browse {isFood ? "Food Delivery" : "Instamart"}
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
            {/* Left Column — Address and Items */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Context Card */}
              {isFood && restaurantNames.length > 0 && (
                <Card className="border border-border/80 rounded-3xl overflow-hidden shadow-2xs">
                  <CardHeader className="bg-muted/15 pb-3 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-[#FC8019]" />
                      <CardTitle className="text-sm font-bold">Kitchen Context</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 text-xs space-y-1">
                    <p className="font-semibold text-foreground">
                      Fulfilling Kitchen(s): <span className="text-primary">{restaurantNames.join(", ")}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Preparation and dispatch handled via Swiggy Delivery Partner.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Delivery Address Section */}
              <Card className="border border-border/80 rounded-3xl overflow-hidden shadow-2xs">
                <CardHeader className="bg-muted/15 pb-4 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-emerald-600" />
                      <CardTitle className="text-base font-bold">Delivery Address</CardTitle>
                    </div>
                    <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-200/50 flex items-center gap-1">
                      ⚡ Swiggy Saved Address
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    Choose where you would like your {isFood ? "meal" : "groceries"} delivered.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    {activeAddresses.map((addr) => {
                      const isSelected = selectedAddress.id === addr.id;
                      const emoji =
                        addr.icon === "Home" ? "🏠" : addr.icon === "Briefcase" ? "💼" : "📍";
                      return (
                        <div
                          key={addr.id}
                          onClick={() => setSelectedAddress(addr)}
                          className={cn(
                            "p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-2",
                            isSelected
                              ? isFood
                                ? "border-[#FC8019] bg-orange-50/20 dark:bg-orange-950/10 shadow-xs"
                                : "border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-xs"
                              : "border-border hover:border-border/80 bg-background"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
                              <span>{emoji}</span> {addr.label}
                            </span>
                            {isSelected && (
                              <span
                                className={cn(
                                  "h-4 w-4 rounded-full flex items-center justify-center text-white shrink-0",
                                  isFood ? "bg-[#FC8019]" : "bg-emerald-600"
                                )}
                              >
                                <CheckCircle className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {addr.address}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Items summary */}
              <Card className="border border-border/80 rounded-3xl overflow-hidden shadow-2xs">
                <CardHeader className="bg-muted/15 pb-4 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-emerald-600" />
                    <CardTitle className="text-base font-bold">
                      Review Items ({currentItems.length})
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-border/40">
                  {currentItems.map((item) => (
                    <div
                      key={`${item.id}-${item.type}`}
                      className="flex gap-4 p-4 items-center"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-14 w-14 rounded-xl object-cover border border-border/40 shrink-0"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-xl bg-secondary/15 flex items-center justify-center text-muted-foreground shrink-0 border border-dashed border-border/60">
                          {item.type === "meal" ? (
                            <Utensils className="h-5 w-5 text-muted-foreground/60" />
                          ) : (
                            <ShoppingBag className="h-5 w-5 text-muted-foreground/60" />
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground leading-tight truncate">
                            {item.name}
                          </h4>
                          <span className="text-xs sm:text-sm font-bold text-foreground shrink-0">
                            ₹{item.price * item.quantity}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Qty: {item.quantity} × ₹{item.price} {item.unit ? `• ${item.unit}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right Column — Pricing Breakdown & Place Order Action */}
            <div className="space-y-6">
              {/* Delivery Estimate */}
              <Card className="border border-border/80 rounded-3xl overflow-hidden shadow-2xs">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-muted/60 flex items-center justify-center shrink-0 text-foreground">
                    <Clock className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      Delivery Estimate
                    </p>
                    <p className="text-xs font-bold text-foreground">
                      Delivery estimate shown at checkout
                    </p>
                  </div>
                  <div className="ml-auto text-[10px] text-emerald-600 bg-emerald-100/50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full font-semibold">
                    ⚡ Swiggy Fulfilled
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
                    <span className="font-semibold text-foreground">Item Subtotal</span>
                    <span className="font-bold text-foreground">₹{currentSubtotal}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery/handling charges</span>
                    <span className="text-muted-foreground font-medium">Calculated at checkout</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxes and applicable fees</span>
                    <span className="text-muted-foreground font-medium">Calculated at checkout</span>
                  </div>

                  <Separator className="my-2 bg-border/40" />

                  <div className="flex justify-between text-sm font-extrabold text-foreground pt-1">
                    <span>Item Total</span>
                    <span>₹{currentSubtotal}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    Delivery charges, handling fees, and taxes are calculated at checkout.
                  </p>
                </CardContent>
              </Card>

              {/* Controlled Place Order Action */}
              <div className="space-y-3">
                <Button
                  onClick={handlePlaceOrderClick}
                  className={cn(
                    "w-full py-6 rounded-2xl text-white font-bold text-base shadow-lg transition-all cursor-pointer",
                    isFood
                      ? "bg-[#FC8019] hover:bg-[#E26E10] shadow-orange-500/10"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10"
                  )}
                >
                  Place Order (₹{currentSubtotal})
                </Button>

                <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/70 text-[11px] text-muted-foreground flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Checkout foundation preview. Real transaction processing, Swiggy order API, and payment gateway integration will be connected in the transaction phase.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground text-center pt-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Powered by Swiggy commerce workflows</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controlled Phase 1 Checkout Modal */}
      <Dialog open={showFoundationModal} onOpenChange={setShowFoundationModal}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            {isFood ? <Utensils className="h-6 w-6" /> : <ShoppingBag className="h-6 w-6" />}
          </div>

          <DialogHeader className="text-center sm:text-center space-y-1.5">
            <DialogTitle className="text-lg font-bold text-foreground">
              Checkout Foundation Complete
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Checkout foundation complete. Real order placement will be connected in the transaction phase.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/40 p-3.5 rounded-2xl text-xs space-y-1.5 text-left border border-border/60">
            <div className="flex justify-between font-semibold">
              <span className="text-muted-foreground">Domain:</span>
              <span className="text-foreground capitalize">{activeDomain} Basket</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-muted-foreground">Items:</span>
              <span className="text-foreground">{currentItems.length} items</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-muted-foreground">Delivery To:</span>
              <span className="text-foreground truncate max-w-[200px]">{selectedAddress.label} - {selectedAddress.address}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-muted-foreground">Item Subtotal:</span>
              <span className="text-foreground font-bold">₹{currentSubtotal}</span>
            </div>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              onClick={() => setShowFoundationModal(false)}
              className={cn(
                "rounded-xl px-6 text-white font-semibold text-xs",
                isFood ? "bg-[#FC8019] hover:bg-[#E26E10]" : "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
