import { useLocation } from "wouter";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/use-cart";
import { Plus, Minus, Trash2, ShoppingBag, Flame, Dumbbell, Activity, ShieldCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function CartDrawer() {
  const [, setLocation] = useLocation();
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    subtotal,
    totalCalories,
    totalProtein,
    deliveryEstimate,
    itemCount,
  } = useCart();

  const handleCheckout = () => {
    setIsCartOpen(false);
    setLocation("/checkout");
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full p-0 gap-0 border-l border-border/80 shadow-2xl">
        <div className="p-6 border-b border-border/40 bg-background">
          <SheetHeader className="text-left">
            <div className="flex items-center gap-2 text-primary font-bold mb-1">
              <ShoppingBag className="h-5 w-5" />
              <span>Wellness Cart</span>
              <span className="ml-auto text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>
            <SheetTitle className="text-xl font-extrabold tracking-tight">Your Health Order</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
              Delivery in <span className="font-bold text-foreground">{deliveryEstimate}</span>
              <span className="mx-1">•</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-sm">Fulfilled via Swiggy</span>
            </SheetDescription>
          </SheetHeader>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground animate-pulse">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <div>
              <p className="font-bold text-foreground text-lg">Your cart is empty</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-[240px] mx-auto">
                Add AI suggested meals or groceries to power up your nutrition plan.
              </p>
            </div>
            <Button
              onClick={() => {
                setIsCartOpen(false);
                setLocation("/discover");
              }}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              Discover Healthy Meals
            </Button>
          </div>
        ) : (
          <>
            {/* Scrollable list of items */}
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={`${item.id}-${item.type}`} className="flex gap-4 p-3 bg-muted/30 hover:bg-muted/50 rounded-2xl border border-border/20 transition-all">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-20 w-20 rounded-xl object-cover border border-border/40 shrink-0"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-xl bg-secondary/15 flex items-center justify-center text-muted-foreground shrink-0 border border-dashed border-border/60">
                        <span className="text-[10px] font-bold uppercase text-foreground/45">
                          {item.type === 'meal' ? 'Meal' : 'Grocery'}
                        </span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-sm font-bold text-foreground leading-tight truncate">{item.name}</h4>
                          <span className="text-sm font-extrabold text-foreground shrink-0 ml-1">
                            ₹{item.price * item.quantity}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {item.cuisine || item.category || (item.type === 'meal' ? 'Healthy Meal' : 'Fresh Grocery')}
                        </p>
                        
                        {/* Macros / Nutrition tags */}
                        {(item.calories || item.protein) && (
                          <div className="flex items-center gap-2 mt-1.5">
                            {item.calories && (
                              <span className="text-[10px] bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Flame className="h-2.5 w-2.5" /> {item.calories} kcal
                              </span>
                            )}
                            {item.protein && (
                              <span className="text-[10px] bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Dumbbell className="h-2.5 w-2.5" /> {item.protein}g P
                              </span>
                            )}
                            {item.healthScore && (
                              <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Activity className="h-2.5 w-2.5" /> {item.healthScore} HS
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-2.5 pt-1">
                        <div className="flex items-center border border-border/80 rounded-lg bg-background p-0.5 shadow-2xs">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2 text-xs font-bold w-6 text-center text-foreground">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Footer Summary & Checkout */}
            <div className="p-6 border-t border-border/40 bg-background space-y-4">
              {/* Nutrition Total Banner */}
              <div className="bg-emerald-50/60 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/40 p-3.5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h5 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Total Nutrition Added</h5>
                    <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">Updating your Apple Health daily budget</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-extrabold text-foreground">{totalCalories} kcal</p>
                  <p className="text-[10px] text-muted-foreground font-semibold">{totalProtein}g Protein</p>
                </div>
              </div>

              {/* Subtotal Details */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Estimated GST & Packaging</span>
                  <span className="font-medium text-foreground">₹{Math.round(subtotal * 0.05)}</span>
                </div>
              </div>

              <Separator className="bg-border/40" />

              <div className="space-y-3">
                <Button
                  onClick={handleCheckout}
                  className="w-full py-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex justify-between px-6 shadow-md shadow-emerald-600/10 hover-elevate transition-all"
                >
                  <span className="flex flex-col items-start leading-none gap-0.5">
                    <span className="text-xs text-white/70 font-semibold uppercase tracking-wider">Checkout</span>
                    <span className="text-base font-extrabold">₹{Math.round(subtotal * 1.05)}</span>
                  </span>
                  <span className="text-sm font-bold flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                    Proceed
                  </span>
                </Button>
                
                <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground text-center">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Swiggy commerce workflow integration enabled.</span>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
