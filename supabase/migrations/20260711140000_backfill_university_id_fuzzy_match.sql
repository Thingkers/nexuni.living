-- Problem: the backfill in 20260711130000 only sets profiles.university_id
-- when the free-text `university` value is exactly (case-insensitively)
-- equal to a university's name, name_bn, or an alias. Real free text varies
-- more than that -- "AIUB Dhaka", "AIUB - Dhaka Campus", trailing
-- whitespace/punctuation, etc. -- so most existing (this platform was
-- AIUB-only until now) profiles were left unmatched.
--
-- Fix: a second, looser pass that checks whether a university's name,
-- name_bn, or any alias appears as a whole WORD inside the free-text value
-- (Postgres `~*` with `\m`/`\M` word-boundary anchors), not just as a raw
-- substring. Word-boundary matching matters here specifically: the seeded
-- data already contains a real collision -- IUB's alias "IUB" is a literal
-- substring of "AIUB" -- so a plain `ilike '%IUB%'`-style containment check
-- would wrongly attribute an AIUB user's profile to IUB. Whole-word matching
-- ("IUB" only matches a standalone "IUB" token, never the "IUB" inside
-- "AIUB") avoids that collision. A minimum-length guard on the matched
-- token guards against very short aliases coincidentally appearing in
-- unrelated text, and `order by length(u.name) desc` is a last-resort
-- tiebreak if a free-text value somehow whole-word-matches more than one
-- university. Guarded by `university_id is null`, so this only touches rows
-- the first migration's backfill missed and is a safe no-op to re-run.
update public.profiles p
set university_id = (
  select u.id
  from public.universities u
  where u.is_active
    and (
      (length(u.name) >= 3 and p.university ~* ('\m' || u.name || '\M'))
      or (u.name_bn is not null and length(u.name_bn) >= 3 and p.university ~* ('\m' || u.name_bn || '\M'))
      or exists (
        select 1
        from jsonb_array_elements_text(u.aliases) as a(value)
        where length(a.value) >= 3
          and p.university ~* ('\m' || a.value || '\M')
      )
    )
  order by length(u.name) desc
  limit 1
)
where p.university_id is null
  and p.university is not null
  and trim(p.university) <> '';
