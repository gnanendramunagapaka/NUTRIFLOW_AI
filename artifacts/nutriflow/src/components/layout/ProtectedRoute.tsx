import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Spinner } from "@/components/ui/spinner";

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
}

export function ProtectedRoute({ component: Component }: ProtectedRouteProps) {
  const { user, onboarded, loading } = useAuth();
  const [location] = useLocation();

  // Show loading spinner while auth is initializing
  // A global 8s timeout in use-auth guarantees this never runs forever
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-muted-foreground text-sm font-medium animate-pulse">
            Loading your wellness profile...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect to login
  if (!user) {
    return <Redirect to="/login" />;
  }

  // Authenticated — handle onboarding routing
  // NOTE: Email verification check is intentionally omitted for demo stability.
  // Supabase email confirmation is optional in hosted environments.
  if (!onboarded && location !== "/onboarding") {
    return <Redirect to="/onboarding" />;
  }

  if (onboarded && location === "/onboarding") {
    return <Redirect to="/dashboard" />;
  }

  // Verified email page — if user is onboarded, send to dashboard
  if (location === "/verify-email") {
    return <Redirect to={onboarded ? "/dashboard" : "/onboarding"} />;
  }

  return <Component />;
}
