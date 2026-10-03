import { useMemo } from "react";
import { useAuth } from "./use-auth";
import { buildProfileContextFromProfile, type ProfileContext } from "@/lib/profileContext";

/**
 * React hook to access the normalized, typed ProfileContext for the current authenticated user.
 * Derived deterministically from the active session profile without altering persistent store.
 */
export function useProfileContext(): {
  profileContext: ProfileContext | null;
  loading: boolean;
} {
  const { user, loading } = useAuth();

  const profileContext = useMemo(() => {
    if (!user) return null;
    return buildProfileContextFromProfile(user);
  }, [user]);

  return {
    profileContext,
    loading,
  };
}

export type { ProfileContext };
