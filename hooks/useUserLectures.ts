'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { LectureStatus } from '@/hooks/useLectureStatus';

export interface LectureListItem {
  id: string;
  title: string;
  status: LectureStatus;
  duration_seconds: number | null;
  created_at: string;
}

export function useUserLectures(userId: string, initialLectures: LectureListItem[]) {
  const [lectures, setLectures] = useState<LectureListItem[]>(initialLectures);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    let isMounted = true;

    const channel = supabase
      .channel(`user-lectures-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lectures',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!isMounted) return;
          const updated = payload.new as { id: string; status: LectureStatus };
          setLectures((prev) =>
            prev.map((lecture) =>
              lecture.id === updated.id ? { ...lecture, status: updated.status } : lecture
            )
          );
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return lectures;
}