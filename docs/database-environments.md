# Database environments

nexUni.living should use separate Supabase projects for development, staging,
and production. The browser publishable key is not a privileged credential;
authorization still depends on Row Level Security. Service-role keys, database
passwords, provider tokens, and cron secrets are privileged and must never be
committed or passed to browser code.

## Local profiles

### No data

```bash
npm run dev:no-data
```

Uses `config/no-data.env`. No external database is contacted.

### Shared public data

```bash
npm run dev:data
```

Uses `config/public-data.env`, which contains only the public project URL and
publishable browser key. Public room, university, locality, and roommate data
are available. Logging in or performing authenticated browser actions can
change the shared database under its RLS policies.

Privileged API routes such as admin user management and server-side email are
intentionally unavailable unless fresh server-only secrets are supplied
outside Git.

## Required secret rotation

Rotate any service-role key, Sentry auth token, or cron secret that has been
shared through chat, email, screenshots, or source control. After rotation:

1. Store local secrets in an ignored `.env.local` file created manually.
2. Store Vercel secrets in Project Settings → Environment Variables.
3. Store cPanel secrets in Setup Node.js App → Environment Variables.
4. Never prefix secrets with `NEXT_PUBLIC_`.
5. Revoke replaced credentials after every environment has been updated.

## Target topology

- Development: local Supabase CLI project or a dedicated development project
- Staging: separate hosted Supabase project and `staging.nexuni.living`
- Production: production Supabase project and `nexuni.living`

Each environment should have independent Auth redirect URLs, storage policies,
email sender configuration, rate-limit storage, Sentry environment, cron
secret, service-role key, and database credentials.

## Schema synchronization

The repository is the source of truth for schema changes:

```bash
npx supabase init
npx supabase start
npx supabase db reset
```

Before relying on those commands, export the complete current production schema
as a reviewed baseline migration. The existing migration directory contains
incremental hardening and expansion migrations but may not recreate every
original table, bucket, trigger, function, and policy from an empty database.

Recommended one-time baseline process:

1. Rotate credentials and obtain a Supabase personal access token plus database
   password through a secure channel.
2. Link the CLI to the current project.
3. Pull the remote schema into a temporary review branch.
4. Review tables, functions, triggers, grants, RLS, and storage policies.
5. Remove ownership metadata and any secrets.
6. Test the baseline plus later migrations using `supabase db reset`.
7. Promote the same reviewed migrations to staging, then production.

Do not run destructive reset commands against a linked hosted project.

## Deployment

Build-time public configuration:

```text
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SENTRY_DSN
```

Runtime server-only configuration:

```text
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
EMAIL_FROM
ANTHROPIC_API_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
CRON_SECRET
SENTRY_AUTH_TOKEN
SENTRY_PROJECT
```

Build the final cPanel artifact on Linux only. Follow
`docs/local-and-cpanel-deployment.md` for Passenger, SSH, staging, and rollback
steps.
