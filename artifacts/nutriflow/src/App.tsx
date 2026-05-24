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
import Checkout from "@/pages/Checkout";
import OrderConfirmation from "@/pages/OrderConfirmation";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { CartProvider } from "@/hooks/use-cart";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/onboarding" component={() => <ProtectedRoute component={Onboarding} />} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/chat" component={() => <ProtectedRoute component={Chat} />} />
      <Route path="/discover" component={() => <ProtectedRoute component={Discover} />} />
      <Route path="/grocery" component={() => <ProtectedRoute component={Grocery} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/checkout" component={() => <ProtectedRoute component={Checkout} />} />
      <Route path="/order-confirmation" component={() => <ProtectedRoute component={OrderConfirmation} />} />
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
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
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
