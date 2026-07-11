'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type LectureStatus =
  | 'queued'
  | 'transcribing'
  | 'summarizing'
  | 'done'
  | 'failed';

interface UseLectureStatusResult {
  status: LectureStatus | null;
  loading: boolean;
  error: string | null;
}

export function useLectureStatus(lectureId: string): UseLectureStatusResult {
  const [status, setStatus] = useState<LectureStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lectureId) return;

    const supabase = createClient();
    let isMounted = true;

    async function fetchInitialStatus() {
      const { data, error: fetchError } = await supabase
        .from('lectures')
        .select('status')
        .eq('id', lectureId)
        .single();

      if (!isMounted) return;

      if (fetchError) {
        setError(fetchError.message);
      } else if (data) {
        setStatus(data.status as LectureStatus);
      }
      setLoading(false);
    }

    fetchInitialStatus();

    const channel = supabase
      .channel(`lecture-status-${lectureId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lectures',
          filter: `id=eq.${lectureId}`,
        },
        (payload) => {
          if (!isMounted) return;
          const newStatus = (payload.new as { status: LectureStatus }).status;
          setStatus(newStatus);
        }
      )
      .subscribe((subscribeStatus, err) => {
        if (subscribeStatus === 'CHANNEL_ERROR' || subscribeStatus === 'TIMED_OUT') {
          if (isMounted) {
            setError(err?.message ?? 'Realtime subscription failed');
          }
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [lectureId]);

  return { status, loading, error };
}