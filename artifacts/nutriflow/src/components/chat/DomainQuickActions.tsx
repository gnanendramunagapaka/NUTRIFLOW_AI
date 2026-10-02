import React from "react";
import { Utensils, ShoppingBag, Compass, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuickPromptItem {
  domain: "food" | "instamart" | "dineout" | "wellness";
  title: string;
  desc: string;
  prompt: string;
}

export const DOMAIN_PROMPTS: QuickPromptItem[] = [
  {
    domain: "food",
    title: "Help me choose a meal",
    desc: "Explore nourishing dishes aligned with your food preferences",
    prompt: "Help me choose a meal",
  },
  {
    domain: "instamart",
    title: "Help me plan my groceries",
    desc: "Curate everyday pantry items and grocery essentials on Instamart",
    prompt: "Help me plan my groceries",
  },
  {
    domain: "dineout",
    title: "Help me find somewhere to eat",
    desc: "Discover wholesome dining out spots and partner restaurants",
    prompt: "Help me find somewhere to eat",
  },
  {
    domain: "wellness",
    title: "Help me plan my meals today",
    desc: "Organize balanced daily meal options for your routine",
    prompt: "Help me plan my meals today",
  },
];

interface DomainQuickActionsProps {
  onSelectPrompt: (prompt: string) => void;
  activeDomain?: string;
  onSelectDomain?: (domain: string) => void;
  className?: string;
}

export function DomainQuickActions({
  onSelectPrompt,
  className,
}: DomainQuickActionsProps) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full", className)}>
      {DOMAIN_PROMPTS.map((item, idx) => {
        const icon =
          item.domain === "food" ? (
            <Utensils className="h-4 w-4 text-[#FC8019]" />
          ) : item.domain === "instamart" ? (
            <ShoppingBag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ) : item.domain === "dineout" ? (
            <Compass className="h-4 w-4 text-amber-500" />
          ) : (
            <Sparkles className="h-4 w-4 text-primary" />
          );

        return (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectPrompt(item.prompt)}
            className="p-3.5 text-left rounded-2xl border border-border/70 hover:border-primary/50 bg-card hover:bg-muted/40 transition-all text-xs shadow-2xs group cursor-pointer flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-bold text-foreground text-xs block truncate">
                {item.title}
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                {item.desc}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Domain Filter Strip for Composer ─────────────────────────────────────────

export function DomainFilterStrip({
  onSelectPrompt,
  className,
}: {
  onSelectPrompt: (prompt: string) => void;
  className?: string;
}) {
  const chips = [
    { label: "🥗 Choose a meal", prompt: "Help me choose a meal" },
    { label: "🛒 Plan groceries", prompt: "Help me plan my groceries" },
    { label: "🍽️ Dine out", prompt: "Help me find somewhere to eat" },
    { label: "🌿 Plan my meals", prompt: "Help me plan my meals today" },
  ];

  return (
    <div className={cn("flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1", className)}>
      {chips.map((chip, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelectPrompt(chip.prompt)}
          className="shrink-0 px-2.5 py-1 rounded-full bg-card border border-border/80 hover:border-primary/50 hover:bg-muted/50 text-[11px] font-medium text-foreground transition-all cursor-pointer shadow-2xs"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
