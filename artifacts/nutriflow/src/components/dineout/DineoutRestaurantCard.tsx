import React from "react";
import { Star, Clock, MapPin, Tag, UtensilsCrossed } from "lucide-react";
import { AppCard, Pill } from "@/components/layout/primitives";
import { cn } from "@/lib/utils";

export interface DineoutRestaurantData {
  id: string | number;
  name: string;
  cuisine: string;
  rating?: number;
  costForTwo?: number | string;
  locality?: string;
  distance?: string;
  timings?: string;
  offerText?: string;
  imageUrl?: string;
  isOpen?: boolean;
}

interface DineoutRestaurantCardProps {
  restaurant: DineoutRestaurantData;
  onClick?: () => void;
  className?: string;
}

export function DineoutRestaurantCard({
  restaurant,
  onClick,
  className,
}: DineoutRestaurantCardProps) {
  return (
    <AppCard
      onClick={onClick}
      className={cn(
        "overflow-hidden cursor-pointer group hover:border-amber-500/40 hover:shadow-md transition-all flex flex-col justify-between",
        className
      )}
    >
      {/* Restaurant Image */}
      <div className="aspect-[16/10] bg-muted relative overflow-hidden">
        {restaurant.imageUrl ? (
          <img
            src={restaurant.imageUrl}
            alt={restaurant.name}
            className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-muted/60 text-muted-foreground p-3 text-center">
            <UtensilsCrossed className="h-6 w-6 text-muted-foreground/60 mb-1" />
            <span className="text-xs font-semibold">{restaurant.name}</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md flex items-center gap-1">
            ⚡ Powered by Swiggy Dineout
          </span>

          {restaurant.rating !== undefined && (
            <div className="bg-background/95 backdrop-blur-xs text-foreground px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 shadow-2xs">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              <span>{restaurant.rating}</span>
            </div>
          )}
        </div>

        {/* Offer Tag */}
        {restaurant.offerText && (
          <div className="absolute bottom-2 left-2 bg-amber-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
            <Tag className="h-2.5 w-2.5" />
            <span>{restaurant.offerText}</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-3.5 sm:p-4 space-y-2 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug truncate group-hover:text-amber-600 transition-colors">
              {restaurant.name}
            </h3>
          </div>
          {restaurant.cuisine ? (
            <p className="text-xs text-muted-foreground truncate">
              {restaurant.cuisine}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5 pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
          <div className="flex items-center justify-between">
            {restaurant.costForTwo != null && Number(restaurant.costForTwo) > 0 ? (
              <span className="font-semibold text-foreground/90">
                ₹{restaurant.costForTwo} for two
              </span>
            ) : null}
            {restaurant.locality && (
              <span className="flex items-center gap-0.5 truncate max-w-[130px]">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{restaurant.locality}</span>
              </span>
            )}
          </div>

          {restaurant.timings && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              <span>{restaurant.timings}</span>
            </div>
          )}
        </div>
      </div>
    </AppCard>
  );
}
