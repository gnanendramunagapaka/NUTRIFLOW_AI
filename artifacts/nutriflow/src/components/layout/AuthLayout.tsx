import { ReactNode } from "react";
import { Activity } from "lucide-react";
import { Link } from "wouter";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative flex flex-col justify-center items-center px-4 py-12 bg-gradient-to-tr from-green-50/60 via-background to-emerald-50/40 overflow-hidden">
      {/* Background Decorative Blur Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Header / Logo */}
      <div className="z-10 mb-6 flex flex-col items-center">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-primary transition-transform hover:scale-105 duration-200">
          <Activity className="h-8 w-8 text-primary animate-pulse" />
          <span className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent font-extrabold">NutriFlow</span>
        </Link>
      </div>

      {/* Auth Card Container */}
      <div className="w-full max-w-md z-10">
        {children}
      </div>

      {/* Footer */}
      <div className="z-10 mt-8 text-center text-xs text-muted-foreground/75">
        &copy; {new Date().getFullYear()} NutriFlow AI. Your partner in digital wellness.
      </div>
    </div>
  );
}
