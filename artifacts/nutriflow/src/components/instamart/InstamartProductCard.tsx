import React from "react";
import { ShoppingCart, Plus, Check, Clock, Package } from "lucide-react";
import { AppCard, PrimaryButton } from "@/components/layout/primitives";
import { cn } from "@/lib/utils";

export interface InstamartProductData {
  id: string | number;
  name: string;
  category: string;
  quantity: string;
  unit: string;
  price: number;
  discountPrice?: number;
  discountText?: string;
  inStock?: boolean;
  imageUrl?: string;
  deliveryTime?: string;
  description?: string;
  rating?: number;
}

interface InstamartProductCardProps {
  product: InstamartProductData;
  onAddToCart?: () => void;
  onClick?: () => void;
  isAddedToCart?: boolean;
  className?: string;
}

export function InstamartProductCard({
  product,
  onAddToCart,
  onClick,
  isAddedToCart = false,
  className,
}: InstamartProductCardProps) {
  const currentPrice = product.discountPrice || product.price;
  const inStock = product.inStock !== false;

  return (
    <AppCard
      onClick={onClick}
      className={cn(
        "overflow-hidden cursor-pointer group hover:border-emerald-500/40 hover:shadow-md transition-all flex flex-col justify-between",
        className
      )}
    >
      {/* Product Image */}
      <div className="aspect-square bg-muted relative overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-muted/60 text-muted-foreground p-3 text-center">
            <Package className="h-6 w-6 text-muted-foreground/60 mb-1" />
            <span className="text-[11px] font-medium">{product.name}</span>
          </div>
        )}

        {/* Discount Badge */}
        {product.discountText && (
          <div className="absolute top-2 left-2 bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-2xs">
            {product.discountText}
          </div>
        )}

        {/* Delivery Time (only if supplied by source) */}
        {product.deliveryTime && (
          <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-xs text-foreground text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-2xs">
            <Clock className="h-2.5 w-2.5 text-emerald-600" />
            <span>{product.deliveryTime}</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
            {product.category}
          </span>
          <h4 className="text-xs font-bold text-foreground leading-snug line-clamp-2 group-hover:text-emerald-600 transition-colors">
            {product.name}
          </h4>
          <span className="text-[11px] text-muted-foreground font-medium block">
            {product.quantity} {product.unit}
          </span>
        </div>

        {/* Pricing & Add */}
        <div className="space-y-2 pt-1 border-t border-border/50">
          <div className="flex items-baseline justify-between gap-1">
            <div className="flex items-baseline gap-1.5">
              {currentPrice > 0 ? (
                <>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                    ₹{currentPrice}
                  </span>
                  {product.discountPrice && product.price > product.discountPrice && (
                    <span className="text-[11px] text-muted-foreground line-through">
                      ₹{product.price}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">
                  Price at checkout
                </span>
              )}
            </div>
          </div>

          {/* Action */}
          {inStock ? (
            <PrimaryButton
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart?.();
              }}
              disabled={isAddedToCart}
              className="w-full h-8 text-[11px] font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {isAddedToCart ? (
                <>
                  <Check className="h-3 w-3" />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="h-3 w-3" />
                  <span>Add</span>
                </>
              )}
            </PrimaryButton>
          ) : (
            <button
              disabled
              className="w-full rounded-xl h-8 text-[11px] font-medium bg-muted text-muted-foreground cursor-not-allowed text-center"
            >
              Out of Stock
            </button>
          )}
        </div>
      </div>
    </AppCard>
  );
}
