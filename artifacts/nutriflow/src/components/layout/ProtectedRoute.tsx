import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Spinner } from "@/components/ui/spinner";

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
}

// 1. ProtectedRoute: For standard authenticated pages (Dashboard, Chat, Grocery, Profile, etc.)
export function ProtectedRoute({ component: Component }: ProtectedRouteProps) {
  const { user, onboarded, loading } = useAuth();

  // Show loading spinner while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-primary animate-spin" />
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

  // Onboarding not completed — redirect to onboarding
  if (!onboarded) {
    return <Redirect to="/onboarding" />;
  }

  return <Component />;
}

// 2. OnboardingRoute: For onboarding page
export function OnboardingRoute({ component: Component }: ProtectedRouteProps) {
  const { user, onboarded, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm font-medium animate-pulse">
            Loading onboarding...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect to login
  if (!user) {
    return <Redirect to="/login" />;
  }

  // Onboarding already completed — redirect to dashboard
  if (onboarded) {
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}

// 3. GuestRoute: For Login page
export function GuestRoute({ component: Component }: ProtectedRouteProps) {
  const { user, onboarded, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm font-medium animate-pulse">
            Verifying session...
          </p>
        </div>
      </div>
    );
  }

  // Authenticated user — redirect appropriately instead of showing login page
  if (user && user.id !== "guest") {
    return <Redirect to={onboarded ? "/dashboard" : "/onboarding"} />;
  }

  return <Component />;
}
