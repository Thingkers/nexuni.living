# Roadmap module activation

The portal exposes future modules as discoverable previews. Preview routes are
`noindex`, provide no write forms, and must not call mutation APIs.

## Activation gates

A module may move from `preview` to `beta` in `src/config/modules.ts` only when:

1. Its additive database migration and indexes are reviewed.
2. Row-level security covers anonymous, member, owner and moderator access.
3. Report, moderation and archive workflows exist.
4. Bangla and English copy, empty states and accessibility are complete.
5. Rate limits, observability and retention rules are documented.
6. Mobile and low-connectivity behavior passes regression testing.

Payment holding or escrow additionally requires a supported merchant agreement,
signed webhook verification, an idempotent ledger and legal review. The first
payments release must remain a provider-neutral tracking ledger.

## Activation order

1. Used books
2. Local services
3. Owner area analytics and shareable listing links
4. SMS booking notifications
5. Jobs and internships
6. Transport guides
7. Verified student carpools
8. Payments ledger, then regulated deposit handling
9. University admin API
10. Offline-first PWA improvements
