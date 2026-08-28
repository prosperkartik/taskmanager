# TASKMANAGER

ADHD-friendly task board in Komi-Store neo-brutalist style. Big screen only (1100px+).

**Layout** — 20 / 60 / 20:
- **Left**: DAILY tasks (completion resets at local midnight) + KEEP AN EYE specials (never reset)
- **Center**: today's progress bar, add form with date+time picker, schedule (LATE / TODAY / UP NEXT)
- **Right**: WEEKLY (resets Monday) + MONTHLY (resets on the 1st)

Drag tasks between lists, confetti on completion, quick-add at the bottom of every column.

Extras: live EST clock in the header; ADHD MODE chip toggles completion sounds
(Web Audio, preference in localStorage); the faint eye icon in the topbar
switches to a fully separate purple **personal** board (`space` column in the
DB) — a refresh always reopens the work board.

## How resets work

No cron. A completed task stores the period key it was completed in
(`2026-08-28` / `2026-W35` / `2026-08`). When the local day/week/month rolls
over, the key no longer matches, so the task renders as not-done again.
Keep-an-eye items store `done` and never reset. Logic: `lib/periods.ts`.

## Stack

Next.js 15 (App Router) + Neon Postgres (Vercel marketplace integration, injects
`DATABASE_URL`/`POSTGRES_URL`). Schema auto-creates on first request (`lib/db.ts`).

## Run locally

```bash
vercel env pull   # writes .env.local with the Neon URL
npm install
npm run dev
```

## Deploy — IMPORTANT: previews only

The app is private: it must only be reachable with a Vercel login. On the Hobby
plan, Vercel Authentication covers **preview** deployments but not production
domains, so:

- `vercel.json` disables git deployments for `main` (a push never creates a
  public production deployment) and enables them for the `board` branch, which
  deploys as a **protected preview** with a stable URL:
  `https://taskmanager-git-board-prosperkartiks-projects.vercel.app`
- Ship: `git push origin main main:board` (board mirrors main and auto-deploys).
- `npm run ship` (= `vercel deploy`) also works but gets a fresh URL each time.
- Never run `vercel --prod` — that would create a publicly reachable production
  domain. If the account is upgraded to Pro, enable Vercel Authentication for
  all deployments in Project Settings → Deployment Protection, then production
  is safe to use.
