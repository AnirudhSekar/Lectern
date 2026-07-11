import { createClient } from '@/lib/supabase/server';
import { TrashList } from '@/components/TrashList';

export default async function TrashPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null; // layout already guards this, just satisfying types

  const { data: lectures } = await supabase
    .from('lectures')
    .select('id, title, status, duration_seconds, created_at, audio_storage_path, deleted_at')
    .eq('user_id', user.id)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 sm:py-16">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-highlighter">Trash</p>
      <h1 className="mt-2 font-display text-3xl text-paper sm:text-4xl">Deleted Lectures</h1>
      <p className="mt-2 text-sm text-paper-dim">
        Restore a lecture, or delete it permanently. Nothing here counts against your active lectures.
      </p>
      <div className="mt-10">
        <TrashList initialLectures={lectures ?? []} />
      </div>
    </main>
  );
}