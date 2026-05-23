import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { CartDrawer } from "../cart/CartDrawer";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <CartDrawer />
    </div>
  );
}
