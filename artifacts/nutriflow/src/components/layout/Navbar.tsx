import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Activity, LayoutDashboard, MessageSquare, Search, ShoppingCart, User } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/discover", label: "Discover", icon: Search },
    { href: "/chat", label: "AI Copilot", icon: MessageSquare },
    { href: "/grocery", label: "Grocery", icon: ShoppingCart },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary mr-8">
          <Link href="/" className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span>NutriFlow</span>
          </Link>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <span className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary cursor-pointer",
                location === item.href ? "text-primary" : "text-muted-foreground"
              )}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </span>
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/login">
            <span className="text-sm font-medium hover:text-primary transition-colors cursor-pointer hidden md:block">
              Log in
            </span>
          </Link>
        </div>
      </div>
      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background flex justify-around p-3 pb-safe z-50">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <span className={cn(
              "flex flex-col items-center gap-1 text-xs cursor-pointer",
              location === item.href ? "text-primary" : "text-muted-foreground"
            )}>
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </span>
          </Link>
        ))}
      </div>
    </header>
  );
}
