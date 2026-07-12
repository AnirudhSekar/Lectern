'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { UploadDropzone } from '@/components/UploadDropzone';
import { ImportLinkForm } from '@/components/ImportLinkForm';

export function UploadTabs({ userId }: { userId: string }) {
  const [tab, setTab] = useState<'file' | 'link'>('file');

  return (
    <div>
      <div className="mb-6 flex gap-1 rounded-md border border-ink-rule p-1">
        <button
          type="button"
          onClick={() => setTab('file')}
          className={cn(
            "flex-1 rounded-sm py-2 text-sm transition-colors",
            tab === 'file' ? "bg-highlighter/10 text-highlighter" : "text-paper-dim hover:text-paper"
          )}
        >
          Upload a file
        </button>
        <button
          type="button"
          onClick={() => setTab('link')}
          className={cn(
            "flex-1 rounded-sm py-2 text-sm transition-colors",
            tab === 'link' ? "bg-highlighter/10 text-highlighter" : "text-paper-dim hover:text-paper"
          )}
        >
          Import from a link
        </button>
      </div>

      {tab === 'file' ? <UploadDropzone userId={userId} /> : <ImportLinkForm />}
    </div>
  );
}