# Lectern
 
Turn a lecture recording into a summary, a set of study questions, and a searchable transcript. Free to use.
 
You upload (or import from a link) an audio/video file, and a background pipeline transcribes it, summarizes it, generates study questions, and embeds the transcript so you can search across everything you've uploaded or just ask questions about a specific lecture. Everything updates live on the page.



## Stack
 
| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router) | |
| UI | Tailwind + hand-built shadcn-style primitives in `components/ui` | avoids a CLI dependency, keeps the repo installable offline apart from one Google Fonts fetch |
| Auth / DB / Storage / Realtime | Supabase | free tier, one thing to manage |
| Job orchestration | Inngest | durable steps, retries per-step (not per-job), local dev dashboard |
| STT | Groq Whisper large-v3-turbo → Gemini 2.5 Flash fallback | |
| Summarization | Groq Llama → Gemini fallback | |
| Embeddings | Gemini embedding-001, 768-dim, pgvector | |
| Audio extraction | ffmpeg.wasm client-side, fluent-ffmpeg + Docker worker server-side | |
 
## Running it locally
 
```bash
npm install
npm run dev
```
 
You'll need a `.env.local` with:
 
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
GEMINI_API_KEY=
ENCRYPTION_KEY=      # 32 bytes hex — openssl rand -hex 32
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
INNGEST_EVENT_KEY=   # only needed once deployed; local dev runs Inngest in dev mode automatically
```
 
Run the Supabase migrations in `supabase/migrations` in order — they're numbered for a reason, several of them depend on extensions or tables created by earlier ones (pgvector, RLS policies, the realtime publication, etc).
 
If you want link-import to work locally, you'll also need the ffmpeg worker running:
 
```bash
cd worker
npm install
node server.js
```
 
and `FFMPEG_WORKER_URL` / `WORKER_SECRET` set in your env.


# Try it out
Deployed on Vercel at <a href="https://lectern-psi.vercel.app/">https://lectern-psi.vercel.app/</a>
