/**
 * src/lib/procurement/AuthContext.tsx
 *
 * Auth state for the Procurement module. Reads the signed-in user's row
 * from `user_profiles` (id = auth.users.id, role: buyer | manager | admin)
 * and exposes it as `profile`, which the Procurement tabs expect.
 *
 * IMPORTANT: this file must be named AuthContext.tsx (not .ts) because it
 * contains JSX.
 */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { UserProfile } from "@/lib/procurement/types";

export type UserRole = "buyer" | "manager" | "admin";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  isAuthenticated: boolean;
  /** true if the current user's role is one of the given roles */
  hasRole: (...roles: UserRole[]) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** re-fetch the profile — call after an admin changes a user's role */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[AuthContext] failed to load profile for user", userId, error);
    return null;
  }
  if (!data) {
    console.warn("[AuthContext] no user_profiles row for user", userId);
    return null;
  }
  return data as UserProfile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function hydrate(nextSession: Session | null) {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    if (nextSession?.user) {
      setProfile(await fetchProfile(nextSession.user.id));
    } else {
      setProfile(null);
    }
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      hydrate(data.session).finally(() => {
        if (mounted) setLoading(false);
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      hydrate(nextSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function refreshProfile() {
    if (user) setProfile(await fetchProfile(user.id));
  }

  const role: UserRole | null = profile?.role ?? null;

  function hasRole(...roles: UserRole[]) {
    return role !== null && roles.includes(role);
  }

  const value: AuthContextValue = {
    user,
    session,
    profile,
    role,
    loading,
    isAuthenticated: !!user,
    hasRole,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
