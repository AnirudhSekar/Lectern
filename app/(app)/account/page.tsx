import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./LogoutButton";
import Link from "next/link";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm rounded-lg border border-ink-rule bg-ink-raised p-8 text-center">
        <h1 className="font-display text-2xl text-paper">You&apos;re in</h1>
        <p className="mt-2 text-sm text-paper-dim">{user.email}</p>
        <Link href="/upload" className="mt-6 block">
          <Button className="w-full gap-2">
            <UploadCloud className="h-4 w-4" />
            Upload a lecture
          </Button>
        </Link>
        <LogoutButton />
      </div>
    </main>
  );
}