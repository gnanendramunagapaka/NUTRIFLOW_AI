import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Chat from "@/pages/Chat";
import Discover from "@/pages/Discover";
import Grocery from "@/pages/Grocery";
import Profile from "@/pages/Profile";
import VerifyEmail from "@/pages/VerifyEmail";
import AuthCallback from "@/pages/AuthCallback";
import Checkout from "@/pages/Checkout";
import OrderConfirmation from "@/pages/OrderConfirmation";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { CartProvider } from "@/hooks/use-cart";
import { ProtectedRoute, GuestRoute, OnboardingRoute } from "@/components/layout/ProtectedRoute";

// Stable QueryClient config — 1 retry, 5min stale time, no refetch on window focus
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

// Stable wrapper components — prevents Wouter from remounting on every state change
const LoginPage = () => <GuestRoute component={Login} />;
const OnboardingPage = () => <OnboardingRoute component={Onboarding} />;
const DashboardPage = () => <ProtectedRoute component={Dashboard} />;
const ChatPage = () => <ProtectedRoute component={Chat} />;
const DiscoverPage = () => <ProtectedRoute component={Discover} />;
const GroceryPage = () => <ProtectedRoute component={Grocery} />;
const ProfilePage = () => <ProtectedRoute component={Profile} />;
const CheckoutPage = () => <ProtectedRoute component={Checkout} />;
const OrderConfirmationPage = () => <ProtectedRoute component={OrderConfirmation} />;

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={LoginPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/auth/callback/" component={AuthCallback} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/chat" component={ChatPage} />
      <Route path="/discover" component={DiscoverPage} />
      <Route path="/grocery" component={GroceryPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/order-confirmation" component={OrderConfirmationPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL === "/" ? "" : (import.meta.env.BASE_URL || "").replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
