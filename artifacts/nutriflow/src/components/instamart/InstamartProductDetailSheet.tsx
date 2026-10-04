import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Clock, ShoppingCart, Check, Package, X, ShieldCheck, Plus, Minus, Star } from "lucide-react";
import { InstamartProductData } from "./InstamartProductCard";
import { PrimaryButton, Pill } from "@/components/layout/primitives";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";

interface InstamartProductDetailSheetProps {
  product: InstamartProductData | null;
  isOpen: boolean;
  onClose: () => void;
  isAddedToCart?: boolean;
}

export function InstamartProductDetailSheet({
  product,
  isOpen,
  onClose,
  isAddedToCart = false,
}: InstamartProductDetailSheetProps) {
  const { addToCart, setIsCartOpen } = useCart();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const currentPrice = product.discountPrice || product.price;

  const handleAddToCart = () => {
    addToCart({
      id: `grocery-${product.id}`,
      name: product.name,
      price: currentPrice,
      type: "grocery",
      category: product.category,
      unit: product.unit,
      description: product.description,
      imageUrl: product.imageUrl,
    }, quantity);

    toast({
      title: "Added to Grocery Basket 🛒",
      description: `"${product.name}" (${quantity}x) added to Swiggy Instamart basket.`,
    });
    setIsCartOpen(true);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-background"
      >
        {/* Product Image */}
        <div className="relative aspect-square bg-muted shrink-0 overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-muted/60 text-muted-foreground">
              <Package className="h-10 w-10 text-muted-foreground/60 mb-2" />
              <span className="text-xs font-semibold">{product.name}</span>
            </div>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
            aria-label="Close product details"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Attribution Tag */}
          <div className="absolute bottom-3 left-4">
            <span className="text-[10px] font-bold text-white bg-emerald-600/90 px-2.5 py-0.5 rounded-md inline-flex items-center gap-1 shadow-xs">
              ⚡ Powered by Swiggy Instamart
            </span>
          </div>
        </div>

        {/* Product Information */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto text-left">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Pill variant="success" className="text-[10px]">
                {product.category}
              </Pill>
              {product.rating !== undefined && (
                <span className="flex items-center gap-1 text-xs font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  <span>{product.rating}</span>
                </span>
              )}
            </div>
            <SheetTitle className="text-base sm:text-lg font-bold text-foreground leading-snug">
              {product.name}
            </SheetTitle>
            <span className="text-xs font-medium text-muted-foreground block">
              Quantity / Pack: {product.quantity} {product.unit}
            </span>
          </div>

          {/* Pricing Box */}
          <div className="bg-muted/40 p-3.5 rounded-2xl flex items-baseline justify-between border border-border/60">
            <div className="flex items-baseline gap-2">
              {currentPrice > 0 ? (
                <>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    ₹{currentPrice}
                  </span>
                  {product.discountPrice && product.price > product.discountPrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      MRP ₹{product.price}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm font-bold text-muted-foreground">
                  Price at checkout
                </span>
              )}
            </div>
            {product.discountText && (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-md">
                {product.discountText}
              </span>
            )}
          </div>

          {/* Delivery & Stock Info */}
          <div className="space-y-2 text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              <span>
                {product.deliveryTime
                  ? `Delivered in ${product.deliveryTime} by Swiggy Instamart`
                  : "Delivery estimate shown at checkout by Swiggy Instamart"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Quality checked & sealed packaging</span>
            </div>
          </div>

          {product.description && (
            <div className="space-y-1 pt-2 border-t border-border/50 text-xs">
              <span className="font-bold text-foreground block">Product Overview</span>
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
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
            onClick={handleAddToCart}
            disabled={isAddedToCart}
            className="w-full h-11 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {isAddedToCart ? (
              <>
                <Check className="h-4 w-4" />
                <span>Added to Grocery Basket</span>
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                <span>Add {quantity} to Grocery Basket {currentPrice > 0 ? `(₹${currentPrice * quantity})` : ""}</span>
              </>
            )}
          </PrimaryButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
