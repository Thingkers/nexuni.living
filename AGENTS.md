<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
## Project Context
- This is a student housing platform (Next.js + Supabase) expanding from
  AIUB-only to all Bangladesh universities.
- Expansion roadmap: docs/expansion-strategy.md
- Feature specs: docs/feature-breakdown.md
- Implementation playbook: docs/playbook.md

## Hard Rules
1. NEVER modify existing RLS policies without showing me the before/after.
2. Every new table MUST have RLS enabled with policies, following existing
   migration patterns.
3. All schema changes go through a new migration file — never edit old
   migrations.
4. Never commit secrets. Never touch .env files.
5. All user-facing text must support both Bangla (bn) and English (en)
   once i18n is set up.
6. If implementation diverges from the approved plan, STOP and re-enter
   plan mode — do not improvise.
7. After any feature: run build + lint, and show the output as evidence.
   Never claim "it works" without running it.
8. Preserve backward compatibility with existing rooms/bookings data.