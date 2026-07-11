"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { validateAudioFile, uploadLectureAudio } from "@/lib/supabase/storage";
import { createLectureRow, attachAudioPath } from "@/lib/supabase/lectures";
import { cn } from "@/lib/utils";
import { compressAudioForUpload } from "@/lib/audio/compress";
import { useRouter } from "next/navigation";
import { ProcessingSteps } from "./ProcessingSteps";
type Stage = "idle" | "validating" | "compressing" | "creating" | "uploading" | "done" | "error";
interface UploadDropzoneProps {
  userId: string;
}

export function UploadDropzone({ userId }: UploadDropzoneProps) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = useCallback(
    async (file: File) => {
      setFileName(file.name);
      setErrorMsg(null);
      setStage("validating");

      const validationError = validateAudioFile(file);
      if (validationError) {
        setErrorMsg(validationError);
        setStage("error");
        return;
      }

      const lectureId = crypto.randomUUID();
      const COMPRESS_THRESHOLD = 5 * 1024 * 1024; // below this, compression overhead isn't worth it

      try {
        let uploadFile = file;
        if (file.size > COMPRESS_THRESHOLD) {
          setStage("compressing");
          uploadFile = await compressAudioForUpload(file, setProgress);
          setProgress(0);
        }

        setStage("creating");
        await createLectureRow(userId, lectureId, file.name);

        setStage("uploading");
        const path = await uploadLectureAudio(userId, lectureId, uploadFile, setProgress);

      await attachAudioPath(lectureId, path);

        await fetch("/api/trigger-processing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lectureId }),
        });

        router.push(`/lecture/${lectureId}`);

      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Upload failed");
        setStage("error");
      }
    },
    [userId]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

const busy =
    stage === "validating" || stage === "compressing" || stage === "creating" || stage === "uploading";
  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-colors",
          isDragOver ? "border-highlighter bg-highlighter/5" : "border-ink-rule"
        )}
      >
        <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={onPick} />
        <p className="text-paper">
          {fileName ?? "Drop an audio file here, or click to choose one"}
        </p>
      </div>

     {stage !== "idle" && stage !== "error" && stage !== "done" && (
      <div className="mt-6">
        <ProcessingSteps
          steps={[
            { key: "compress", label: "Compress" },
            { key: "upload", label: "Upload" },
            { key: "transcribe", label: "Transcribe" },
            { key: "summarize", label: "Summarize" },
          ]}
          currentIndex={
            stage === "validating" || stage === "compressing" ? 0 :
            stage === "creating" || stage === "uploading" ? 1 : 0
          }
        />
      </div>
    )}

      {stage === "error" && (
        <p className="mt-4 text-sm text-highlighter">{errorMsg}</p>
      )}

      {busy && (
        <Button disabled className="mt-4 w-full">
          Working…
        </Button>
      )}
    </div>
  );
}