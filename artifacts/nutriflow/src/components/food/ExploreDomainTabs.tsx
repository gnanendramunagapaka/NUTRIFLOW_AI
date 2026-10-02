import React from "react";
import { useLocation } from "wouter";
import { Utensils, ShoppingBag, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExploreDomainTabsProps {
  className?: string;
  activeDomain?: "food" | "instamart" | "dineout";
}

export function ExploreDomainTabs({
  className,
  activeDomain = "food",
}: ExploreDomainTabsProps) {
  const [, setLocation] = useLocation();

  const domains = [
    {
      id: "food",
      label: "Food Delivery",
      desc: "Dishes & restaurants",
      icon: Utensils,
      color: "text-[#FC8019]",
      bgActive: "bg-orange-500/10 border-[#FC8019]/40 text-[#FC8019]",
      active: activeDomain === "food",
      onClick: () => setLocation("/discover"),
    },
    {
      id: "instamart",
      label: "Instamart",
      desc: "Groceries & pantry",
      icon: ShoppingBag,
      color: "text-emerald-600 dark:text-emerald-400",
      bgActive: "bg-emerald-500/10 border-emerald-500/40 text-emerald-600",
      active: activeDomain === "instamart",
      onClick: () => setLocation("/grocery"),
    },
    {
      id: "dineout",
      label: "Dineout",
      desc: "Eat out & reserve",
      icon: Compass,
      color: "text-amber-500",
      bgActive: "bg-amber-500/10 border-amber-500/40 text-amber-600",
      active: activeDomain === "dineout",
      onClick: () => setLocation("/dineout"),
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="Explore Domains"
      className={cn("grid grid-cols-3 gap-2 sm:gap-3", className)}
    >
      {domains.map((d) => {
        const Icon = d.icon;
        return (
          <button
            key={d.id}
            role="tab"
            aria-selected={d.active}
            type="button"
            onClick={d.onClick}
            className={cn(
              "p-3 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3",
              d.active
                ? d.bgActive + " font-bold shadow-xs"
                : "bg-card border-border/80 hover:bg-muted/40 text-foreground"
            )}
          >
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                d.active ? "bg-background/80 shadow-2xs" : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className={cn("h-4.5 w-4.5", d.active ? d.color : "")} />
            </div>
            <div className="min-w-0">
              <span className="block text-xs sm:text-sm font-bold truncate">
                {d.label}
              </span>
              <span className="block text-[10px] sm:text-[11px] text-muted-foreground truncate">
                {d.desc}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
