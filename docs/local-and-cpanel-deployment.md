# nexUni.living local and cPanel deployment

## 1. Local prerequisites

- Node.js 20.9 or newer (Node.js 22 LTS recommended)
- npm
- A Supabase project with the migrations in `supabase/migrations` applied

### UI-only no-data mode

No credentials or local database are required:

```bash
cd /Volumes/THINGKERS/developments/studentService/nexuni.living
npm ci
npm run dev:no-data
```

Open `http://localhost:3000`. The tracked `config/no-data.env` file supplies
safe placeholder values and explicitly disables all server-side public data
queries. A banner identifies this mode. Authentication, protected pages,
listings data, bookings, messages, uploads, and admin actions are unavailable.

Use `npm run build:no-data` to verify this mode as a production build.

### Full local mode

Create `.env.local` yourself in the project root. It is intentionally ignored
by Git and must never be committed.

Required for the web application:

```text
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=...
```

Required when testing email, production rate limiting, or monitoring:

```text
RESEND_API_KEY=...
EMAIL_FROM=nexUni.living <notifications@nexuni.living>
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_PROJECT=student-hostel-system
SENTRY_AUTH_TOKEN=...
```

Install and run:

```bash
cd /Volumes/THINGKERS/developments/studentService/nexuni.living
npm ci
npm run dev
```

Open `http://localhost:3000`.

Before deployment:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## 2. Recommended production deployment

The preferred production topology is:

- Next.js application: Vercel
- Database, authentication, storage, and Realtime: Supabase
- Domain DNS and branded mailbox: Namecheap/cPanel
- Booking expiry: Vercel cron initially, or Supabase `pg_cron`

Add `nexuni.living` to the existing Vercel project, then use the exact DNS
records Vercel displays. If DNS remains managed by cPanel, add those records in
cPanel's Zone Editor. Preserve all MX, SPF, DKIM, and DMARC records used by
email.

Update these external settings during cutover:

1. `NEXT_PUBLIC_SITE_URL=https://nexuni.living`
2. Supabase Auth Site URL and redirect allow-list
3. Resend domain verification and `EMAIL_FROM`
4. Sentry environment/project configuration
5. Vercel production domain and cron secret

Keep the old Vercel URL available until login, password reset, booking, email,
PWA, sitemap, and admin flows pass on the new domain.

## 3. cPanel Node pilot

Do not point production DNS to cPanel before this pilot passes. The supplied
account has 1 GB RAM and 20 entry processes, so repeated 503/508 responses or
process termination are rollback conditions.

In cPanel, verify:

1. **Setup Node.js App** is available.
2. Node.js 22 (or at least 20.9) is selectable.
3. A staging subdomain such as `staging.nexuni.living` exists with SSL.
4. The application root can be `/home/nexuvlco/nexuni_app`.
5. The startup file can be `server.js`.
6. Environment variables, Passenger logs, and Cron Jobs are available.

The application uses Next.js standalone output. Build with:

```bash
npm run build:cpanel
```

The uploadable application is `.next/standalone`. It contains `server.js`,
traced production dependencies, static assets, and PWA files.

### Build for Linux

Do not deploy a standalone artifact built on macOS because native modules such
as Sharp must match the cPanel Linux runtime. Use a Linux CI runner or Docker:

```bash
docker run --rm --platform linux/amd64 \
  -e NEXT_PUBLIC_SITE_URL=https://nexuni.living \
  -e NEXT_PUBLIC_SUPABASE_URL \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY \
  -v "$PWD:/app" \
  -v nexuni_node_modules:/app/node_modules \
  -w /app node:22-bookworm \
  bash -lc "npm ci && npm run build:cpanel"
```

Only public build variables are passed above. Configure service-role, email,
Redis, cron, and monitoring secrets in cPanel as runtime environment variables.

## 4. SSH access from the local machine

The authorized cPanel public key named `id_rsa` only proves that the server
accepts its matching private key. The matching private key must exist locally,
normally at `~/.ssh/id_rsa`.

Obtain the server hostname and SSH port from Namecheap/cPanel. Do not assume
that the website IP or port 22 is the SSH endpoint.

Set local shell variables:

```bash
export CPANEL_SSH_HOST="server-hostname-from-cpanel"
export CPANEL_SSH_PORT="ssh-port-from-cpanel"
export CPANEL_SSH_USER="nexuvlco"
export CPANEL_APP_ROOT="/home/nexuvlco/nexuni_app"
export CPANEL_SSH_KEY="$HOME/.ssh/id_rsa"
```

Confirm the private-key permissions and connect:

```bash
chmod 600 "$CPANEL_SSH_KEY"
ssh -i "$CPANEL_SSH_KEY" -p "$CPANEL_SSH_PORT" \
  "$CPANEL_SSH_USER@$CPANEL_SSH_HOST"
```

On the first connection, compare the displayed server fingerprint with the
fingerprint supplied by Namecheap before accepting it.

## 5. Upload and restart

First preview the upload. Confirm that `CPANEL_APP_ROOT` is exactly the cPanel
Node application's root:

```bash
rsync -azn --delete \
  -e "ssh -i $CPANEL_SSH_KEY -p $CPANEL_SSH_PORT" \
  .next/standalone/ \
  "$CPANEL_SSH_USER@$CPANEL_SSH_HOST:$CPANEL_APP_ROOT/"
```

Remove `n` only after reviewing the dry-run:

```bash
rsync -az --delete \
  -e "ssh -i $CPANEL_SSH_KEY -p $CPANEL_SSH_PORT" \
  .next/standalone/ \
  "$CPANEL_SSH_USER@$CPANEL_SSH_HOST:$CPANEL_APP_ROOT/"
```

In **Setup Node.js App**, configure:

- Mode: `Production`
- Application root: `nexuni_app`
- Application URL: the staging subdomain
- Startup file: `server.js`
- `NODE_ENV=production`
- `HOSTNAME=0.0.0.0`

Add all runtime variables listed in section 1, using
`NEXT_PUBLIC_SITE_URL=https://staging.nexuni.living` for the pilot.

Restart through cPanel, or trigger Passenger through SSH:

```bash
ssh -i "$CPANEL_SSH_KEY" -p "$CPANEL_SSH_PORT" \
  "$CPANEL_SSH_USER@$CPANEL_SSH_HOST" \
  "mkdir -p '$CPANEL_APP_ROOT/tmp' && touch '$CPANEL_APP_ROOT/tmp/restart.txt'"
```

## 6. Pilot acceptance checks

Test all of the following on staging:

- Homepage, university, locality, listing, and roommate pages
- Login, logout, token refresh, password reset, and protected redirects
- Room image optimization through `/_next/image`
- Student ID and listing uploads
- Booking lifecycle and seat inventory
- Messaging and Supabase Realtime
- Admin authorization and verification email
- PWA install/update and service-worker scope
- Sitemap, robots, security headers, and Sentry
- Memory, CPU, 503, and 508 behavior under concurrent requests

Keep Vercel as the rollback target. Shared cPanel should not become the primary
runtime unless the staging pilot remains stable under representative traffic.
