import { ReactNode } from "react";
import { Activity } from "lucide-react";
import { Link } from "wouter";

export interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col justify-between items-center bg-background text-foreground px-4 py-6 sm:py-10 transition-colors">
      {/* Top Header: NutriFlow Logo */}
      <header className="w-full max-w-md mx-auto flex items-center justify-center pt-2 pb-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl px-2 py-1 transition-transform active:scale-95"
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
      </header>

      {/* Centered Main Content Area */}
      <main className="w-full max-w-md mx-auto my-auto flex flex-col items-center">
        {children}
      </main>

      {/* Footer: Attribution & Trust */}
      <footer className="w-full max-w-md mx-auto text-center pt-6 pb-2 space-y-1">
        <p className="text-xs text-muted-foreground font-medium">
          Official Swiggy Builders Club Partner
        </p>
        <p className="text-[11px] text-muted-foreground/75">
          &copy; {new Date().getFullYear()} NutriFlow AI. Powered by Swiggy MCP.
        </p>
      </footer>
    </div>
  );
}
