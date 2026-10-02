import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  Sparkles,
  Compass,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface BottomNavProps {
  className?: string;
}

export function BottomNav({ className }: BottomNavProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  // If not logged in, bottom navigation is hidden
  if (!user) {
    return null;
  }

  // Primary 4 items per NutriFlow product direction:
  // 1. Home (/dashboard)
  // 2. AI Copilot (/chat)
  // 3. Explore (/discover)
  // 4. Profile (/profile)
  const navItems = [
    {
      href: "/dashboard",
      label: "Home",
      icon: Home,
      isActive: location === "/dashboard" || location === "/",
    },
    {
      href: "/chat",
      label: "AI Copilot",
      icon: Sparkles,
      isActive: location === "/chat",
    },
    {
      href: "/discover",
      label: "Explore",
      icon: Compass,
      isActive:
        location === "/discover" ||
        location === "/grocery" ||
        location === "/dineout",
    },
    {
      href: "/profile",
      label: "Profile",
      icon: User,
      isActive: location === "/profile",
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/80 px-2 py-1.5 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.03)]",
        className
      )}
    >
      <div className="flex items-center justify-around max-w-md mx-auto h-14">
        {navItems.map((item) => {
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <span
                aria-current={item.isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full min-h-[44px] py-1 rounded-xl transition-all duration-150 cursor-pointer select-none",
                  item.isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground active:scale-95"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full transition-colors",
                    item.isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-[11px] tracking-tight leading-none">
                  {item.label}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
