import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Star,
  Clock,
  MapPin,
  ShoppingCart,
  Plus,
  Check,
  Search,
  Store,
  X,
} from "lucide-react";
import { RestaurantItemData } from "./RestaurantCard";
import { FoodItemData } from "./FoodItemCard";
import { PrimaryButton, SecondaryButton, Pill } from "@/components/layout/primitives";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";

import { FoodItemDetailSheet } from "./FoodItemDetailSheet";

interface RestaurantDetailSheetProps {
  restaurant: RestaurantItemData | null;
  isOpen: boolean;
  onClose: () => void;
  menuItems: FoodItemData[];
  isLoadingMenu?: boolean;
}

export function RestaurantDetailSheet({
  restaurant,
  isOpen,
  onClose,
  menuItems,
  isLoadingMenu = false,
}: RestaurantDetailSheetProps) {
  const { addToCart, setIsCartOpen } = useCart();
  const { toast } = useToast();
  const [filterVegOnly, setFilterVegOnly] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<FoodItemData | null>(null);

  if (!restaurant) return null;

  const handleAddItem = (item: FoodItemData, qty: number = 1) => {
    addToCart({
      id: `food-item-${item.id}`,
      name: item.name,
      price: item.price,
      type: "meal",
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      healthScore: item.healthScore,
      imageUrl: item.imageUrl || undefined,
      cuisine: item.cuisine || restaurant.cuisine,
      description: item.description,
    }, qty);

    setAddedItemIds((prev) => ({ ...prev, [String(item.id)]: true }));
    toast({
      title: "Added to Basket 🛒",
      description: `"${item.name}" (${qty}x) added from ${restaurant.name}.`,
    });
    setIsCartOpen(true);
  };

  // Filter menu items by search and veg toggle
  const filteredItems = menuItems.filter((item) => {
    const isVeg = item.isVegetarian !== undefined
      ? item.isVegetarian
      : !item.name.toLowerCase().includes("chicken") &&
        !item.name.toLowerCase().includes("mutton") &&
        !item.name.toLowerCase().includes("fish") &&
        !item.name.toLowerCase().includes("prawn");

    if (filterVegOnly && !isVeg) return false;
    if (menuSearch.trim()) {
      const q = menuSearch.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 flex flex-col bg-background"
      >
        {/* Header Banner */}
        <div className="relative aspect-[16/9] bg-muted shrink-0 overflow-hidden">
          {restaurant.imageUrl ? (
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-muted/60 text-muted-foreground">
              <Store className="h-8 w-8 text-muted-foreground/60 mb-1" />
              <span className="text-xs font-semibold">{restaurant.name}</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
            aria-label="Close restaurant details"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Banner Details */}
          <div className="absolute bottom-3 left-4 right-4 text-white space-y-1">
            <span className="text-[10px] font-bold text-white bg-orange-600/90 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
              ⚡ Powered by Swiggy
            </span>
            <SheetTitle className="text-lg sm:text-xl font-extrabold text-white leading-tight">
              {restaurant.name}
            </SheetTitle>
            {restaurant.cuisine ? (
              <p className="text-xs text-white/80">{restaurant.cuisine}</p>
            ) : null}
          </div>
        </div>

        {/* Restaurant Quick Stats Bar */}
        <div className="px-4 py-2.5 border-b border-border/70 bg-card flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-3">
            {restaurant.rating !== undefined && (
              <span className="flex items-center gap-1 font-bold text-foreground">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                <span>{restaurant.rating}</span>
              </span>
            )}
            {restaurant.deliveryTime && (
              <span className="flex items-center gap-1 font-medium">
                <Clock className="h-3.5 w-3.5" />
                <span>{restaurant.deliveryTime}</span>
              </span>
            )}
          </div>

          <div>
            {restaurant.costForTwo ? (
              <span className="font-semibold text-foreground">
                ₹{restaurant.costForTwo} for two
              </span>
            ) : (
              <span className="font-semibold text-foreground">Available</span>
            )}
          </div>
        </div>

        {/* Menu Search & Filter Strip */}
        <div className="p-3 border-b border-border/70 bg-background flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              placeholder="Search in menu..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-muted/50 border border-border/70 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            type="button"
            onClick={() => setFilterVegOnly(!filterVegOnly)}
            className={cn(
              "px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0",
              filterVegOnly
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                : "bg-card border-border/80 text-muted-foreground hover:bg-muted"
            )}
          >
            <div className="w-2.5 h-2.5 border border-emerald-600 flex items-center justify-center rounded-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            </div>
            <span>Veg</span>
          </button>
        </div>

        {/* Menu Listing */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3 pb-8">
            <div className="flex items-center justify-between pb-1">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Menu Items ({filteredItems.length})
              </h4>
            </div>

            {isLoadingMenu ? (
              <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <span>Loading restaurant menu...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border/80 p-4">
                <p className="font-semibold text-foreground">No dishes matching filter</p>
                <p className="mt-1">Try resetting the veg filter or search keyword.</p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isVeg = item.isVegetarian !== undefined
                  ? item.isVegetarian
                  : !item.name.toLowerCase().includes("chicken") &&
                    !item.name.toLowerCase().includes("mutton") &&
                    !item.name.toLowerCase().includes("fish");
                const isAdded = !!addedItemIds[String(item.id)];

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl border border-border/70 bg-card hover:border-primary/40 transition-all flex items-start justify-between gap-3 shadow-2xs"
                  >
                    <div 
                      onClick={() => setSelectedItemForDetail(item)}
                      className="space-y-1 min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className={cn(
                            "w-3 h-3 border flex items-center justify-center rounded-xs shrink-0",
                            isVeg ? "border-emerald-600" : "border-rose-600"
                          )}
                        >
                          <div
                            className={cn(
                              "w-1 h-1 rounded-full",
                              isVeg ? "bg-emerald-600" : "bg-rose-600"
                            )}
                          />
                        </div>
                        <h5 className="text-xs sm:text-sm font-bold text-foreground leading-snug truncate hover:text-primary transition-colors">
                          {item.name}
                        </h5>
                      </div>

                      {item.price > 0 && (
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 block">
                          ₹{item.price}
                        </span>
                      )}

                      {item.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      {/* Display source nutrition data if present */}
                      {(item.calories !== undefined || item.protein !== undefined) && (
                        <div className="flex items-center gap-2 pt-1 text-[10px] text-muted-foreground">
                          {item.calories !== undefined && (
                            <span className="bg-muted px-1.5 py-0.5 rounded font-medium">
                              {item.calories} kcal
                            </span>
                          )}
                          {item.protein !== undefined && (
                            <span className="bg-muted px-1.5 py-0.5 rounded font-medium">
                              {item.protein}g protein
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Image & Add Button container */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      {item.imageUrl && (
                        <div
                          onClick={() => setSelectedItemForDetail(item)}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-muted border border-border/60 cursor-pointer"
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {/* Add Button */}
                      <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddItem(item);
                        }}
                        disabled={isAdded}
                        className={cn(
                          "h-8 px-3 text-xs font-semibold rounded-xl shrink-0 gap-1",
                          isAdded
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary hover:bg-primary/90 text-primary-foreground"
                        )}
                      >
                        {isAdded ? (
                          <>
                            <Check className="h-3 w-3" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3" />
                            <span>Add</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Nested Food Item Detail Sheet */}
        <FoodItemDetailSheet
          item={selectedItemForDetail}
          isOpen={!!selectedItemForDetail}
          onClose={() => setSelectedItemForDetail(null)}
          onAddToCart={(item, qty) => handleAddItem(item, qty)}
          isAddedToCart={selectedItemForDetail ? !!addedItemIds[String(selectedItemForDetail.id)] : false}
        />
      </SheetContent>
    </Sheet>
  );
}
