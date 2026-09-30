/**
 * src/pages/Login.tsx
 *
 * There's no sign-in screen anywhere in the current app, and every RLS
 * policy is scoped `TO authenticated` — so this isn't optional polish,
 * it's required for any Supabase query to return data at all.
 *
 * Uses the same useAuth() from AuthContext.tsx, so drop this in alongside it.
 */
import React, { useState } from "react";
import { useAuth } from "@/lib/procurement/AuthContext";

export function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) setError(signInError);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-8"
      >
        <h1 className="text-lg font-semibold text-slate-900 mb-1">AURA ERP</h1>
        <p className="text-sm text-slate-500 mb-6">Sign in to continue</p>

        <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-slate-400"
          placeholder="you@company.com"
        />

        <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-slate-400"
          placeholder="••••••••"
        />

        {error && (
          <p className="text-xs text-red-600 mb-4">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-slate-900 text-white text-sm font-medium py-2.5 disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default Login;
