'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, X, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface SearchResult {
  lecture_id: string;
  title: string;
  chunk_content: string;
  start_char: number;
  similarity: number;
}

export function SemanticSearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Search failed');
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults(null);
    setError(null);
  };

  return (
    <div className="mb-8">
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-dim" aria-hidden />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search across all your lectures — try a concept, not just a keyword"
          className="w-full rounded-md border border-ink-rule bg-transparent py-2.5 pl-10 pr-10 text-sm text-paper placeholder:text-paper-dim focus:border-highlighter/50 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-paper-dim hover:text-paper"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </form>

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-paper-dim">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Searching your lectures…
        </div>
      )}

      {error && <p className="mt-4 text-sm text-highlighter">{error}</p>}

      {results && !loading && (
        <div className="mt-4">
          {results.length === 0 ? (
            <p className="text-sm text-paper-dim">
              No matches found. Try a different phrase, or wait for more lectures to finish processing.
            </p>
          ) : (
            <ul className="grid gap-2">
              {results.map((result) => (
                <li key={result.lecture_id}>
                  <Link href={`/lecture/${result.lecture_id}?highlight=${result.start_char}`}>
                    <Card className="p-4 transition-colors hover:border-highlighter/40">
                        <div className="flex items-center justify-between gap-4">
                            <span className="truncate text-paper">{result.title}</span>
                            <span className="shrink-0 font-mono text-xs text-paper-dim">
                                {Math.round(result.similarity * 100)}% match
                            </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-paper-dim">
                        …{result.chunk_content.trim()}…
                        </p>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}