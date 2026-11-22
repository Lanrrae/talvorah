
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-white mb-3">
          Welcome back
        </h1>

        <p className="text-gray-400 mb-10">
          Log in to your Talvorah account.
        </p>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-white mb-2">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full p-4 rounded-xl bg-gray-900 border border-gray-700 text-white"
            />
          </div>

          <div>
            <label className="block text-white mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full p-4 rounded-xl bg-gray-900 border border-gray-700 text-white"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold p-4 rounded-xl hover:bg-gray-200 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="text-gray-400 text-center mt-8">
          Don't have an account?{" "}
          <a href="/signup" className="text-white underline">
            Sign up
          </a>
        </p>
      </div>
    </main>
  );
}
