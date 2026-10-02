import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Activity,
  Home,
  MessageSquare,
  Compass,
  ClipboardList,
  User,
  ShoppingCart,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TopBarProps {
  title?: string;
  className?: string;
}

export function TopBar({ title, className }: TopBarProps) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { itemCount, setIsCartOpen } = useCart();

  // Desktop navigation items (clean, comprehensive)
  const navItems = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/discover", label: "Explore", icon: Compass },
    { href: "/chat", label: "AI Copilot", icon: MessageSquare },
    { href: "/grocery", label: "Grocery", icon: ClipboardList },
    { href: "/profile", label: "Profile", icon: User },
  ];

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 transition-colors",
        className
      )}
    >
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand / Logo & Optional Context Title */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg px-1 py-0.5"
            aria-label="NutriFlow AI Home"
          >
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary transition-transform group-hover:scale-105">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-foreground leading-none">
                Nutri<span className="text-primary">Flow</span>
              </span>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                AI Wellness
              </span>
            </div>
          </Link>

          {title && (
            <div className="hidden sm:flex items-center pl-4 border-l border-border/60">
              <h2 className="text-sm font-semibold text-muted-foreground truncate max-w-[200px]">
                {title}
              </h2>
            </div>
          )}
        </div>

        {/* Center: Desktop Navigation Bar */}
        {user && (
          <nav
            aria-label="Main Navigation"
            className="hidden md:flex items-center gap-1 lg:gap-2 bg-muted/40 p-1 rounded-full border border-border/60"
          >
            {navItems.map((item) => {
              const isActive =
                location === item.href ||
                (item.href === "/dashboard" && location === "/") ||
                (item.href === "/discover" && location === "/dineout");
              return (
                <Link key={item.href} href={item.href}>
                  <span
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs lg:text-sm font-medium transition-all duration-150 cursor-pointer select-none",
                      isActive
                        ? "bg-background text-foreground font-semibold shadow-xs border border-border/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                    <span>{item.label}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right: Actions (Cart & Avatar/Login) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cart Drawer Trigger */}
          {user && (
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Shopping Cart, ${itemCount} items`}
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-xs animate-in zoom-in">
                  {itemCount}
                </span>
              )}
            </button>
          )}

          {/* User Profile Dropdown or Login Action */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border border-border/80 hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  aria-label="User Account Menu"
                >
                  <Avatar className="h-7 w-7 border border-border/80">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs uppercase">
                      {(user.name || "U").substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-semibold text-foreground hidden sm:inline-block max-w-[120px] truncate">
                    {user.name || "My Account"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline-block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-xl mt-2 p-1.5 shadow-md bg-card border border-border/80"
              >
                <DropdownMenuLabel className="p-2 font-normal">
                  <div className="flex flex-col space-y-0.5 text-left">
                    <p className="text-sm font-semibold text-foreground leading-none truncate">
                      {user.name || "NutriFlow Member"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {user.email || "Swiggy Connected"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="p-2.5 cursor-pointer rounded-lg text-xs font-medium hover:bg-muted/80 focus:bg-muted"
                  onClick={() => setLocation("/dashboard")}
                >
                  <Home className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="p-2.5 cursor-pointer rounded-lg text-xs font-medium hover:bg-muted/80 focus:bg-muted"
                  onClick={() => setLocation("/profile")}
                >
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="p-2.5 cursor-pointer rounded-lg text-xs font-medium hover:bg-muted/80 focus:bg-muted"
                  onClick={() => setLocation("/grocery")}
                >
                  <ClipboardList className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Grocery / Instamart</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="p-2.5 cursor-pointer rounded-lg text-xs font-medium text-destructive focus:text-destructive focus:bg-destructive/10 hover:bg-destructive/10"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <span className="text-xs sm:text-sm font-semibold bg-primary hover:bg-primary/95 text-primary-foreground px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center">
                Log in
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
