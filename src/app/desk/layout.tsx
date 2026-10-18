'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { Lock, Mail, KeyRound, LogOut, ShieldCheck, Utensils, AlertCircle } from 'lucide-react';

export default function DeskLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // 1. Check existing session on load
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
      setLoading(false);
    }
    checkAuth();

    // 2. Listen for auth changes (login, logout)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSubmitting(true);

    try {
      if (isRegistering) {
        // Register new staff account
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) throw error;
        if (data.user) {
          setUser(data.user);
        }
      } else {
        // Sign in existing staff
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) throw error;
        if (data.user) {
          setUser(data.user);
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      setAuthError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-cafe-ivory flex flex-col items-center justify-center text-xs text-cafe-espresso gap-2">
        <div className="w-6 h-6 border-2 border-cafe-clay border-t-transparent rounded-full animate-spin" />
        <span>Verifying admin credentials...</span>
      </div>
    );
  }

  // 2. Locked Screen (Show Login Form if unauthenticated)
  if (!user) {
    return (
      <main className="min-h-screen bg-cafe-ivory flex items-center justify-center p-4">
        <div className="bg-white/90 border border-cafe-warmGrey w-full max-w-sm rounded-3xl p-6 lg:p-8 shadow-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-cafe-oat rounded-2xl text-cafe-clay shadow-sm mb-1">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="font-heading font-black text-2xl text-cafe-deepEspresso flex items-center justify-center gap-1.5">
              <Utensils className="w-5 h-5 text-cafe-clay" /> Desk Access
            </h1>
            <p className="text-xs text-cafe-espresso/70">
              Staff &amp; Cashier Authentication Required
            </p>
          </div>

          {authError && (
            <div className="p-3 text-xs bg-red-100 text-red-800 rounded-xl flex items-start gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* Login / Register Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-cafe-espresso/70 uppercase tracking-wider block mb-1">
                Staff Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-cafe-warmGrey" />
                <input
                  type="email"
                  required
                  placeholder="admin@larascafe.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-cafe-ivory/60 border border-cafe-warmGrey rounded-xl text-cafe-espresso focus:outline-none focus:ring-1 focus:ring-cafe-clay"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-cafe-espresso/70 uppercase tracking-wider block mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-cafe-warmGrey" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-cafe-ivory/60 border border-cafe-warmGrey rounded-xl text-cafe-espresso focus:outline-none focus:ring-1 focus:ring-cafe-clay"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-cafe-clay hover:bg-cafe-rosewood text-white font-bold rounded-xl shadow transition cursor-pointer disabled:opacity-50"
            >
              {submitting
                ? 'Verifying...'
                : isRegistering
                ? 'Create Staff Account'
                : 'Sign In to Terminal'}
            </button>
          </form>

          {/* Toggle between Login and Register */}
          <div className="pt-3 border-t border-cafe-warmGrey/30 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setAuthError(null);
              }}
              className="text-[11px] text-cafe-clay font-semibold hover:underline cursor-pointer"
            >
              {isRegistering
                ? 'Already have an account? Sign In'
                : 'Need to create the first admin account? Register here'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // 3. Authenticated: Render children with persistent Admin Status & Logout Bar
  return (
    <div className="min-h-screen bg-cafe-ivory">
      {/* Top Admin Security Strip */}
      <div className="bg-cafe-midnightNavy text-cafe-ivory px-4 py-1.5 flex justify-between items-center text-[11px] border-b border-white/10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            Staff Session: <strong className="text-cafe-oat">{user.email}</strong>
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1 text-red-300 hover:text-white transition cursor-pointer font-semibold"
        >
          <LogOut className="w-3 h-3" /> Log Out
        </button>
      </div>

      {/* Desk Content (Terminal / Stock / Analytics) */}
      {children}
    </div>
  );
}