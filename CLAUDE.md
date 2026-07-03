# CLAUDE.md — Session State for Lecture Summarizer ("Lectern")

## Current Roadmap Phase
Phase 1, Sub-phase 1A (Environment & Foundation)

## Last Completed Task
TASK-1.1 (Next.js 15 + TypeScript + Tailwind initialized; shadcn-style component
layer hand-built in `components/ui`; landing page + demo upload flow built and
verified with `tsc --noEmit`)

## Next Task to Resume From
TASK-1.2 (Create Supabase project; configure env vars; add
`lib/supabase/client.ts` + `lib/supabase/server.ts`)

## Environment Variables Configured
- NEXT_PUBLIC_SUPABASE_URL ⬜ (not yet configured — see `.env.example`)
- NEXT_PUBLIC_SUPABASE_ANON_KEY ⬜
- SUPABASE_SERVICE_ROLE_KEY ⬜
- GROQ_API_KEY ⬜
- GEMINI_API_KEY ⬜
- INNGEST_EVENT_KEY ⬜

## Known Issues / Blockers
- Google Fonts (Fraunces/Inter/IBM Plex Mono) load via `next/font/google` at
  build time — needs one live internet connection the first time `npm run
  dev`/`build` runs. No runtime CDN calls after that (Next.js self-hosts).
- `UploadDropzone` demo pipeline is a client-side `setTimeout` simulation only
  — no file actually leaves the browser yet. Real upload wiring starts at
  TASK-1.6/1.7, once Supabase Storage exists (TASK-1.2 onward).
- `next lint` prints a deprecation notice (removed in Next 16) but still
  works. Migrate to the ESLint CLI directly (`npx @next/codemod@canary
  next-lint-to-eslint-cli .`) before Next 16, not urgent now.

## Changelog
- Bumped `eslint` 8→9 + added flat `eslint.config.mjs` (`.eslintrc.json`
  removed) — clears the rimraf/inflight/glob/@humanwhocodes deprecation
  warnings that came from eslint 8's transitive deps. `npm install` is clean.
- Replaced the black+yellow palette (too close to the generic
  "near-black + one bright accent" AI-default look) with a plum-ink base
  (`#15121F`) and a coral/mint two-accent system — see README "Design
  system" table. `mint` is reserved for completion states so it stays
  meaningful, not decorative.

## Decisions Locked (do not re-litigate without explicit reason)
- No payments/monetization — permanently free public tool
- Shared API key model with generous soft-caps (not BYOK)
- Full TypeScript stack, no Python
- Inngest for job orchestration (not raw Supabase Edge Functions alone)
- shadcn/ui components hand-built (not via CLI) to keep the zip dependency-free
  and installable offline aside from the one-time font fetch

## Notes for Next Session
Design system is locked (see README "Design system" table) — reuse the same
tokens for every future page (login, upload, results, dashboard) rather than
introducing new colors/fonts per page. `Button` and `Card` in `components/ui`
are the base primitives; extend them instead of writing one-off styles.
