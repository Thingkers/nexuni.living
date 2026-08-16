// Sprint 0 / P0-2 (continued) — one-off admin purge of student-id-cards
// storage objects whose owning profile no longer exists.
//
// Originally written as a migration (supabase/migrations/20260806125000_
// purge_orphaned_student_id_cards.sql), but Supabase-hosted projects reject
// direct SQL DML against storage.objects ("Direct deletion from storage
// tables is not allowed. Use the Storage API instead.") for every role,
// including the migration role — so this can only run through the Storage
// API, never as a `supabase db push` step. See that migration file for the
// full security finding this cleans up.
//
// This is a dry run by default: it only lists what it *would* delete. Pass
// --confirm to actually delete. Deleting the storage.objects row makes the
// object unreachable through every read path (public URL, signed URL,
// download, list); it does not reclaim the underlying blob in the storage
// backend. To reclaim bytes too, run afterwards for each purged path:
//   supabase storage rm --experimental -r ss:///student-id-cards/<uuid>
//
// Usage:
//   node --env-file=.env.local scripts/purge-orphaned-student-id-cards.mjs
//   node --env-file=.env.local scripts/purge-orphaned-student-id-cards.mjs --confirm

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Run with: node --env-file=.env.local scripts/purge-orphaned-student-id-cards.mjs',
  )
}

const confirm = process.argv.includes('--confirm')
const BUCKET = 'student-id-cards'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: profiles, error: profilesError } = await supabase
  .from('profiles')
  .select('id')

if (profilesError) throw profilesError
const profileIds = new Set(profiles.map((p) => p.id))

const { data: topLevel, error: listError } = await supabase.storage
  .from(BUCKET)
  .list('', { limit: 1000 })

if (listError) throw listError

const orphanedPaths = []

for (const entry of topLevel) {
  // Folder-per-user layout (`<uuid>/id-card.webp`): a real folder entry has
  // no `id` of its own. Anything else at the root is unexpected — skip it
  // rather than guess, so a stray file can't get swept up in a bulk delete.
  if (entry.id !== null) continue

  const folderUuid = entry.name
  if (profileIds.has(folderUuid)) continue

  const { data: files, error: filesError } = await supabase.storage
    .from(BUCKET)
    .list(folderUuid, { limit: 1000 })

  if (filesError) throw filesError

  for (const file of files) {
    orphanedPaths.push(`${folderUuid}/${file.name}`)
  }
}

if (orphanedPaths.length === 0) {
  console.log('No orphaned student-id-cards objects found.')
  process.exit(0)
}

console.log(`Found ${orphanedPaths.length} orphaned object(s):`)
for (const path of orphanedPaths) console.log(`  ${path}`)

if (!confirm) {
  console.log('\nDry run only — nothing deleted. Re-run with --confirm to delete these objects.')
  process.exit(0)
}

const BATCH_SIZE = 100
let deleted = 0

for (let i = 0; i < orphanedPaths.length; i += BATCH_SIZE) {
  const batch = orphanedPaths.slice(i, i + BATCH_SIZE)
  const { data, error } = await supabase.storage.from(BUCKET).remove(batch)
  if (error) throw error
  deleted += data.length
}

console.log(`\nDeleted ${deleted} orphaned object(s).`)
