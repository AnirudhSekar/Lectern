'use client';

import Link from 'next/link';
import { Clock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserLectures, type LectureListItem } from '@/hooks/useUserLectures';
import type { LectureStatus } from '@/hooks/useLectureStatus';

const STATUS_META: Record<LectureStatus, { label: string; icon: typeof Clock; className: string }> = {
  queued: { label: 'Queued', icon: Clock, className: 'text-paper-dim' },
  transcribing: { label: 'Transcribing', icon: Loader2, className: 'text-highlighter' },
summarizing: { label: 'Summarizing', icon: Loader2, className: 'text-highlighter' },
  done: { label: 'Done', icon: CheckCircle2, className: 'text-mint' },
  failed: { label: 'Failed', icon: AlertCircle, className: 'text-highlighter' },
};

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface LectureListProps {
  userId: string;
  initialLectures: LectureListItem[];
}

export function LectureList({ userId, initialLectures }: LectureListProps) {
  const lectures = useUserLectures(userId, initialLectures);

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

  return (
    <ul className="grid gap-3">
      {lectures.map((lecture, i) => {
        const meta = STATUS_META[lecture.status];
        const StatusIcon = meta.icon;
        const duration = formatDuration(lecture.duration_seconds);

        return (
          <li key={lecture.id} className="animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
            <Link href={`/lecture/${lecture.id}`}>
              <Card className="flex items-center justify-between gap-4 p-4 transition-colors hover:border-highlighter/40">
                <div className="min-w-0">
                  <p className="truncate text-paper">{lecture.title}</p>
                  <p className="mt-1 font-mono text-xs text-paper-dim">
                    {formatDate(lecture.created_at)}
                    {duration && ` · ${duration}`}
                  </p>
                </div>
                <div className={`flex shrink-0 items-center gap-2 text-sm ${meta.className}`}>
                  <StatusIcon className="h-4 w-4" aria-hidden />
                  <span className="font-mono text-xs uppercase tracking-wide">{meta.label}</span>
                </div>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}