"use client";

import { FormEvent, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage(
          "Account created. Check your email if email confirmation is enabled."
        );
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        router.push("/account");
        router.refresh();
      }
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#070b12] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a1019] p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">NEXORA AI</h1>
          <p className="mt-2 text-sm text-gray-500">
            Market Intelligence. One Clear Decision.
          </p>
        </div>

        <h2 className="mb-6 text-xl font-semibold">
          {isSignup ? "Create your account" : "Sign in"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-cyan-500 px-4 py-3 font-semibold text-black disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : isSignup
                ? "Create Account"
                : "Sign In"}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-sm text-gray-400">{message}</p>
        )}

        <button
          onClick={() => {
            setIsSignup(!isSignup);
            setMessage("");
          }}
          className="mt-6 w-full text-sm text-cyan-400 hover:text-cyan-300"
        >
          {isSignup
            ? "Already have an account? Sign in"
            : "New to NEXORA AI? Create an account"}
        </button>
      </div>
    </main>
  );
}
