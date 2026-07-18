# nexUni.living

nexUni.living is a bilingual student housing and roommate platform for
universities and localities across Bangladesh.

## Features

- University- and locality-aware room discovery
- Mess, bachelor, sublet, and roommate listings
- Interactive maps and campus proximity
- Booking requests with atomic seat inventory
- Direct messaging and notifications
- Student and owner verification
- Reviews, saved listings, reports, and admin moderation
- Bangla and English interfaces
- Installable Progressive Web App

## Technology

- Next.js 16, React 19, TypeScript, and Tailwind CSS
- Supabase Auth, PostgreSQL, Storage, Realtime, and RLS
- Leaflet and OpenStreetMap
- Resend, Upstash Redis, Sentry, and Vercel Analytics

## Local development

Use Node.js 20.9 or newer.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

Run the public interface without a database or credentials:

```bash
npm run dev:no-data
```

No-data mode uses the committed, non-secret `config/no-data.env` file. Data,
authentication, booking, messaging, and uploads are intentionally unavailable.

Run against the configured shared public Supabase data:

```bash
npm run dev:data
```

Authenticated actions in data mode can affect the shared database. Environment
separation and schema synchronization are documented in
[`docs/database-environments.md`](docs/database-environments.md).

Environment setup and production instructions are documented in
[`docs/local-and-cpanel-deployment.md`](docs/local-and-cpanel-deployment.md).
Teammate access, safe secret handling, deployment, smoke tests and rollback are
covered by [`docs/team-deployment-runbook.md`](docs/team-deployment-runbook.md).

## Verification

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Build a standalone cPanel/Passenger artifact:

```bash
npm run build:cpanel
```

The resulting artifact is written to `.next/standalone`.

Build, upload, restart Passenger and smoke-test the Namecheap deployment:

```bash
npm run deploy:cpanel
```
