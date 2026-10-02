import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

/* --------------------------------------------------
 * 1. PageContainer
 * Mobile-first container with consistent padding and max width
 * -------------------------------------------------- */
export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "default" | "narrow" | "wide" | "full";
}

export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, size = "default", children, ...props }, ref) => {
    const maxWidthClasses = {
      narrow: "max-w-4xl",
      default: "max-w-7xl",
      wide: "max-w-screen-2xl",
      full: "max-w-full",
    }[size];

    return (
      <div
        ref={ref}
        className={cn(
          "w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-8",
          maxWidthClasses,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
PageContainer.displayName = "PageContainer";

/* --------------------------------------------------
 * 2. ResponsiveContainer
 * Guarantees no horizontal overflow on mobile screens
 * -------------------------------------------------- */
export function ResponsiveContainer({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("w-full max-w-full min-w-0 overflow-x-hidden", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/* --------------------------------------------------
 * 3. SectionHeader
 * Reusable section/page header with clear typography
 * -------------------------------------------------- */
export interface SectionHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  badge,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2",
        className
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 pt-1 sm:pt-0 shrink-0">{action}</div>}
    </div>
  );
}

/* --------------------------------------------------
 * 4. AppCard
 * Standardized calm wellness card
 * -------------------------------------------------- */
export interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const AppCard = React.forwardRef<HTMLDivElement, AppCardProps>(
  ({ className, interactive = false, children, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          "rounded-2xl border border-border/80 bg-card text-card-foreground shadow-xs transition-all duration-200 overflow-hidden",
          interactive &&
            "hover:border-primary/40 hover:shadow-sm active:scale-[0.99] cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </Card>
    );
  }
);
AppCard.displayName = "AppCard";

/* --------------------------------------------------
 * 5. PrimaryButton & SecondaryButton
 * Touch-friendly buttons adhering to mobile minimum targets
 * -------------------------------------------------- */
export const PrimaryButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size = "default", ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="default"
        size={size}
        className={cn(
          "min-h-11 sm:min-h-10 px-5 rounded-xl font-semibold shadow-xs transition-transform active:scale-[0.98]",
          className
        )}
        {...props}
      />
    );
  }
);
PrimaryButton.displayName = "PrimaryButton";

export const SecondaryButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size = "default", ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="outline"
        size={size}
        className={cn(
          "min-h-11 sm:min-h-10 px-5 rounded-xl font-medium border-border/80 hover:bg-muted/60 transition-colors",
          className
        )}
        {...props}
      />
    );
  }
);
SecondaryButton.displayName = "SecondaryButton";

/* --------------------------------------------------
 * 6. IconButton
 * Accessible touch-friendly icon button
 * -------------------------------------------------- */
export interface IconButtonProps extends ButtonProps {
  "aria-label": string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "ghost", "aria-label": ariaLabel, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size="icon"
        aria-label={ariaLabel}
        className={cn(
          "h-11 w-11 sm:h-9 sm:w-9 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);
IconButton.displayName = "IconButton";

/* --------------------------------------------------
 * 7. Pill
 * Subtle status/tag badges
 * -------------------------------------------------- */
export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "outline";
}

export function Pill({
  className,
  variant = "default",
  children,
  ...props
}: PillProps) {
  const variantStyles = {
    default: "bg-muted text-muted-foreground border-transparent",
    success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    error: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    info: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
    outline: "bg-transparent text-foreground border-border/80",
  }[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-normal select-none",
        variantStyles,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/* --------------------------------------------------
 * 8. EmptyState
 * Calm empty state placeholder
 * -------------------------------------------------- */
export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border/80 bg-card/40 space-y-4",
        className
      )}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base sm:text-lg font-semibold text-foreground">
          {title}
        </h3>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

/* --------------------------------------------------
 * 9. LoadingState
 * Calm loading spinner with message
 * -------------------------------------------------- */
export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message = "Loading wellness data...",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-12 text-center space-y-3 min-h-[200px]",
        className
      )}
    >
      <Spinner className="h-7 w-7 text-primary animate-spin" />
      <p className="text-xs sm:text-sm font-medium text-muted-foreground animate-pulse">
        {message}
      </p>
    </div>
  );
}

/* --------------------------------------------------
 * 10. ErrorState
 * Visual pattern for error handling with retry
 * -------------------------------------------------- */
export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "Unable to load data at this time. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-10 text-center rounded-2xl border border-destructive/20 bg-destructive/5 space-y-4",
        className
      )}
    >
      <div className="w-11 h-11 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
        <AlertCircle className="h-6 w-6" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm sm:text-base font-semibold text-foreground">
          {title}
        </h4>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="rounded-xl border-border/80 gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Try Again</span>
        </Button>
      )}
    </div>
  );
}
