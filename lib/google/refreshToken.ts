import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto/encryption";

export async function getValidGoogleAccessToken(userId: string): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("google_oauth_tokens")
    .select("refresh_token_encrypted")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("No Google refresh token on file. User needs to reconnect Drive access.");
  }

  const refreshToken = decrypt(data.refresh_token_encrypted);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
const body = await res.text();
  console.error("Google token refresh error body:", body);
  throw new Error(`Google token refresh failed (${res.status}). User may need to reconnect.`);  }

  const json = await res.json();
  return json.access_token;
}