'use client';

import { useState, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function LectureChat({ lectureId }: { lectureId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || isStreaming) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: question }, { role: 'assistant', content: '' }]);
    setIsStreaming(true);

    try {
      const res = await fetch(`/api/lecture/${lectureId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!res.body) throw new Error('No response stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });

        scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: "Sorry, something went wrong answering that. Try again?",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-highlighter/10 font-mono text-xs text-highlighter">
          Q&A
        </span>
        <h2 className="font-display text-lg text-paper">Ask about this lecture</h2>
      </div>

      {messages.length === 0 && (
        <p className="text-sm text-paper-dim">
          Ask a question and I&apos;ll answer using only what&apos;s actually in this lecture.
        </p>
      )}

      <div className="max-h-96 space-y-3 overflow-y-auto">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={
              msg.role === 'user'
                ? 'ml-auto max-w-[85%] rounded-md bg-highlighter/10 px-3 py-2 text-sm text-paper'
                : 'mr-auto max-w-[85%] whitespace-pre-wrap rounded-md bg-ink-rule/20 px-3 py-2 text-sm text-paper-dim'
            }
          >
            {msg.content || (isStreaming && i === messages.length - 1 ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : null)}
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSend} className="mt-4 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. What did they say about..."
          disabled={isStreaming}
          className="flex-1 rounded-md border border-ink-rule bg-transparent px-3 py-2 text-sm text-paper placeholder:text-paper-dim focus:border-highlighter/50 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-highlighter/10 text-highlighter transition-colors hover:bg-highlighter/20 disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </Card>
  );
}