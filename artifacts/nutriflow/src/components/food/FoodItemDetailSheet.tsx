import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ShoppingCart, Check, Utensils, X, Plus, Minus, Flame, Dumbbell } from "lucide-react";
import { FoodItemData } from "./FoodItemCard";
import { PrimaryButton } from "@/components/layout/primitives";
import { cn } from "@/lib/utils";

interface FoodItemDetailSheetProps {
  item: FoodItemData | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: FoodItemData, quantity: number) => void;
  isAddedToCart?: boolean;
}

export function FoodItemDetailSheet({
  item,
  isOpen,
  onClose,
  onAddToCart,
  isAddedToCart = false,
}: FoodItemDetailSheetProps) {
  const [quantity, setQuantity] = useState(1);

  if (!item) return null;

  const isVeg = item.isVegetarian !== undefined
    ? item.isVegetarian
    : !item.name.toLowerCase().includes("chicken") &&
      !item.name.toLowerCase().includes("mutton") &&
      !item.name.toLowerCase().includes("fish") &&
      !item.name.toLowerCase().includes("prawn");

  const handleAdd = () => {
    onAddToCart(item, quantity);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-background"
      >
        {/* Item Image */}
        <div className="relative aspect-[16/10] bg-muted shrink-0 overflow-hidden">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-muted/60 text-muted-foreground">
              <Utensils className="h-10 w-10 text-muted-foreground/60 mb-2" />
              <span className="text-xs font-semibold">{item.name}</span>
            </div>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
            aria-label="Close dish details"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Attribution Tag */}
          <div className="absolute bottom-3 left-4">
            <span className="text-[10px] font-bold text-white bg-orange-600/90 px-2.5 py-0.5 rounded-md inline-flex items-center gap-1 shadow-xs">
              ⚡ Powered by Swiggy
            </span>
          </div>
        </div>

        {/* Item Info */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto text-left">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {/* Veg / Non-Veg Indicator */}
              <div
                className={cn(
                  "w-3.5 h-3.5 border flex items-center justify-center rounded-xs shrink-0",
                  isVeg ? "border-emerald-600" : "border-rose-600"
                )}
                title={isVeg ? "Vegetarian" : "Non-Vegetarian"}
              >
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isVeg ? "bg-emerald-600" : "bg-rose-600"
                  )}
                />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                {isVeg ? "Vegetarian" : "Non-Vegetarian"}
              </span>
              {item.cuisine && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{item.cuisine}</span>
                </>
              )}
            </div>

            <SheetTitle className="text-base sm:text-lg font-bold text-foreground leading-snug">
              {item.name}
            </SheetTitle>

            {item.restaurantName && (
              <p className="text-xs font-medium text-muted-foreground">
                From: <span className="text-foreground font-semibold">{item.restaurantName}</span>
              </p>
            )}
          </div>

          {/* Pricing Box */}
          <div className="bg-muted/40 p-3.5 rounded-2xl flex items-baseline justify-between border border-border/60">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                ₹{item.price}
              </span>
              <span className="text-xs text-muted-foreground">per serving</span>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              Total: <span className="font-bold text-foreground">₹{item.price * quantity}</span>
            </span>
          </div>

          {/* Real Nutrition values ONLY if provided by source data */}
          {(item.calories !== undefined || item.protein !== undefined || item.carbs !== undefined || item.fat !== undefined) && (
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide block">
                Nutritional Information (Source Verified)
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {item.calories !== undefined && (
                  <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/40 flex items-center gap-2">
                    <Flame className="h-4 w-4 text-amber-600" />
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Calories</span>
                      <span className="font-bold text-foreground">{item.calories} kcal</span>
                    </div>
                  </div>
                )}
                {item.protein !== undefined && (
                  <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/40 flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-blue-600" />
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Protein</span>
                      <span className="font-bold text-foreground">{item.protein}g</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {item.description && (
            <div className="space-y-1 pt-2 border-t border-border/50 text-xs">
              <span className="font-bold text-foreground block">Description</span>
              <p className="text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          )}

          {/* Quantity selector */}
          <div className="pt-2 flex items-center justify-between border-t border-border/50">
            <span className="text-xs font-bold text-foreground">Quantity</span>
            <div className="flex items-center border border-border/80 rounded-xl bg-background p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="px-3 text-xs font-bold w-8 text-center text-foreground">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Increase quantity"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-border/70 bg-background/95 backdrop-blur-xs">
          <PrimaryButton
            onClick={handleAdd}
            disabled={isAddedToCart}
            className="w-full h-11 text-xs font-bold gap-2"
          >
            {isAddedToCart ? (
              <>
                <Check className="h-4 w-4" />
                <span>Added to Food Basket</span>
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                <span>Add {quantity} to Food Basket (₹{item.price * quantity})</span>
              </>
            )}
          </PrimaryButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
