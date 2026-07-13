"use client";

import { createClient } from "@/lib/supabase/client";

export async function signInWithGoogle() {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    scopes: "https://www.googleapis.com/auth/drive.readonly",
    queryParams: {
      access_type: "offline",
      prompt: "consent",
    },
    redirectTo: `${location.origin}/auth/callback`,
  },
});
  if (error) throw error;
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.location.href = "/";
}