'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLectureStatus, type LectureStatus } from '@/hooks/useLectureStatus';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';
import { ProcessingSteps } from './ProcessingSteps';

interface StudyQuestion {
  question: string;
  answer_hint: string;
}

interface SummaryViewProps {
  lectureId: string;
  title: string;
  initialStatus: LectureStatus;
  summaryText: string | null;
  studyQuestions: StudyQuestion[];
  transcriptText: string | null;
}

const STATUS_LABEL: Record<LectureStatus, string> = {
  queued: 'Queued…',
  transcribing: 'Transcribing…',
  summarizing: 'Summarizing…',
  done: 'Done',
  failed: 'Failed',
};

export function SummaryView({
  lectureId,
  title,
  initialStatus,
  summaryText,
  studyQuestions,
  transcriptText,
}: SummaryViewProps) {
  const router = useRouter();
  const { status } = useLectureStatus(lectureId);
  const currentStatus = status ?? initialStatus;
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [showTranscript, setShowTranscript] = useState(false);

  // If the pipeline finishes AFTER this page already loaded, the
  // summary/transcript props above are stale (they were fetched
  // server-side before completion). router.refresh() re-runs the
  // server component to pull the now-populated rows, without a
  // full page reload.
  useEffect(() => {
    if (status && status !== initialStatus && (status === 'done' || status === 'failed')) {
      router.refresh();
    }
  }, [status, initialStatus, router]);

  const toggleQuestion = (index: number) => {
    setExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  if (currentStatus !== 'done') {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-center sm:py-24">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-highlighter">
        Processing
      </p>
      <h1 className="mt-4 font-display text-3xl text-paper sm:text-4xl">
        {title}
      </h1>
      {currentStatus === 'failed' ? (
        <p className="mt-6 text-highlighter font-medium">
          Something went wrong processing this lecture. Try uploading it again.
        </p>
      ) : (
        <div className="mt-10 animate-rise">
          <ProcessingSteps
            steps={[
              { key: "compress", label: "Compress" },
              { key: "upload", label: "Upload" },
              { key: "transcribe", label: "Transcribe" },
              { key: "summarize", label: "Summarize" },
            ]}
            currentIndex={currentStatus === "transcribing" ? 2 : 3}
          />
          <p className="mt-8 text-sm text-paper-dim">
            This page updates automatically — no need to refresh.
          </p>
        </div>
      )}
    </div>
  );
}

return (
  <div className="mx-auto max-w-3xl px-6 py-10 sm:py-16">
    <p className="font-mono text-xs uppercase tracking-[0.2em] text-highlighter animate-rise">
      Ready
    </p>
    <h1 className="mt-3 font-display text-3xl text-paper sm:text-4xl break-words animate-rise [animation-delay:75ms]">
      {title}
    </h1>

    <div className="mt-10 grid gap-4">
      <Card className="p-6 animate-rise [animation-delay:100ms]">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-highlighter/10 text-highlighter font-mono text-xs">
            01
          </span>
          <h2 className="font-display text-lg text-paper">Summary</h2>
        </div>
        <p className="mt-4 whitespace-pre-wrap leading-relaxed text-paper-dim">
          {summaryText ?? "No summary available."}
        </p>
      </Card>

      {studyQuestions.length > 0 && (
        <Card className="p-6 animate-rise [animation-delay:150ms]">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-highlighter/10 text-highlighter font-mono text-xs">
              02
            </span>
            <h2 className="font-display text-lg text-paper">Study Questions</h2>
          </div>
          <ul className="mt-4 space-y-2">
            {studyQuestions.map((q, i) => (
              <li
                key={i}
                className="rounded-sm border border-ink-rule transition-colors hover:border-highlighter/40"
              >
                <button
                  type="button"
                  onClick={() => toggleQuestion(i)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
                  aria-expanded={!!expanded[i]}
                >
                  <span className="text-paper">{q.question}</span>
                  <span
                    className={cn(
                      "shrink-0 font-mono text-highlighter transition-transform duration-200",
                      expanded[i] && "rotate-45"
                    )}
                  >
                    +
                  </span>
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-200 ease-out",
                    expanded[i] ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-4 pb-4 text-sm text-paper-dim leading-relaxed">
                      {q.answer_hint}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-6 animate-rise [animation-delay:200ms]">
        <button
          type="button"
          onClick={() => setShowTranscript((prev) => !prev)}
          className="flex w-full items-center gap-3 text-left"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-highlighter/10 text-highlighter font-mono text-xs">
            03
          </span>
          <h2 className="font-display text-lg text-paper">Full Transcript</h2>
          <span
            className={cn(
              "ml-auto text-paper-dim transition-transform duration-200",
              showTranscript && "rotate-180"
            )}
          >
          </span>
        </button>
        {showTranscript && (
          <div className="mt-4 max-h-96 overflow-y-auto rounded-sm border border-ink-rule bg-ink-rule/20 p-4 text-sm leading-relaxed whitespace-pre-wrap text-paper-dim">
            {transcriptText ?? "Transcript unavailable."}
          </div>
        )}
      </Card>
    </div>
  </div>
)};