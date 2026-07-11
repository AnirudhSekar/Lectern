import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { LectureList } from '@/components/LectureList';
import { Button } from '@/components/ui/button';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: lectures } = await supabase
  .from('lectures')
  .select('id, title, status, duration_seconds, created_at, audio_storage_path, deleted_at')
  .eq('user_id', user.id)
  .is('deleted_at', null)
  .order('created_at', { ascending: false });
  return (
    <main className="mx-auto max-w-4xl px-6 py-10 sm:py-16">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-highlighter">
            Dashboard
          </p>
          <h1 className="mt-2 font-display text-3xl text-paper sm:text-4xl">
            My Lectures
          </h1>
        </div>
        <Link href="/upload">
          <Button className="text-xs">Upload new</Button>
        </Link>
      </header>

      <div className="mt-10">
        <LectureList userId={user.id} initialLectures={lectures ?? []} />
      </div>
    </main>
  );
}