import React from "react";
import { ShoppingCart, Heart, Plus, Check, Utensils } from "lucide-react";
import { AppCard, PrimaryButton } from "@/components/layout/primitives";
import { cn } from "@/lib/utils";

export interface FoodItemData {
  id: string | number;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string | null;
  restaurantName?: string;
  isVegetarian?: boolean;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  healthScore?: number;
  cuisine?: string;
}

interface FoodItemCardProps {
  item: FoodItemData;
  onAddToCart?: () => void;
  onSelect?: (item: FoodItemData) => void;
  onToggleSave?: () => void;
  isSaved?: boolean;
  isAddedToCart?: boolean;
  className?: string;
}

export function FoodItemCard({
  item,
  onAddToCart,
  onSelect,
  onToggleSave,
  isSaved = false,
  isAddedToCart = false,
  className,
}: FoodItemCardProps) {
  // Infer veg indicator if tag or field exists
  const isVeg = item.isVegetarian !== undefined
    ? item.isVegetarian
    : !item.name.toLowerCase().includes("chicken") &&
      !item.name.toLowerCase().includes("mutton") &&
      !item.name.toLowerCase().includes("fish") &&
      !item.name.toLowerCase().includes("prawn");

  return (
    <AppCard
      className={cn(
        "overflow-hidden group hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between",
        className
      )}
    >
      {/* Food Image */}
      <div 
        onClick={() => onSelect?.(item)}
        className={cn(
          "aspect-[16/10] bg-muted relative overflow-hidden",
          onSelect && "cursor-pointer"
        )}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-muted/60 text-muted-foreground p-3 text-center">
            <Utensils className="h-6 w-6 text-muted-foreground/40 mb-1" />
            <span className="text-xs font-semibold">{item.name}</span>
          </div>
        )}

        {/* Veg / Non-Veg Indicator Badge */}
        <div className="absolute top-2.5 left-2.5 bg-background/95 backdrop-blur-xs p-1 rounded-md shadow-2xs">
          <div
            className={cn(
              "w-3.5 h-3.5 border flex items-center justify-center rounded-xs",
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
        </div>

        {/* Bookmark Heart Button */}
        {onToggleSave && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave();
            }}
            className={cn(
              "absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md transition-transform shadow-xs hover:scale-110 cursor-pointer",
              isSaved
                ? "bg-rose-500 text-white"
                : "bg-background/90 text-muted-foreground hover:text-rose-500"
            )}
            aria-label={isSaved ? "Remove from bookmarks" : "Bookmark dish"}
          >
            <Heart className={cn("h-3.5 w-3.5", isSaved && "fill-current")} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 sm:p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          {item.restaurantName && (
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block truncate">
              {item.restaurantName}
            </span>
          )}
          <div 
            onClick={() => onSelect?.(item)}
            className={cn("flex items-start justify-between gap-2", onSelect && "cursor-pointer")}
          >
            <h4 className="text-sm font-bold text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">
              {item.name}
            </h4>
            {item.price > 0 && (
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                ₹{item.price}
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Real Nutrition values ONLY if provided by source data */}
        {(item.calories !== undefined || item.protein !== undefined) && (
          <div className="grid grid-cols-2 gap-2 text-center text-xs bg-muted/40 p-2 rounded-xl">
            {item.calories !== undefined && (
              <div>
                <span className="text-[9px] text-muted-foreground uppercase font-semibold block">
                  Calories
                </span>
                <span className="font-bold text-foreground">{item.calories} kcal</span>
              </div>
            )}
            {item.protein !== undefined && (
              <div>
                <span className="text-[9px] text-muted-foreground uppercase font-semibold block">
                  Protein
                </span>
                <span className="font-bold text-foreground">{item.protein}g</span>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        {onAddToCart && (
          <PrimaryButton
            size="sm"
            onClick={onAddToCart}
            disabled={isAddedToCart}
            className="w-full h-9 text-xs font-semibold gap-1.5"
          >
            {isAddedToCart ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Added to Basket</span>
              </>
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>Add to Basket</span>
              </>
            )}
          </PrimaryButton>
        )}
      </div>
    </AppCard>
  );
}
