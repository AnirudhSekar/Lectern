import { Mic, FileText, ListChecks } from "lucide-react";
import { Waveform } from "@/components/Waveform";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link"
import { createClient } from "@/lib/supabase/server";
import {redirect} from "next/navigation";
import { Logo } from "@/components/Logo";
const STEPS = [
  {
    icon: Mic,
    title: "Record or upload",
    body: "Drop in a lecture recording, or capture one live from your browser in Phase 2.",
  },
  {
    icon: FileText,
    title: "We transcribe it",
    body: "Groq's Whisper turns speech into a clean, searchable transcript in minutes.",
  },
  {
    icon: ListChecks,
    title: "You get study material",
    body: "A short summary and a set of study questions, generated from what was actually said.",
  },
];

export default async function Home() {
    const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }
  return (
    <main className="mx-auto max-w-6xl px-6 py-10 sm:py-16">
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Logo />
          <span className="font-display text-lg italic text-paper">Lectern</span>
        </span>
        <Link href="/login">
          <Button variant="secondary" className="text-xs">
            Sign in
          </Button>
        </Link> 
      </header>

      <section className="mt-16 grid gap-12 sm:mt-24 lg:grid-cols-2 lg:items-center lg:gap-8">
        <div className="animate-rise">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-highlighter">
            Free for students
          </p>
          <h1 className="mt-4 font-display text-4xl leading-[1.1] text-paper sm:text-5xl lg:text-6xl">
            Every lecture,{" "}
            <em className="not-italic highlight-mark">already highlighted.</em>
          </h1>
          <p className="mt-6 max-w-md text-base text-paper-dim sm:text-lg">
            Upload the recording. Get back a clean summary, study questions, and
            a transcript you can actually search — before you&apos;d have
            finished typing your notes.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
          href="/login"
          className="animate-rise block cursor-pointer rounded-lg text-center transition-colors hover:border-highlighter hover:bg-highlighter/5 [animation-delay:150ms]"
        >
            <Button>Try it with a lecture</Button>
            </Link>
          </div>
        </div>

        <Link
          href="/login"
          className="animate-rise block cursor-pointer rounded-lg border-2 border-dashed border-ink-rule p-10 text-center transition-colors hover:border-highlighter hover:bg-highlighter/5 [animation-delay:150ms]"
        >
          <p className="text-paper">Log in to upload your first lecture</p>
          <p className="mt-2 text-sm text-paper-dim">Free, no card required</p>
        </Link>
      </section>

      <section className="mt-24 sm:mt-32">
        <div className="flex items-center gap-4">
          <Waveform className="h-10 w-32 shrink-0" />
          <h2 className="font-display text-2xl text-paper sm:text-3xl">
            How it gets from audio to answers
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <Card key={title} className="p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-highlighter/10 text-highlighter">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="font-mono text-xs text-paper-dim">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-4 font-display text-lg text-paper">{title}</h3>
              <p className="mt-2 text-sm text-paper-dim">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="mt-24 flex flex-col gap-2 border-t border-ink-rule py-8 text-xs text-paper-dim sm:mt-32 sm:flex-row sm:items-center sm:justify-between">
        <span>Lectern — a free tool, permanently. No payment tier planned.</span>
        <span className="font-mono">Phase 1 · TASK-1.1 scaffold</span>
      </footer>
    </main>
  );
}
