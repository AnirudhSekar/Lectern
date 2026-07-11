import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SummaryView } from '@/components/SummaryView';

interface LecturePageProps {
  params: Promise<{ id: string }>; // Next.js 15: params is a Promise in server components
}

export default async function LecturePage({ params }: LecturePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lecture, error: lectureError } = await supabase
    .from('lectures')
    .select('id, title, status, created_at, completed_at')
    .eq('id', id)
    .single();

  if (lectureError || !lecture) {
    notFound();
  }

  const { data: summary } = await supabase
    .from('summaries')
    .select('summary_text, study_questions')
    .eq('lecture_id', id)
    .single();

  const { data: transcript } = await supabase
    .from('transcripts')
    .select('full_text')
    .eq('lecture_id', id)
    .single();

  return (
    <SummaryView
      lectureId={lecture.id}
      title={lecture.title}
      initialStatus={lecture.status}
      summaryText={summary?.summary_text ?? null}
      studyQuestions={summary?.study_questions ?? []}
      transcriptText={transcript?.full_text ?? null}
    />
  );
}