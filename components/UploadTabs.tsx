"use client";

import { useState } from "react";
import { UploadDropzone } from "@/components/UploadDropzone";
import { ImportLinkForm } from "@/components/ImportLinkForm";
import { cn } from "@/lib/utils";

interface UploadTabsProps {
  userId: string;
}

export function UploadTabs({ userId }: UploadTabsProps) {
  const [tab, setTab] = useState<"upload" | "link">("upload");

  return (
    <div>
      <div className="flex border-b mb-4">
        <TabButton active={tab === "upload"} onClick={() => setTab("upload")}>
          Upload a file
        </TabButton>
        <TabButton active={tab === "link"} onClick={() => setTab("link")}>
          Import from a link
        </TabButton>
      </div>

      {tab === "upload" ? <UploadDropzone userId={userId} /> : <ImportLinkForm />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}