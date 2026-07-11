"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/supabase/auth";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm rounded-lg border border-ink-rule bg-ink-raised p-8 text-center">
        <h1 className="font-display text-2xl text-paper">Log in to Lectern</h1>
        <p className="mt-2 text-sm text-paper-dim">
          Upload lectures, get summaries, study smarter.
        </p>
        <Button onClick={handleLogin} disabled={loading} className="mt-6 w-full">
          {loading ? "Redirecting…" : "Continue with Google"}
        </Button>
        {error && <p className="mt-3 text-sm text-highlighter">{error}</p>}
      </div>
    </main>
  );
}