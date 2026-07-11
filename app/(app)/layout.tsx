import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/AppHeader';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen">
      <AppHeader
        email={user.email ?? ''}
        name={user.user_metadata?.full_name ?? null}
        avatarUrl={user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null}
      />
      {children}
    </div>
  );
}