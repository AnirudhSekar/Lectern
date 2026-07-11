'use client';

import { useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { restoreLectures, permanentlyDeleteLecture } from '@/lib/supabase/lectures';
import type { LectureListItem } from '@/hooks/useUserLectures';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function TrashList({ initialLectures }: { initialLectures: LectureListItem[] }) {
  const [lectures, setLectures] = useState(initialLectures);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleRestore = async (id: string) => {
    setBusyId(id);
    try {
      await restoreLectures([id]);
      setLectures((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setBusyId(null);
    }
  };

  const handlePermanentDelete = async (lecture: LectureListItem) => {
    setBusyId(lecture.id);
    try {
      await permanentlyDeleteLecture(lecture.id, lecture.audio_storage_path);
      setLectures((prev) => prev.filter((l) => l.id !== lecture.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Permanent delete failed');
    } finally {
      setBusyId(null);
      setConfirmingId(null);
    }
  };

  if (lectures.length === 0) {
    return <p className="text-sm text-paper-dim">Trash is empty.</p>;
  }

  return (
    <ul className="grid gap-3">
      {lectures.map((lecture) => (
        <li key={lecture.id}>
          <Card className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-paper">{lecture.title}</p>
              <p className="mt-1 font-mono text-xs text-paper-dim">
                Deleted {lecture.deleted_at && formatDate(lecture.deleted_at)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleRestore(lecture.id)}
              disabled={busyId === lecture.id}
              className="flex shrink-0 items-center gap-1.5 font-mono text-xs uppercase text-mint hover:underline disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Restore
            </button>

            {confirmingId === lecture.id ? (
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => handlePermanentDelete(lecture)}
                  disabled={busyId === lecture.id}
                  className="font-mono text-xs uppercase text-highlighter hover:underline disabled:opacity-50"
                >
                  {busyId === lecture.id ? 'Deleting…' : 'Confirm forever'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingId(null)}
                  className="font-mono text-xs uppercase text-paper-dim hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingId(lecture.id)}
                className="shrink-0 rounded-sm p-2 text-paper-dim transition-colors hover:bg-highlighter/10 hover:text-highlighter"
                aria-label={`Delete ${lecture.title} permanently`}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
}