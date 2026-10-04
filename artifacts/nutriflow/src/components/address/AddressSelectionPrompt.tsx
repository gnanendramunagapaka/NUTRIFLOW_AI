import React from "react";
import { AppCard } from "@/components/layout/primitives";
import { MapPin, MapPinOff, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Address } from "@/hooks/use-cart";

export interface AddressSelectionPromptProps {
  domain?: "food" | "instamart" | "dineout";
  availableAddresses: Array<{
    id: string;
    label?: string;
    name?: string;
    address?: string;
    city?: string;
    isDefault?: boolean;
    icon?: string;
  }>;
  selectedAddressId?: string;
  onSelectAddress: (address: Address) => void;
  className?: string;
}

export function AddressSelectionPrompt({
  domain = "food",
  availableAddresses = [],
  selectedAddressId,
  onSelectAddress,
  className,
}: AddressSelectionPromptProps) {
  const isGrocery = domain === "instamart";
  const domainText = isGrocery ? "groceries" : "meals";

  if (availableAddresses.length === 0) {
    return (
      <AppCard className={cn("p-8 sm:p-10 text-center space-y-3", className)}>
        <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
          <MapPinOff className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-foreground">No Saved Delivery Addresses Found</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Please add a delivery address to your Swiggy account to discover nearby partner kitchens and live recommendations.
          </p>
        </div>
      </AppCard>
    );
  }

  return (
    <AppCard className={cn("p-6 sm:p-8 space-y-5 border-primary/30 bg-gradient-to-b from-card to-card/95 shadow-sm", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Select Delivery Address
            </h3>
            <p className="text-xs text-muted-foreground">
              Choose your delivery location to view live {domainText} and partner kitchens nearby.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-200/50 flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-2xs">
          ⚡ Powered by Swiggy
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {availableAddresses.map((rawAddr, idx) => {
          const id = rawAddr.id;
          const label = rawAddr.label || rawAddr.name || `Address ${idx + 1}`;
          const addressText = rawAddr.address || rawAddr.city || "";
          const isSelected = selectedAddressId === id;
          const icon = label.toLowerCase().includes("work")
            ? "Briefcase"
            : label.toLowerCase().includes("home")
            ? "Home"
            : "MapPin";
          const emoji = icon === "Home" ? "🏠" : icon === "Briefcase" ? "💼" : "📍";

          const normalizedAddr: Address = {
            id,
            label,
            address: addressText,
            city: rawAddr.city,
            icon,
            isDefault: rawAddr.isDefault,
          };

          return (
            <div
              key={id}
              onClick={() => onSelectAddress(normalizedAddr)}
              className={cn(
                "p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 group text-left",
                isSelected
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "border-border/80 bg-background hover:border-primary/40 hover:bg-muted/30"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                  <span>{emoji}</span>
                  <span>{label}</span>
                  {rawAddr.isDefault && (
                    <span className="text-[9px] lowercase bg-muted px-1.5 py-0.5 rounded font-medium text-muted-foreground">
                      default
                    </span>
                  )}
                </span>
                {isSelected ? (
                  <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3" />
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-primary group-hover:underline">
                    Deliver Here
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {addressText}
              </p>
            </div>
          );
        })}
      </div>
    </AppCard>
  );
}
