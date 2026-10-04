import React from "react";
import { Star, Clock, MapPin, Store } from "lucide-react";
import { AppCard, Pill } from "@/components/layout/primitives";
import { cn } from "@/lib/utils";

export interface RestaurantItemData {
  id: string | number;
  name: string;
  cuisine?: string;
  rating?: number;
  deliveryTime?: string;
  costForTwo?: number | string;
  distance?: string;
  imageUrl?: string | null;
  isOpen?: boolean;
  tags?: string[];
}

interface RestaurantCardProps {
  restaurant: RestaurantItemData;
  onClick?: () => void;
  className?: string;
}

export function RestaurantCard({
  restaurant,
  onClick,
  className,
}: RestaurantCardProps) {
  return (
    <AppCard
      onClick={onClick}
      className={cn(
        "overflow-hidden cursor-pointer group hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between",
        className
      )}
    >
      {/* Restaurant Image / Header */}
      <div className="aspect-[16/10] bg-muted relative overflow-hidden">
        {restaurant.imageUrl ? (
          <img
            src={restaurant.imageUrl}
            alt={restaurant.name}
            className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-muted/60 text-muted-foreground gap-1.5 p-4 text-center">
            <Store className="h-7 w-7 text-muted-foreground/40" />
            <span className="text-xs font-medium">{restaurant.name}</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md flex items-center gap-1">
            ⚡ Powered by Swiggy
          </span>

          {restaurant.rating !== undefined && (
            <div className="bg-background/95 backdrop-blur-xs text-foreground px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 shadow-2xs">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              <span>{restaurant.rating}</span>
            </div>
          )}
        </div>

        {/* Delivery Time Badge */}
        {restaurant.deliveryTime && (
          <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-xs text-foreground text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span>{restaurant.deliveryTime}</span>
          </div>
        )}
      </div>

      {/* Info Area */}
      <div className="p-3.5 sm:p-4 space-y-2 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug truncate group-hover:text-primary transition-colors">
            {restaurant.name}
          </h3>
          {restaurant.cuisine ? (
            <p className="text-xs text-muted-foreground truncate">
              {restaurant.cuisine}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
          {restaurant.costForTwo ? (
            <span className="font-medium text-foreground/80 truncate">
              ₹{restaurant.costForTwo} for two
            </span>
          ) : null}

          {restaurant.distance && (
            <span className="flex items-center gap-0.5 shrink-0">
              <MapPin className="h-3 w-3" />
              <span>{restaurant.distance}</span>
            </span>
          )}
        </div>
      </div>
    </AppCard>
  );
}
