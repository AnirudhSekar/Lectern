'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function ImportLinkForm() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ingest/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Import failed');
      router.push(`/lecture/${data.lectureId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a Google Drive share link…"
          disabled={loading}
          className="w-full rounded-md border border-ink-rule bg-transparent px-3 py-2.5 text-sm text-paper placeholder:text-paper-dim focus:border-highlighter/50 focus:outline-none disabled:opacity-50"
        />
        <p className="mt-2 text-xs text-paper-dim">
          Make sure the file is shared as &ldquo;Anyone with the link can view.&rdquo;
        </p>
      </div>
      {error && <p className="text-sm text-highlighter">{error}</p>}
      <Button type="submit" disabled={loading || !url.trim()} className="w-full">
        {loading ? "Importing…" : "Import from Drive"}
      </Button>
    </form>
  );
}