import React from "react";
import { Link } from "wouter";
import { User, ShieldCheck, Target, Utensils, AlertTriangle, ExternalLink } from "lucide-react";
import { Pill } from "@/components/layout/primitives";
import { useAuth } from "@/hooks/use-auth";

interface ProfileContextIndicatorProps {
  className?: string;
}

export function ProfileContextIndicator({ className }: ProfileContextIndicatorProps) {
  const { user } = useAuth();

  if (!user) return null;

  const allergyCount = user.allergies?.filter((a) => a !== "None").length ?? 0;
  const dietLabel = user.dietaryPreferences && user.dietaryPreferences.length > 0
    ? user.dietaryPreferences[0]
    : "Standard";

  return (
    <div
      className={`bg-muted/40 border-b border-border/60 px-3.5 py-2 flex items-center justify-between text-xs gap-3 ${
        className || ""
      }`}
    >
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground font-medium">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">Profile Context:</span>
        </div>

        {/* Goal Pill */}
        {user.goal && (
          <div className="flex items-center gap-1 bg-background px-2 py-0.5 rounded-full border border-border/70 text-[11px] font-semibold text-foreground shrink-0 shadow-2xs">
            <Target className="h-3 w-3 text-primary" />
            <span className="truncate max-w-[130px]">{user.goal}</span>
          </div>
        )}

        {/* Diet Pill */}
        <div className="flex items-center gap-1 bg-background px-2 py-0.5 rounded-full border border-border/70 text-[11px] font-semibold text-foreground shrink-0 shadow-2xs">
          <Utensils className="h-3 w-3 text-muted-foreground" />
          <span className="truncate max-w-[100px]">{dietLabel}</span>
        </div>

        {/* Restrictions summary if any */}
        {allergyCount > 0 && (
          <div className="flex items-center gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 text-[11px] font-semibold shrink-0">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            <span>{allergyCount} restriction{allergyCount > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      <Link
        href="/profile"
        className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 shrink-0 ml-1"
        title="View Profile Settings"
      >
        <span>Profile</span>
        <ExternalLink className="h-3 w-3 opacity-70" />
      </Link>
    </div>
  );
}
