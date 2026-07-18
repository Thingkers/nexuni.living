# Team deployment runbook

This branch deploys nexUni.living directly to Namecheap cPanel. It has no
Vercel runtime dependency. Supabase remains the database, authentication,
storage and Realtime provider.

## Production target

- URL: `https://nexuni.living`
- SSH host: `server184.web-hosting.com`
- SSH port: `21098`
- SSH user: `nexuvlco`
- Application root: `/home/nexuvlco/nexuni_app`
- cPanel runtime: Node.js `22`
- Startup file: `server.js`

## One-time teammate setup

1. Install Docker Desktop, OpenSSH, `rsync`, Node.js and npm.
2. Generate a dedicated key:

   ```bash
   ssh-keygen -t rsa -b 4096 \
     -f ~/.ssh/nexuni_deploy \
     -C "nexuni-cpanel-deployment" \
     -N ""
   ```

3. Ask a cPanel administrator to import and authorize
   `~/.ssh/nexuni_deploy.pub`. Never share or commit the private key.
4. Connect once and verify the server host fingerprint:

   ```bash
   ssh -i ~/.ssh/nexuni_deploy \
     -p 21098 \
     nexuvlco@server184.web-hosting.com
   ```

5. Create an ignored `.env.production` containing only public build values:

   ```dotenv
   NEXT_PUBLIC_SITE_URL=https://nexuni.living
   NEXT_PUBLIC_SUPABASE_URL=https://hktvqwryhpyiujjprymt.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<public-publishable-key>
   NEXT_PUBLIC_SENTRY_DSN=<optional-public-dsn>
   SENTRY_PROJECT=student-hostel-system
   ```

Private service keys belong in cPanel's **Setup Node.js App → Environment
Variables**, not in Git or `.env.production`. Do not configure `PORT`; cPanel
Passenger provides it.

## Deploy

Always pull and review the deployment branch first:

```bash
git switch deployment/namecheap-cpanel
git pull --ff-only
```

Preview upload changes without building:

```bash
SKIP_BUILD=1 DRY_RUN=1 npm run deploy:cpanel
```

Build in Linux, upload, restart Passenger and run smoke tests:

```bash
npm run deploy:cpanel
```

The script requires a trusted host key in `~/.ssh/known_hosts`. It deliberately
uses strict host verification and never bypasses SSH checks.

## Optional overrides

```bash
CPANEL_SSH_KEY=~/.ssh/another_key \
CPANEL_SSH_HOST=server184.web-hosting.com \
CPANEL_SSH_PORT=21098 \
CPANEL_SSH_USER=nexuvlco \
CPANEL_APP_ROOT=/home/nexuvlco/nexuni_app \
npm run deploy:cpanel
```

Set `SENTRY_AUTH_TOKEN` in the invoking shell only when source maps should be
uploaded during the build. Do not save that token in repository files.

## Post-deployment checks

- Homepage, listings, preview routes, manifest and sitemap return `200`.
- Anonymous `/dashboard` requests redirect to login.
- The cron endpoint returns `401` without its bearer token.
- Login, password reset, uploads, booking, messaging and admin access work.
- `stderr.log` in the application root has no new Passenger errors.

The booking-expiry endpoint must be called by a cPanel cron job every five
minutes with `Authorization: Bearer <CRON_SECRET>`.

## Rollback

Git is the source of truth. To roll back, identify the last known-good commit,
create a temporary rollback branch at that commit, and run the same deployment
script. Do not use `git reset --hard` in a shared working tree.
