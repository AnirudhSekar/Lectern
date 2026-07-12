import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UploadTabs } from "@/components/UploadTabs";

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-lg">
        <h1 className="font-display text-2xl text-paper">Upload a lecture</h1>
        <p className="mt-2 text-sm text-paper-dim">
          Audio Files. We&apos;ll transcribe and summarize it.
        </p>
        <div className="mt-6">
          <UploadTabs userId={user.id} />
        </div>
      </div>
    </main>
  );
}