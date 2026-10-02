import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { initiateSwiggyOAuth } from "@/lib/swiggyAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  swiggyUserId?: string | null;
  name: string;
  email?: string | null;
  onboardingCompleted: boolean;
  age?: number | null;
  weight?: number | null;
  height?: number | null;
  goal: string;
  dietaryPreferences: string[];
  allergies: string[];
  workoutFrequency?: string | null;
  waterIntake?: string | null;
  mealHabits?: string | null;
  budget?: string | null;
  wellnessScore: number;
  streak: number;
  avatarUrl?: string | null;
}

export interface OnboardingData {
  goals: string[];
  dietaryPreferences: string[];
  allergies: string[];
  workoutFrequency: string;
  waterIntake: string;
  mealHabits: string;
  budget: string;
  age?: number;
  weight?: number;
  height?: number;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  supabaseUser: null;
  session: null;
  onboarded: boolean;
  onboardingData: OnboardingData;
  loading: boolean;
  loginWithSwiggy: (returnTo?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateOnboarding: (data: Partial<OnboardingData>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Local Storage Keys (for client caching only, NO auth tokens) ─────────────

const LS_ONBOARDING = "nutriflow_onboarding";

function readLocalOnboarding(): Partial<OnboardingData> {
  try {
    const raw = localStorage.getItem(LS_ONBOARDING);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocalOnboarding(data: Partial<OnboardingData>) {
  try {
    const current = readLocalOnboarding();
    localStorage.setItem(LS_ONBOARDING, JSON.stringify({ ...current, ...data }));
  } catch {
    // ignore
  }
}

// ─── Token getter for API client: uses HttpOnly cookies, so null Bearer is fine ───

setAuthTokenGetter(async () => {
  return null;
});

// ─── Auth Provider ────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate authenticated session from server via HttpOnly cookie
  const refreshUser = async () => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include", // Transmit HttpOnly session cookie
      });

      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (data.authenticated && data.user) {
        setUser({
          id: data.user.id,
          swiggyUserId: data.user.swiggyUserId || null,
          name: data.user.name || "Swiggy User",
          email: data.user.email || null,
          onboardingCompleted: data.user.onboardingCompleted ?? false,
          age: data.user.age,
          weight: data.user.weight,
          height: data.user.height,
          goal: data.user.goal || "Stay Healthy",
          dietaryPreferences: data.user.dietaryPreferences || [],
          allergies: data.user.allergies || [],
          workoutFrequency: data.user.workoutFrequency || null,
          waterIntake: data.user.waterIntake || null,
          mealHabits: data.user.mealHabits || null,
          budget: data.user.budget || null,
          wellnessScore: data.user.wellnessScore ?? 72,
          streak: data.user.streak ?? 1,
          avatarUrl: data.user.avatarUrl || null,
        });
      } else {
        setUser(null);
      }
    } catch (err) {
      console.warn("[Auth] Failed to refresh session:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial server session check
    refreshUser();
  }, []);

  const loginWithSwiggy = async (returnTo = "/dashboard"): Promise<void> => {
    await initiateSwiggyOAuth(returnTo);
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.warn("[Auth] Logout request error:", e);
    }

    try {
      await fetch("/api/swiggy/disconnect", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }

    setUser(null);
    localStorage.removeItem(LS_ONBOARDING);
    localStorage.removeItem("nutriflow_cart");

    try {
      queryClient.clear();
    } catch {
      // ignore
    }

    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const updateOnboarding = async (data: Partial<OnboardingData>): Promise<void> => {
    writeLocalOnboarding(data);

    if (user) {
      const updatedUser: User = {
        ...user,
        goal: data.goals ? (data.goals[0] || user.goal) : user.goal,
        dietaryPreferences: data.dietaryPreferences ?? user.dietaryPreferences,
        allergies: data.allergies ?? user.allergies,
        workoutFrequency: data.workoutFrequency ?? user.workoutFrequency,
        waterIntake: data.waterIntake ?? user.waterIntake,
        mealHabits: data.mealHabits ?? user.mealHabits,
        budget: data.budget ?? user.budget,
        name: data.name ?? user.name,
        age: data.age !== undefined ? data.age : user.age,
        weight: data.weight !== undefined ? data.weight : user.weight,
        height: data.height !== undefined ? data.height : user.height,
      };
      setUser(updatedUser);
    }

    // Persist to backend via authenticated session
    try {
      const profileUpdates: Record<string, any> = {};
      if (data.name !== undefined) profileUpdates.name = data.name;
      if (data.age !== undefined) profileUpdates.age = data.age;
      if (data.weight !== undefined) profileUpdates.weight = data.weight;
      if (data.height !== undefined) profileUpdates.height = data.height;
      if (data.goals !== undefined) profileUpdates.goal = data.goals[0] || user?.goal || "Stay Healthy";
      if (data.dietaryPreferences !== undefined) profileUpdates.dietaryPreferences = data.dietaryPreferences;
      if (data.allergies !== undefined) profileUpdates.allergies = data.allergies;
      if (data.workoutFrequency !== undefined) profileUpdates.workoutFrequency = data.workoutFrequency;
      if (data.waterIntake !== undefined) profileUpdates.waterIntake = data.waterIntake;
      if (data.mealHabits !== undefined) profileUpdates.mealHabits = data.mealHabits;
      if (data.budget !== undefined) profileUpdates.budget = data.budget;

      if (Object.keys(profileUpdates).length > 0) {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(profileUpdates),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error || "Failed to save profile updates to server");
        }
      }
    } catch (err) {
      console.warn("[Auth] updateOnboarding background sync failed:", err);
      throw err;
    }
  };

  const completeOnboarding = async (): Promise<void> => {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ onboardingCompleted: true }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || "Failed to mark onboarding as completed on server");
    }

    if (user) {
      setUser({ ...user, onboardingCompleted: true });
    }
  };

  // Deprecated login methods for legacy props compatibility
  const login = async (): Promise<boolean> => {
    await loginWithSwiggy();
    return true;
  };

  const signup = async (): Promise<boolean> => {
    await loginWithSwiggy();
    return true;
  };

  const loginWithGoogle = async (): Promise<void> => {
    await loginWithSwiggy();
  };

  const localOnboarding = readLocalOnboarding();
  const onboardingData: OnboardingData = {
    goals: user?.goal ? [user.goal] : (localOnboarding.goals || []),
    dietaryPreferences: user?.dietaryPreferences || localOnboarding.dietaryPreferences || [],
    allergies: user?.allergies || localOnboarding.allergies || [],
    workoutFrequency: user?.workoutFrequency || localOnboarding.workoutFrequency || "",
    waterIntake: user?.waterIntake || localOnboarding.waterIntake || "",
    mealHabits: user?.mealHabits || localOnboarding.mealHabits || "",
    budget: user?.budget || localOnboarding.budget || "",
    age: user?.age || localOnboarding.age,
    weight: user?.weight || localOnboarding.weight,
    height: user?.height || localOnboarding.height,
    name: user?.name || localOnboarding.name || "",
  };

  const onboarded = user?.onboardingCompleted ?? false;

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser: null,
        session: null,
        onboarded,
        onboardingData,
        loading,
        loginWithSwiggy,
        login,
        signup,
        loginWithGoogle,
        logout,
        updateOnboarding,
        completeOnboarding,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
