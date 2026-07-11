'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Clock, Loader2, CheckCircle2, AlertCircle, Trash2, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useUserLectures, type LectureListItem } from '@/hooks/useUserLectures';
import { softDeleteLectures, restoreLectures } from '@/lib/supabase/lectures';
import type { LectureStatus } from '@/hooks/useLectureStatus';
import { cn } from '@/lib/utils';

const STATUS_META: Record<LectureStatus, { label: string; icon: typeof Clock; className: string }> = {
  queued: { label: 'Queued', icon: Clock, className: 'text-paper-dim' },
  transcribing: { label: 'Transcribing', icon: Loader2, className: 'text-highlighter' },
  summarizing: { label: 'Summarizing', icon: Loader2, className: 'text-highlighter' },
  done: { label: 'Done', icon: CheckCircle2, className: 'text-mint' },
  failed: { label: 'Failed', icon: AlertCircle, className: 'text-highlighter' },
};
const VISIBLE_COUNT = 5;

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  return `${Math.round(seconds / 60)} min`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

interface LectureListProps {
  userId: string;
  initialLectures: LectureListItem[];
}

const UNDO_WINDOW_MS = 6000;

export function LectureList({ userId, initialLectures }: LectureListProps) {
  const [lectures, setLectures] = useUserLectures(userId, initialLectures);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ ids: string[]; message: string } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showAll, setShowAll] = useState(false);
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const commitRemoval = (ids: string[]) => {
    setLectures((prev) => prev.filter((l) => !ids.includes(l.id)));
    setRemovingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  };

  const handleTrash = async (ids: string[]) => {
    setSelected(new Set());
    try {
      await softDeleteLectures(ids);

      // Animate out, then remove from local state after the transition.
      setRemovingIds((prev) => new Set([...prev, ...ids]));
      setTimeout(() => commitRemoval(ids), 250);

      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setToast({
        ids,
        message: ids.length === 1 ? 'Lecture moved to trash' : `${ids.length} lectures moved to trash`,
      });
      undoTimerRef.current = setTimeout(() => setToast(null), UNDO_WINDOW_MS);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleUndo = async () => {
    if (!toast) return;
    const ids = toast.ids;
    setToast(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    try {
      await restoreLectures(ids);
      // Rows were already removed from local state on delete — a full
      // reload from the server would be needed to bring them back in
      // place, so the simplest correct behavior is a refresh.
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Restore failed');
    }
  };

  if (lectures.length === 0) {
    return (
      <Link
        href="/upload"
        className="block cursor-pointer rounded-lg border-2 border-dashed border-ink-rule p-10 text-center transition-colors hover:border-highlighter hover:bg-highlighter/5"
      >
        <p className="text-paper">No lectures yet</p>
        <p className="mt-2 text-sm text-paper-dim">Upload your first one to get started</p>
      </Link>
    );
  }
  const visibleLectures = showAll ? lectures : lectures.slice(0, VISIBLE_COUNT);
  const hiddenCount = lectures.length - VISIBLE_COUNT;
  return (
    
    <div className="relative">
      {/* Bulk action bar — replaces nothing, just appears above the list */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-md border border-highlighter/30 bg-highlighter/5 px-4 py-2 animate-rise">
          <span className="font-mono text-xs uppercase tracking-wide text-paper">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleTrash([...selected])}
              className="flex items-center gap-1.5 font-mono text-xs uppercase text-highlighter hover:underline"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Move to trash
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="font-mono text-xs uppercase text-paper-dim hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ul className="grid gap-3">
        {visibleLectures.map((lecture, i) => {
          const meta = STATUS_META[lecture.status];
          const StatusIcon = meta.icon;
          const duration = formatDuration(lecture.duration_seconds);
          const isRemoving = removingIds.has(lecture.id);
          const isSelected = selected.has(lecture.id);

          return (
            <li
              key={lecture.id}
              className={cn(
                'animate-rise overflow-hidden transition-all duration-250 ease-out',
                isRemoving ? 'max-h-0 opacity-0 scale-95' : 'max-h-40 opacity-100 scale-100'
              )}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <Card
                className={cn(
                  'flex items-center gap-4 p-4 transition-colors',
                  isSelected ? 'border-highlighter/50' : 'hover:border-highlighter/40'
                )}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(lecture.id)}
                  className="h-4 w-4 shrink-0 rounded-sm border-ink-rule accent-highlighter"
                  aria-label={`Select ${lecture.title}`}
                />

                <Link href={`/lecture/${lecture.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-paper">{lecture.title}</p>
                  <p className="mt-1 font-mono text-xs text-paper-dim">
                    {formatDate(lecture.created_at)}
                    {duration && ` · ${duration}`}
                  </p>
                </Link>

                <div className={`flex shrink-0 items-center gap-2 text-sm ${meta.className}`}>
                  <StatusIcon className="h-4 w-4" aria-hidden />
                  <span className="font-mono text-xs uppercase tracking-wide">{meta.label}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleTrash([lecture.id])}
                  className="shrink-0 rounded-sm p-2 text-paper-dim transition-colors hover:bg-highlighter/10 hover:text-highlighter"
                  aria-label={`Delete ${lecture.title}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </Card>
            </li>
          );
        })}
      </ul>
      {!showAll && hiddenCount > 0 && (
        <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-3 flex w-full items-center bg-highlighter/80 justify-center gap-2 rounded-md border border-dashed border-ink-rule py-3 font-mono text-xs uppercase tracking-wide text-ink transition-colors hover:border-highlighter/40 hover:text-paper"
        >
            Show {hiddenCount} more
        </button>
        )}

        {showAll && lectures.length > VISIBLE_COUNT && (
        <button
            type="button"
            onClick={() => setShowAll(false)}
            className="mt-3 flex w-full items-center bg-highlighter/80 justify-center gap-2 rounded-md border border-dashed border-ink-rule py-3 font-mono text-xs uppercase tracking-wide text-ink transition-colors hover:border-highlighter/40 hover:text-paper"
        >
            Show less
        </button>
        )}
      {/* Undo toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-md border border-ink-rule bg-ink px-4 py-3 shadow-lg animate-rise">
          <span className="text-sm text-paper">{toast.message}</span>
          <button
            type="button"
            onClick={handleUndo}
            className="font-mono text-xs uppercase text-highlighter hover:underline"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-paper-dim hover:text-paper"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}