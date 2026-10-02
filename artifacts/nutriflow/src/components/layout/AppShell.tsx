import { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { CartDrawer } from "../cart/CartDrawer";
import { cn } from "@/lib/utils";

export interface AppShellProps {
  children: ReactNode;
  title?: string;
  className?: string;
  contentClassName?: string;
  /** When true, main content will not constrain to standard max-w-7xl container */
  fullWidth?: boolean;
}

export function AppShell({
  children,
  title,
  className,
  contentClassName,
  fullWidth = false,
}: AppShellProps) {
  return (
    <div className={cn("min-h-[100dvh] flex flex-col bg-background text-foreground antialiased", className)}>
      {/* Global Top Bar */}
      <TopBar title={title} />

      {/* Main Page Content with safe mobile bottom padding for fixed BottomNav */}
      <main
        className={cn(
          "flex-1 w-full pb-24 md:pb-10 transition-all",
          !fullWidth && "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
          contentClassName
        )}
      >
        {children}
      </main>

      {/* Global Mobile Bottom Navigation */}
      <BottomNav />

      {/* Global Slide-Over Cart Drawer */}
      <CartDrawer />
    </div>
  );
}
