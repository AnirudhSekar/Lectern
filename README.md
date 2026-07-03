# Lectern — TASK-1.1 Scaffold

Foundation build per `BUILD_PLAN.md`, Sub-phase 1A, TASK-1.1: Next.js 15 +
TypeScript + Tailwind, with a shadcn-style component layer (`components/ui`)
built by hand rather than via the shadcn CLI, so the zip installs and runs
with zero external accounts.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Test on mobile by opening the same URL from your
phone on the same network, or resize the browser — layout collapses from a
two-column hero to single-column under the `lg` breakpoint.

> Fonts (Fraunces / Inter / IBM Plex Mono) load from Google Fonts at
> dev/build time via `next/font`. Needs a normal internet connection once —
> after that Next.js self-hosts them, no runtime CDN calls.

## What's real vs. demo in this build

- **Real:** page shell, design system (colors/type in `tailwind.config.ts` +
  `app/globals.css`), responsive layout, all components.
- **Demo only:** the upload dropzone runs a client-side timer to simulate the
  `queued → transcribing → summarizing → done` pipeline. No file is uploaded
  anywhere — Supabase Storage and the Inngest pipeline aren't wired up yet.
  That's TASK-1.2 through TASK-1.12.

## Design system

| Token | Value | Use |
|---|---|---|
| `ink` | `#15121F` | page background (deep plum, not pure black) |
| `ink-raised` | `#1E1A2E` | cards |
| `ink-rule` | `#332C49` | borders/dividers |
| `paper` | `#F1EEF5` | primary text |
| `paper-dim` | `#948FB0` | secondary text |
| `highlighter` | `#FF7A59` | primary accent — CTAs, active/in-progress states |
| `mint` | `#5EEAD4` | secondary accent — completion/success states only |

Two-accent system, not one: coral marks attention and action, mint is reserved
for "this finished successfully" so it stays meaningful instead of decorative.

Fonts: Fraunces (display), Inter (body), IBM Plex Mono (status/timestamps),
loaded via `next/font/google` — no external font CDN, no layout shift.

## Next steps (per BUILD_PLAN.md)

1. TASK-1.2 — create Supabase project, wire `lib/supabase/client.ts` + `server.ts`
2. TASK-1.3 — run the initial migration (see §1.4 of the build plan for schema)
3. TASK-1.4 — Google OAuth via Supabase Auth
4. Continue in Task ID order — each task lists Blocked-By and a Definition of Done.

Keep `CLAUDE.md` (template in §4.2 of the build plan) updated after each task
so a new chat session can resume without re-explaining the project.
