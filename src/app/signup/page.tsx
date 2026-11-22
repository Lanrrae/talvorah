
"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const supabase = createClient();

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Account created! Check your email to confirm your account.");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2">Create your account</h1>
        <p className="text-gray-400 mb-8">
          Join Talvorah and bring your work together.
        </p>

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className="block mb-2 text-sm">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg bg-gray-900 border border-gray-700 p-3 outline-none"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              className="w-full rounded-lg bg-gray-900 border border-gray-700 p-3 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white text-black font-semibold p-3 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          {message && (
            <p className="text-sm text-gray-300">{message}</p>
          )}
        </form>

        <p className="text-gray-400 text-sm mt-6 text-center">
          Already have an account? <a href="/login" className="text-white underline">Log in</a>
        </p>
      </div>
    </main>
  );
}
