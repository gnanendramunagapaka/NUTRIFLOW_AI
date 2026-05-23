import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Activity, 
  LayoutDashboard, 
  MessageSquare, 
  Search, 
  ShoppingCart, 
  User, 
  LogOut,
  ChevronDown,
  ClipboardList
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { itemCount, setIsCartOpen } = useCart();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/discover", label: "Discover", icon: Search },
    { href: "/chat", label: "AI Copilot", icon: MessageSquare },
    { href: "/grocery", label: "Grocery", icon: ClipboardList },
    { href: "/profile", label: "Profile", icon: User },
  ];

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary mr-8">
          <Link href="/" className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent font-extrabold">NutriFlow</span>
          </Link>
        </div>

        {/* Desktop Nav - Only show when logged in */}
        {user && (
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <span className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary cursor-pointer",
                  location === item.href ? "text-primary font-semibold" : "text-muted-foreground"
                )}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3">
          {/* Cart Icon Button - Visible on both desktop & mobile headers if logged in */}
          {user && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer mr-1"
              aria-label="View Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-extrabold text-white animate-in zoom-in duration-300">
                  {itemCount}
                </span>
              )}
            </button>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none cursor-pointer">

                <div className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                  <Avatar className="h-8 w-8 border border-border shadow-2xs">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs uppercase">
                      {(user.name || 'U').substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold text-foreground hidden sm:block">
                    {user.name || 'User'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl mt-1 shadow-md bg-card border-border/80">
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex flex-col space-y-0.5 text-left">
                    <p className="text-sm font-semibold text-foreground leading-none">{user.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="p-2.5 cursor-pointer rounded-lg hover:bg-muted/50" onClick={() => setLocation("/profile")}>
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-2.5 cursor-pointer rounded-lg hover:bg-muted/50" onClick={() => setLocation("/dashboard")}>
                  <LayoutDashboard className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="p-2.5 cursor-pointer rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10 hover:bg-destructive/5" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <span className="text-sm font-semibold bg-primary hover:bg-primary/95 text-primary-foreground px-4 py-2 rounded-xl shadow-xs transition-all hover-elevate cursor-pointer">
                Log in
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Nav - Only show when logged in */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background flex justify-around p-3 pb-safe z-50 shadow-lg">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <span className={cn(
                "flex flex-col items-center gap-1 text-xs cursor-pointer transition-colors",
                location === item.href ? "text-primary font-semibold" : "text-muted-foreground"
              )}>
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
