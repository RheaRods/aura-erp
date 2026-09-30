/**
 * src/lib/procurement/AuthContext.tsx
 *
 * Matches your 001_schema.sql: `user_profiles` table (id = auth.users.id,
 * role: 'buyer' | 'manager' | 'admin'), and the `current_user_role()` RPC
 * you already defined — this file doesn't use that RPC directly (it reads
 * the row instead, since we need full_name too), but it's consistent with it.
 *
 * ONE REMAINING ASSUMPTION: Supabase client is exported as `supabase` from
 * "@/lib/supabaseClient". If aiQueries.ts imports it from a different path,
 * grep for "createClient" in src/lib and fix the import below to match.
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export type UserRole = "buyer" | "manager" | "admin";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  isAuthenticated: boolean;
  /** true if the current user's role is one of the given roles */
  hasRole: (...roles: UserRole[]) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** re-fetch role from `profiles` — call after an admin changes a user's role */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !data) {
    console.error("[AuthContext] failed to load role for user", userId, error);
    return null;
  }
  return data.role as UserRole;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  async function hydrate(nextSession: Session | null) {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    if (nextSession?.user) {
      setRole(await fetchRole(nextSession.user.id));
    } else {
      setRole(null);
    }
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      hydrate(data.session).finally(() => setLoading(false));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      hydrate(nextSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function refreshProfile() {
    if (user) setRole(await fetchRole(user.id));
  }

  function hasRole(...roles: UserRole[]) {
    return role !== null && roles.includes(role);
  }

  const value: AuthContextValue = {
    user,
    session,
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
