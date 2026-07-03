"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileAudio, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Stage = "idle" | "queued" | "transcribing" | "summarizing" | "done";

const STAGE_LABEL: Record<Exclude<Stage, "idle">, string> = {
  queued: "Queued",
  transcribing: "Transcribing",
  summarizing: "Writing summary",
  done: "Ready to study",
};

const STAGE_ORDER: Stage[] = ["queued", "transcribing", "summarizing", "done"];

export function UploadDropzone() {
  const [stage, setStage] = useState<Stage>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutIds = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      timeoutIds.current.forEach(clearTimeout);
    };
  }, []);

  const runDemoPipeline = useCallback((name: string) => {
    setFileName(name);
    timeoutIds.current.forEach(clearTimeout);
    timeoutIds.current = STAGE_ORDER.map((s, i) =>
      setTimeout(() => setStage(s), (i + 1) * 900)
    );
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      runDemoPipeline(file.name);
    },
    [runDemoPipeline]
  );

  return (
    <Card>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-md border-2 border-dashed border-ink-rule px-6 py-10 text-center transition-colors",
          isDragOver && "border-highlighter bg-highlighter/5"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <UploadCloud className="h-7 w-7 text-paper-dim" aria-hidden />
        <div>
          <p className="font-medium text-paper">Drop a lecture recording here</p>
          <p className="mt-1 text-sm text-paper-dim">
            or click to browse — MP3, M4A, WAV up to 200MB
          </p>
        </div>
      </div>

      {fileName && (
        <div className="border-t border-ink-rule px-6 py-5">
          <div className="flex items-center gap-3">
            <FileAudio className="h-5 w-5 shrink-0 text-highlighter" aria-hidden />
            <span className="truncate text-sm text-paper">{fileName}</span>
          </div>
          <ol className="mt-4 flex flex-wrap gap-2 font-mono text-xs">
            {STAGE_ORDER.map((s) => {
              const reached =
                stage !== "idle" && STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf(s);
              const isDone = s === "done" && reached;
              return (
                <li
                  key={s}
                  className={cn(
                    "rounded-sm border px-2.5 py-1 transition-colors",
                    isDone
                      ? "border-mint/40 bg-mint/10 text-mint"
                      : reached
                        ? "border-highlighter/40 bg-highlighter/10 text-highlighter"
                        : "border-ink-rule text-paper-dim"
                  )}
                >
                  {STAGE_LABEL[s as Exclude<Stage, "idle">]}
                </li>
              );
            })}
          </ol>
          {stage === "done" && (
            <p className="mt-4 text-sm text-paper-dim">
              This is a local UI preview — the transcription pipeline connects in
              Sub-phase 1C.
            </p>
          )}
        </div>
      )}

      {!fileName && (
        <div className="border-t border-ink-rule px-6 py-4 text-center">
          <Button
            variant="ghost"
            className="text-xs"
            onClick={() => runDemoPipeline("intro-to-thermodynamics.m4a")}
          >
            or preview with a sample file →
          </Button>
        </div>
      )}
    </Card>
  );
}
