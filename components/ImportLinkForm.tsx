"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ProcessingSteps } from "./ProcessingSteps";

type Stage = "idle" | "importing" | "error";

export function ImportLinkForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setStage("importing");
    setErrorMessage("");

    try {
      const res = await fetch("/api/inngest/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStage("error");
        setErrorMessage(data.error || "Import failed. Please try again.");
        return;
      }

      if (!data.lecture?.id) {
        console.error("Unexpected response shape:", data);
        setStage("error");
        setErrorMessage("Import succeeded but response was malformed. Check console.");
        return;
      }

      router.push(`/lecture/${data.lecture.id}`);
    } catch {
      setStage("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="import-url" className="block text-xs font-mono uppercase tracking-wide text-paper-dim mb-1.5">
          Google Drive, Dropbox, or direct file link
        </label>
        <input
          id="import-url"
          type="url"
          placeholder="https://drive.google.com/file/d/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={stage === "importing"}
          required
          className="w-full rounded-lg border border-ink-rule bg-transparent px-3 py-2 text-sm text-paper placeholder:text-paper-dim focus:outline-none focus:border-highlighter disabled:opacity-50"
        />
      </div>

      {stage === "importing" && (
        <div className="mt-6">
          <ProcessingSteps
            steps={[
              { key: "import", label: "Import" },
              { key: "transcribe", label: "Transcribe" },
              { key: "summarize", label: "Summarize" },
            ]}
            currentIndex={0}
          />
          <p className="mt-4 text-xs text-paper-dim">Downloading and preparing file…</p>
        </div>
      )}

      {stage === "error" && (
        <p className="text-sm text-highlighter">{errorMessage}</p>
      )}

      <Button type="submit" disabled={stage === "importing" || !url.trim()} className="w-full">
        {stage === "importing" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Importing…
          </>
        ) : (
          "Import"
        )}
      </Button>
    </form>
  );
}