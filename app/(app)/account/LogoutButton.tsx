"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/supabase/auth";

export function LogoutButton() {
  return (
    <Button onClick={() => signOut()} variant="ghost" className="mt-4 w-full">
      Log out
    </Button>
  );
}