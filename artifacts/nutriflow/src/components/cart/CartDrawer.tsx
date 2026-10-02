import { useState } from "react";
import { useLocation } from "wouter";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/use-cart";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ShieldCheck,
  Clock,
  Utensils,
  Store,
  Info,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function CartDrawer() {
  const [, setLocation] = useLocation();
  const [selectedDomain, setSelectedDomain] = useState<"meal" | "grocery">("meal");
  const {
    items,
    mealItems,
    groceryItems,
    mealSubtotal,
    grocerySubtotal,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    clearDomainCart,
    deliveryEstimate,
    itemCount,
  } = useCart();

  // Distinct sets
  const isMealTab = selectedDomain === "meal";
  const displayedItems = isMealTab ? mealItems : groceryItems;
  const displayedSubtotal = isMealTab ? mealSubtotal : grocerySubtotal;

  // Restaurant grouping for food items
  const restaurantNames = Array.from(
    new Set(mealItems.map((i) => i.cuisine || "Partner Kitchen"))
  );
  const hasMultipleRestaurants = restaurantNames.length > 1;

  const handleCheckout = () => {
    setIsCartOpen(false);
    setLocation(`/checkout?domain=${selectedDomain}`);
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full p-0 gap-0 border-l border-border/80 shadow-2xl bg-background">
        <div className="p-5 border-b border-border/40 bg-background space-y-3">
          <SheetHeader className="text-left">
            <div className="flex items-center gap-2 text-primary font-bold mb-0.5">
              <ShoppingBag className="h-5 w-5" />
              <span>Wellness Basket</span>
              <span className="ml-auto text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                {itemCount} {itemCount === 1 ? "item" : "items"} total
              </span>
            </div>
            <SheetTitle className="text-lg font-extrabold tracking-tight">
              Separate Swiggy Baskets
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
              <span>Fulfilled via Swiggy Delivery & Instamart</span>
            </SheetDescription>
          </SheetHeader>

          {/* Explicit Domain Separation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedDomain("meal")}
              className={cn(
                "flex-1 py-2 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1.5",
                isMealTab
                  ? "bg-background text-[#FC8019] shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Utensils className="h-3.5 w-3.5" />
              <span>Food Basket ({mealItems.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedDomain("grocery")}
              className={cn(
                "flex-1 py-2 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1.5",
                !isMealTab
                  ? "bg-background text-emerald-600 shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Instamart ({groceryItems.length})</span>
            </button>
          </div>
        </div>

        {/* Informative Multi-Restaurant Banner for Food Basket */}
        {isMealTab && hasMultipleRestaurants && mealItems.length > 0 && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Items from different kitchens (<span className="font-semibold">{restaurantNames.join(", ")}</span>) are prepared by their respective restaurants.
            </p>
          </div>
        )}

        {displayedItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground">
              {isMealTab ? <Utensils className="h-8 w-8" /> : <ShoppingBag className="h-8 w-8" />}
            </div>
            <div>
              <p className="font-bold text-foreground text-lg">
                Your {isMealTab ? "Food" : "Instamart"} Basket is empty
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto">
                {isMealTab
                  ? "Discover nutritious meals from certified healthy restaurant kitchens."
                  : "Explore fresh produce, staples, and groceries from Swiggy Instamart."}
              </p>
            </div>
            <Button
              onClick={() => {
                setIsCartOpen(false);
                setLocation(isMealTab ? "/discover" : "/grocery");
              }}
              className={cn(
                "rounded-full text-white font-medium text-xs px-5",
                isMealTab ? "bg-[#FC8019] hover:bg-[#E26E10]" : "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {isMealTab ? "Browse Food Delivery" : "Browse Instamart Groceries"}
            </Button>
          </div>
        ) : (
          <>
            {/* Scrollable list of items for active domain basket */}
            <ScrollArea className="flex-1 px-5 py-3">
              <div className="space-y-3">
                {displayedItems.map((item) => (
                  <div
                    key={`${item.id}-${item.type}`}
                    className="flex gap-3.5 p-3 bg-muted/30 hover:bg-muted/50 rounded-2xl border border-border/40 transition-all"
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-16 w-16 rounded-xl object-cover border border-border/40 shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-xl bg-secondary/15 flex items-center justify-center text-muted-foreground shrink-0 border border-dashed border-border/60">
                        {item.type === "meal" ? (
                          <Utensils className="h-5 w-5 text-muted-foreground/60" />
                        ) : (
                          <ShoppingBag className="h-5 w-5 text-muted-foreground/60" />
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground leading-tight truncate">
                            {item.name}
                          </h4>
                          <span className="text-xs sm:text-sm font-extrabold text-foreground shrink-0 ml-1">
                            ₹{item.price * item.quantity}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          ₹{item.price} each {item.unit ? `• ${item.unit}` : ""} {item.cuisine ? `• ${item.cuisine}` : ""}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-2 pt-1">
                        <div className="flex items-center border border-border/80 rounded-lg bg-background p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2 text-xs font-bold w-6 text-center text-foreground">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors cursor-pointer"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Footer Summary & Separate Checkout Action */}
            <div className="p-5 border-t border-border/40 bg-background space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-foreground">
                  <span className="font-semibold">{isMealTab ? "Food Items Subtotal" : "Instamart Items Subtotal"}</span>
                  <span className="font-bold text-foreground">₹{displayedSubtotal}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Delivery/handling charges</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Taxes and applicable fees</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>

              <Separator className="bg-border/40" />

              <div className="space-y-2">
                <Button
                  onClick={handleCheckout}
                  className={cn(
                    "w-full py-5 rounded-2xl text-white font-bold flex justify-between px-5 shadow-md transition-all cursor-pointer",
                    isMealTab
                      ? "bg-[#FC8019] hover:bg-[#E26E10] shadow-orange-500/10"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10"
                  )}
                >
                  <span className="flex flex-col items-start leading-none gap-0.5">
                    <span className="text-[10px] text-white/80 uppercase font-semibold tracking-wider">
                      {isMealTab ? "Food Checkout" : "Grocery Checkout"}
                    </span>
                    <span className="text-sm font-extrabold">
                      Item Total: ₹{displayedSubtotal}
                    </span>
                  </span>
                  <span className="text-xs font-bold flex items-center gap-1 bg-white/15 px-3 py-1.5 rounded-xl">
                    <span>Continue</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Button>

                <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground text-center">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>⚡ Powered by Swiggy • Dineout bookings are separate</span>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
