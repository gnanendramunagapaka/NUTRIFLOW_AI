import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { supabase } from "@/lib/supabaseClient";
import { useQueryClient } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
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
  supabaseUser: any | null;
  onboarded: boolean;
  onboardingData: OnboardingData;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateOnboarding: (data: Partial<OnboardingData>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Local storage keys ───────────────────────────────────────────────────────

const LS_ONBOARDING = "nutriflow_onboarding";
const LS_USER = "nutriflow_user_profile";

function readLocalOnboarding(userId?: string): Partial<OnboardingData> {
  try {
    const key = userId ? `${LS_ONBOARDING}_${userId}` : LS_ONBOARDING;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    
    // Merge fallback to guest onboarding data if user-specific is empty
    if (userId) {
      const guestRaw = localStorage.getItem(LS_ONBOARDING);
      if (guestRaw) {
        return JSON.parse(guestRaw);
      }
    }
    return {};
  } catch {
    return {};
  }
}

function writeLocalOnboarding(data: Partial<OnboardingData>, userId?: string) {
  try {
    const key = userId ? `${LS_ONBOARDING}_${userId}` : LS_ONBOARDING;
    const current = readLocalOnboarding(userId);
    const merged = { ...current, ...data };
    localStorage.setItem(key, JSON.stringify(merged));
    
    // Also update guest key for fallback persistence during early registration
    if (!userId) {
      localStorage.setItem(LS_ONBOARDING, JSON.stringify(merged));
    }
  } catch {
    // ignore
  }
}

function readLocalUser(userId?: string): User | null {
  try {
    const key = userId ? `${LS_USER}_${userId}` : LS_USER;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalUser(user: User, userId?: string) {
  try {
    const key = userId ? `${LS_USER}_${userId}` : LS_USER;
    localStorage.setItem(key, JSON.stringify(user));
  } catch {
    // ignore
  }
}

// ─── Token getter for API client ──────────────────────────────────────────────

setAuthTokenGetter(async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
});

// ─── Auth Provider ────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const lastProcessedUserRef = useRef<string | null>(null);

  // Build fallback user from Supabase session
  const buildFallbackUser = (session: any, onboardingCompleted = false): User => {
    const emailPart = session.user.email?.split("@")[0] || "";
    const defaultName =
      session.user.user_metadata?.name ||
      (emailPart ? emailPart.charAt(0).toUpperCase() + emailPart.slice(1) : "User");

    // Merge with user-scoped locally cached data
    const local = readLocalUser(session.user.id);
    const localOnboarding = readLocalOnboarding(session.user.id);

    return {
      id: session.user.id,
      name: local?.name || defaultName,
      email: session.user.email || "",
      isEmailVerified: !!session.user.email_confirmed_at,
      onboardingCompleted: local?.onboardingCompleted ?? onboardingCompleted,
      goal: local?.goal || localOnboarding.goals?.[0] || "Stay Healthy",
      dietaryPreferences: local?.dietaryPreferences || localOnboarding.dietaryPreferences || [],
      allergies: local?.allergies || localOnboarding.allergies || [],
      workoutFrequency: local?.workoutFrequency || localOnboarding.workoutFrequency || null,
      waterIntake: local?.waterIntake || localOnboarding.waterIntake || null,
      mealHabits: local?.mealHabits || localOnboarding.mealHabits || null,
      budget: local?.budget || localOnboarding.budget || null,
      wellnessScore: local?.wellnessScore || 72,
      streak: local?.streak || 1,
      avatarUrl: local?.avatarUrl || null,
    };
  };

  // Fetch or create profile from Supabase — with 4s timeout and fallback
  const fetchOrCreateProfile = async (session: any): Promise<User> => {
    const fallbackUser = buildFallbackUser(session);

    try {
      const profilePromise = (async () => {
        const { data: profile, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) {
          console.warn("[Auth] Profile fetch error:", error.message);
          return null;
        }

        if (!profile) {
          // Auto-create profile for new user
          const emailPart = session.user.email?.split("@")[0] || "";
          const defaultName =
            session.user.user_metadata?.name ||
            (emailPart ? emailPart.charAt(0).toUpperCase() + emailPart.slice(1) : "User");

          const { data: newProfile, error: insertErr } = await supabase
            .from("user_profiles")
            .insert({
              id: session.user.id,
              name: defaultName,
              email: session.user.email || "",
              goal: "Stay Healthy",
              dietary_preferences: [],
              allergies: [],
              onboarding_completed: false,
              wellness_score: 72,
              streak: 1,
            })
            .select()
            .single();

          if (insertErr) {
            console.warn("[Auth] Profile insert error:", insertErr.message);
            return null;
          }
          return newProfile;
        }

        return profile;
      })();

      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 4000)
      );

      const result = await Promise.race([profilePromise, timeoutPromise]);

      if (result) {
        const dbUser: User = {
          id: result.id,
          name: result.name || fallbackUser.name,
          email: result.email || session.user.email || "",
          isEmailVerified: !!session.user.email_confirmed_at,
          onboardingCompleted: result.onboarding_completed ?? false,
          age: result.age,
          weight: result.weight,
          height: result.height,
          goal: result.goal || "Stay Healthy",
          dietaryPreferences: result.dietary_preferences || [],
          allergies: result.allergies || [],
          workoutFrequency: result.workout_frequency || null,
          waterIntake: result.water_intake || null,
          mealHabits: result.meal_habits || null,
          budget: result.budget || null,
          wellnessScore: result.wellness_score || 72,
          streak: result.streak || 1,
          avatarUrl: result.avatar_url || null,
        };
        writeLocalUser(dbUser, session.user.id);
        return dbUser;
      }

      // Timeout — use fallback
      console.warn("[Auth] Profile fetch timed out, using cached/fallback user.");
      return fallbackUser;
    } catch (err) {
      console.error("[Auth] fetchOrCreateProfile exception:", err);
      return fallbackUser;
    }
  };

  const refreshUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUser(null);
        setSupabaseUser(null);
        lastProcessedUserRef.current = null;
        return;
      }

      const userId = session.user.id;
      if (lastProcessedUserRef.current === userId && user) {
        // Already loaded profile for this user
        setSupabaseUser(session.user);
        return;
      }
      lastProcessedUserRef.current = userId;

      setSupabaseUser(session.user);
      const profileUser = await fetchOrCreateProfile(session);
      setUser(profileUser);
    } catch (err) {
      console.error("[Auth] refreshUser error:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Absolute safety: if loading never resolves, force it off after 8 seconds
    const safetyTimer = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn("[Auth] Safety timer fired — forcing loading=false");
          return false;
        }
        return prev;
      });
    }, 8000);

    // Initial auth check
    refreshUser();

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[Auth] State change:", event, session?.user?.id);

      if (session) {
        const userId = session.user.id;
        setSupabaseUser(session.user);
        
        if (lastProcessedUserRef.current === userId && user) {
          // Already processing/processed this user
          setLoading(false);
          return;
        }
        lastProcessedUserRef.current = userId;

        try {
          const profileUser = await fetchOrCreateProfile(session);
          setUser(profileUser);
        } catch (err) {
          console.error("[Auth] onAuthStateChange profile error:", err);
        }
      } else {
        lastProcessedUserRef.current = null;
        setSupabaseUser(null);
        setUser(null);
        try {
          queryClient.clear();
        } catch {
          // ignore
        }
      }

      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  // ─── Auth Actions ──────────────────────────────────────────────────────────

  const login = async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (data.session) {
      await refreshUser();
    }
    return true;
  };

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { name },
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined
      },
    });
    if (error) throw new Error(error.message);
    if (data.session) {
      await refreshUser();
    } else if (data.user) {
      setSupabaseUser(data.user);
      setLoading(false);
    }
    return true;
  };

  const loginWithGoogle = async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined
      }
    });
    if (error) throw new Error(error.message);
  };

  const logout = async (): Promise<void> => {
    const userId = supabaseUser?.id;
    lastProcessedUserRef.current = null;

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("[Auth] Logout error:", err);
    }

    setUser(null);
    setSupabaseUser(null);

    // Clear all user-specific and fallback localStorage data
    if (userId) {
      localStorage.removeItem(`${LS_USER}_${userId}`);
      localStorage.removeItem(`${LS_ONBOARDING}_${userId}`);
      localStorage.removeItem(`nutriflow_cart_${userId}`);
      localStorage.removeItem(`nutriflow_last_order_${userId}`);
    }
    localStorage.removeItem(LS_USER);
    localStorage.removeItem(LS_ONBOARDING);
    localStorage.removeItem("nutriflow_cart");
    localStorage.removeItem("nutriflow_chat");
    localStorage.removeItem("nutriflow_cart_guest");
    localStorage.removeItem("nutriflow_last_order");

    // Clear any Supabase-stored auth session keys and tokens
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("sb-") || key.includes("supabase") || key.startsWith("nutriflow_"))) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn("[Auth] Error clearing localStorage keys:", e);
    }

    try {
      sessionStorage.clear();
    } catch (e) {
      // ignore
    }

    try {
      queryClient.clear();
    } catch {
      // ignore
    }

    // Force redirect to landing page and full reload to clear all active JS memory/states
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  // ─── Onboarding ────────────────────────────────────────────────────────────

  const updateOnboarding = async (data: Partial<OnboardingData>): Promise<void> => {
    const userId = supabaseUser?.id;
    // 1. Always update local state immediately (non-blocking)
    writeLocalOnboarding(data, userId);

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
      writeLocalUser(updatedUser, userId);
    }

    // 2. Background: persist to Supabase (fire-and-forget — never blocks)
    try {
      const { data: { user: sbUser } } = await supabase.auth.getUser();
      if (!sbUser) return;

      const profileUpdates: Record<string, any> = {};
      if (data.name !== undefined) profileUpdates.name = data.name;
      if (data.age !== undefined) profileUpdates.age = data.age;
      if (data.weight !== undefined) profileUpdates.weight = data.weight;
      if (data.height !== undefined) profileUpdates.height = data.height;
      if (data.goals !== undefined) profileUpdates.goal = data.goals[0] || user?.goal || "Stay Healthy";
      if (data.dietaryPreferences !== undefined) profileUpdates.dietary_preferences = data.dietaryPreferences;
      if (data.allergies !== undefined) profileUpdates.allergies = data.allergies;
      if (data.workoutFrequency !== undefined) profileUpdates.workout_frequency = data.workoutFrequency;
      if (data.waterIntake !== undefined) profileUpdates.water_intake = data.waterIntake;
      if (data.mealHabits !== undefined) profileUpdates.meal_habits = data.mealHabits;
      if (data.budget !== undefined) profileUpdates.budget = data.budget;

      if (Object.keys(profileUpdates).length > 0) {
        // Use upsert to handle both new and existing profiles safely
        const { error: upsertErr } = await supabase
          .from("user_profiles")
          .upsert({ id: sbUser.id, email: sbUser.email || "", ...profileUpdates }, { onConflict: "id" });

        if (upsertErr) {
          console.warn("[Auth] Profile upsert error (non-critical):", upsertErr.message);
        }
      }
    } catch (err) {
      console.warn("[Auth] updateOnboarding background sync failed (non-critical):", err);
    }
  };

  const completeOnboarding = async (): Promise<void> => {
    const userId = supabaseUser?.id;
    // 1. Update local state immediately
    if (user) {
      const updatedUser: User = { ...user, onboardingCompleted: true };
      setUser(updatedUser);
      writeLocalUser(updatedUser, userId);
    }

    // 2. Background: update Supabase
    try {
      const { data: { user: sbUser } } = await supabase.auth.getUser();
      if (!sbUser) return;

      const { error } = await supabase
        .from("user_profiles")
        .upsert({ id: sbUser.id, email: sbUser.email || "", onboarding_completed: true }, { onConflict: "id" });

      if (error) {
        console.warn("[Auth] completeOnboarding DB error (non-critical):", error.message);
      }
    } catch (err) {
      console.warn("[Auth] completeOnboarding background sync failed (non-critical):", err);
    }
  };

  // ─── Derived state ─────────────────────────────────────────────────────────

  const localOnboarding = readLocalOnboarding(supabaseUser?.id);

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
        supabaseUser,
        onboarded,
        onboardingData,
        loading,
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
