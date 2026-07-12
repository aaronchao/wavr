# Wavr

Free, browser-based podcast discovery — what to listen to next, and why.
See `CLAUDE.md` (build spec) and `PRD.md` (product).

## Develop

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys (optional for M0)
npm run dev                  # http://localhost:3000
```

`npm run build` / `npm run lint` / `npx tsc --noEmit` must stay green.

## Deploy

Vercel (Hobby): import this repo, set the `NEXT_PUBLIC_SUPABASE_*` env
vars, done — every push deploys.
