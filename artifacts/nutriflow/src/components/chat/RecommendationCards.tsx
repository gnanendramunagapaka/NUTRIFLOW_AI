import React from "react";
import { Link } from "wouter";
import { Utensils, ShoppingBag, Compass, Star, Heart, Flame, Dumbbell, ShoppingCart, Plus, Check, ArrowRight } from "lucide-react";
import { AppCard, Pill, PrimaryButton, SecondaryButton } from "@/components/layout/primitives";
import { cn } from "@/lib/utils";

// ─── Food Recommendation Card ──────────────────────────────────────────────────

export interface FoodRecommendationData {
  mealTitle: string;
  cuisine?: string;
  price?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  healthScore?: number;
  reason?: string;
  groceryItems?: string[];
}

interface FoodRecommendationCardProps {
  data?: FoodRecommendationData;
  onAddToCart?: () => void;
  onAddIngredients?: (items: string[]) => void;
  isAddedToCart?: boolean;
  className?: string;
}

export function FoodRecommendationCard({
  data,
  onAddToCart,
  onAddIngredients,
  isAddedToCart = false,
  className,
}: FoodRecommendationCardProps) {
  if (!data) {
    return (
      <AppCard className={cn("p-4 border-dashed border-border/80 bg-muted/20 text-center space-y-2", className)}>
        <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center mx-auto">
          <Utensils className="h-4.5 w-4.5" />
        </div>
        <p className="text-xs font-semibold text-foreground">Food Recommendation</p>
        <p className="text-[11px] text-muted-foreground">
          Personalized meal recommendations powered by Swiggy Food will appear here.
        </p>
        <Link href="/discover">
          <SecondaryButton size="sm" className="text-xs mt-1">
            Browse Meals
          </SecondaryButton>
        </Link>
      </AppCard>
    );
  }

  return (
    <AppCard className={cn("overflow-hidden border-primary/20 shadow-xs space-y-3.5 p-4 sm:p-5", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Pill variant="success" className="text-[10px]">
              Meal Pick
            </Pill>
            {data.cuisine && (
              <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                {data.cuisine}
              </span>
            )}
            <span className="text-[10px] font-semibold text-[#FC8019] bg-orange-500/10 px-2 py-0.5 rounded-md">
              Swiggy Food
            </span>
          </div>
          <h4 className="text-sm sm:text-base font-bold text-foreground leading-snug truncate">
            {data.mealTitle}
          </h4>
        </div>

        {data.price !== undefined && (
          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 shrink-0">
            ₹{data.price}
          </span>
        )}
      </div>

      {/* Nutrition Summary Grid */}
      {(data.calories !== undefined || data.protein !== undefined) && (
        <div className="grid grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded-xl text-center text-xs">
          {data.calories !== undefined && (
            <div>
              <span className="text-[10px] text-muted-foreground block font-medium">Calories</span>
              <span className="font-bold text-foreground">{data.calories} kcal</span>
            </div>
          )}
          {data.protein !== undefined && (
            <div>
              <span className="text-[10px] text-muted-foreground block font-medium">Protein</span>
              <span className="font-bold text-foreground">{data.protein}g</span>
            </div>
          )}
        </div>
      )}

      {/* Reason / Context */}
      {data.reason && (
        <p className="text-xs text-muted-foreground italic bg-background/80 p-2.5 rounded-xl border border-border/60 leading-relaxed">
          "{data.reason}"
        </p>
      )}

      {/* Ingredients list if present */}
      {data.groceryItems && data.groceryItems.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Key Ingredients:
          </span>
          <div className="flex flex-wrap gap-1">
            {data.groceryItems.map((item, idx) => (
              <span
                key={idx}
                className="text-[10px] bg-muted/60 border border-border/60 text-foreground px-2 py-0.5 rounded-md"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Link href="/discover" className="flex-1">
          <SecondaryButton size="sm" className="w-full text-xs h-9">
            View Details
          </SecondaryButton>
        </Link>
        {onAddToCart && (
          <PrimaryButton
            size="sm"
            onClick={onAddToCart}
            disabled={isAddedToCart}
            className="flex-1 text-xs h-9 gap-1.5"
          >
            {isAddedToCart ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Added</span>
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

// ─── Grocery Recommendation Card ───────────────────────────────────────────────

export interface GroceryItemData {
  name: string;
  category?: string;
  quantity?: string;
  unit?: string;
  nutritionNote?: string;
  price?: number;
}

interface GroceryRecommendationCardProps {
  items?: GroceryItemData[];
  onAddPlanToCart?: () => void;
  isAddedToCart?: boolean;
  className?: string;
}

export function GroceryRecommendationCard({
  items,
  onAddPlanToCart,
  isAddedToCart = false,
  className,
}: GroceryRecommendationCardProps) {
  if (!items || items.length === 0) {
    return (
      <AppCard className={cn("p-4 border-dashed border-border/80 bg-muted/20 text-center space-y-2", className)}>
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
          <ShoppingBag className="h-4.5 w-4.5" />
        </div>
        <p className="text-xs font-semibold text-foreground">Smart Grocery Plan</p>
        <p className="text-[11px] text-muted-foreground">
          Curated Instamart pantry picks and meal-prep ingredient plans will appear here.
        </p>
        <Link href="/discover?domain=instamart">
          <SecondaryButton size="sm" className="text-xs mt-1">
            Open Grocery Hub
          </SecondaryButton>
        </Link>
      </AppCard>
    );
  }

  return (
    <AppCard className={cn("overflow-hidden border-emerald-500/20 shadow-xs space-y-3.5 p-4 sm:p-5", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill variant="success" className="text-[10px]">
            Grocery Plan
          </Pill>
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
            Swiggy Instamart
          </span>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">
          {items.length} items
        </span>
      </div>

      {/* Item Listing */}
      <ul className="space-y-2 divide-y divide-border/40 text-xs">
        {items.map((item, idx) => (
          <li key={idx} className="pt-2 first:pt-0 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="font-semibold text-foreground block truncate">{item.name}</span>
              {item.nutritionNote && (
                <span className="text-[10px] text-muted-foreground block">{item.nutritionNote}</span>
              )}
            </div>
            <span className="shrink-0 text-[10px] font-bold bg-muted px-2 py-0.5 rounded-md text-muted-foreground">
              {item.quantity || "1"} {item.unit || "pack"}
            </span>
          </li>
        ))}
      </ul>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        <Link href="/discover?domain=instamart" className="flex-1">
          <SecondaryButton size="sm" className="w-full text-xs h-9">
            View in Groceries
          </SecondaryButton>
        </Link>
        {onAddPlanToCart && (
          <PrimaryButton
            size="sm"
            onClick={onAddPlanToCart}
            disabled={isAddedToCart}
            className="flex-1 text-xs h-9 gap-1.5"
          >
            {isAddedToCart ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Plan Added</span>
              </>
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>Add All to Cart</span>
              </>
            )}
          </PrimaryButton>
        )}
      </div>
    </AppCard>
  );
}

// ─── Dineout Recommendation Card ───────────────────────────────────────────────

export interface DineoutRecommendationData {
  restaurantName: string;
  cuisine?: string;
  costForTwo?: number | string;
  rating?: number;
  highlight?: string;
  distance?: string;
}

interface DineoutRecommendationCardProps {
  data?: DineoutRecommendationData;
  className?: string;
}

export function DineoutRecommendationCard({
  data,
  className,
}: DineoutRecommendationCardProps) {
  if (!data) {
    return (
      <AppCard className={cn("p-4 border-dashed border-border/80 bg-muted/20 text-center space-y-2", className)}>
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
          <Compass className="h-4.5 w-4.5" />
        </div>
        <p className="text-xs font-semibold text-foreground">Dining Out Discovery</p>
        <p className="text-[11px] text-muted-foreground">
          Health-certified dining partner recommendations powered by Dineout will appear here.
        </p>
        <Link href="/discover">
          <SecondaryButton size="sm" className="text-xs mt-1">
            Explore Restaurants
          </SecondaryButton>
        </Link>
      </AppCard>
    );
  }

  return (
    <AppCard className={cn("overflow-hidden border-amber-500/20 shadow-xs space-y-3 p-4 sm:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Pill variant="warning" className="text-[10px]">
              Dineout Pick
            </Pill>
            {data.cuisine && (
              <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                {data.cuisine}
              </span>
            )}
          </div>
          <h4 className="text-sm sm:text-base font-bold text-foreground truncate">
            {data.restaurantName}
          </h4>
        </div>

        {data.rating !== undefined && (
          <div className="flex items-center gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md text-xs font-bold shrink-0">
            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
            <span>{data.rating}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
        {data.costForTwo && (
          <span>₹{data.costForTwo} for two</span>
        )}
        {data.distance && (
          <span>{data.distance}</span>
        )}
      </div>

      {data.highlight && (
        <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl leading-relaxed">
          {data.highlight}
        </p>
      )}

      <Link href="/discover" className="block pt-1">
        <SecondaryButton size="sm" className="w-full text-xs h-9 gap-1.5">
          <span>View Restaurant</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </SecondaryButton>
      </Link>
    </AppCard>
  );
}
