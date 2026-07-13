import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto/encryption";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.provider_refresh_token) {
      const encrypted = encrypt(session.provider_refresh_token);
      await supabase.from("google_oauth_tokens").upsert({
        user_id: session.user.id,
        refresh_token_encrypted: encrypted,
        updated_at: new Date().toISOString(),
      });
    
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  
}
  return NextResponse.redirect(`${origin}/login?error=auth`);
}