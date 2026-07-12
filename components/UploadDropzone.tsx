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
  const [isVideoFile, setIsVideoFile] = useState(false);
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
      setIsVideoFile(file.type.startsWith("video/"));
      setStage("validating");

      const validationError = validateAudioFile(file);
      if (validationError) {
        setErrorMsg(validationError);
        setStage("error");
        return;
      }

      const lectureId = crypto.randomUUID();
      const COMPRESS_THRESHOLD = 5 * 1024 * 1024;
      const isVideo = file.type.startsWith("video/");

      try {
        let uploadFile = file;
        if (isVideo || file.size > COMPRESS_THRESHOLD) {
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
      <input ref={inputRef} type="file" accept="audio/*,video/mp4" className="hidden" onChange={onPick} />        
      <p className="text-paper">
          {fileName ?? "Drop an audio file or MP4 video here, or click to choose one"}
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

    {(stage === "compressing" || stage === "uploading") && (
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-paper-dim">
          <span>{stage === "compressing" && `${isVideoFile ? "Extracting audio" : "Compressing audio"}… ${progress}%`}</span>
          <span className="font-mono">{progress}%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-rule">
          <div
            className="h-full rounded-full bg-highlighter transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )}

    {stage === "creating" && (
      <p className="mt-4 text-xs text-paper-dim">Creating lecture record…</p>
    )}
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