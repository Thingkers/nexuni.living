# 🚀 Claude Code Implementation Playbook
## Bangladesh Expansion — Sprint-by-Sprint, Copy-Paste Commands সহ

> **মূলনীতি:** এক sprint = এক feature = এক git branch = এক (বা কয়েকটা) Claude Code session। প্রতিটা কাজে আগে **Plan Mode** (Shift+Tab দুইবার চেপে), plan পড়ে approve, তারপর implement, তারপর test, তারপর commit। বড় এক command-এ সব দিলে Claude context হারিয়ে মাঝপথে ভুল করবে — তাই ছোট ছোট, যাচাইযোগ্য ধাপ।

---

## 🏗️ Step 0: One-Time Setup (সবার আগে, ~৩০ মিনিট)

### 0.1 — দুইটা ডকুমেন্ট প্রজেক্টে রাখুন

আমার দেওয়া দুইটা ফাইল (`bangladesh_strategy_bangla.md` এবং `feature_breakdown_bangla.md`) প্রজেক্টের ভেতরে রাখুন:

```
your-project/
└── docs/
    ├── expansion-strategy.md      ← স্ট্র্যাটেজি ডকুমেন্ট
    └── feature-breakdown.md       ← ফিচার breakdown
```

এতে Claude Code যেকোনো সময় reference হিসেবে পড়তে পারবে — আপনাকে বারবার ব্যাখ্যা করতে হবে না।

### 0.2 — CLAUDE.md তৈরি/আপডেট করুন

VS Code-এ Claude Code খুলে চালান:

```
/init
```

এটা আপনার codebase বিশ্লেষণ করে একটা starter CLAUDE.md বানাবে। তারপর নিচের rules গুলো CLAUDE.md-তে **উপরের দিকে** যোগ করুন (গুরুত্বপূর্ণ rule উপরে থাকলে Claude বেশি মানে):

```markdown
## Project Context
- This is a student housing platform (Next.js + Supabase) expanding from
  AIUB-only to all Bangladesh universities.
- Expansion roadmap: docs/expansion-strategy.md
- Feature specs: docs/feature-breakdown.md
- Stack: Next.js (App Router), Supabase (Postgres + RLS + Realtime),
  Resend, Upstash Redis, Leaflet, Recharts, Sentry, PWA.

## Hard Rules
1. NEVER modify existing RLS policies without showing me the before/after.
2. Every new table MUST have RLS enabled with policies, following the
   patterns in existing migrations.
3. All schema changes go through a new migration file — never edit old
   migrations.
4. Never commit secrets. Never touch .env files.
5. All user-facing text must support both Bangla (bn) and English (en)
   once i18n is set up.
6. If the implementation diverges from the approved plan, STOP and
   re-enter plan mode — do not improvise.
7. After any feature: run build + lint + existing tests, and show me the
   output as evidence. Never claim "it works" without running it.
8. Preserve backward compatibility with existing rooms/bookings data.

## Conventions
- Migrations: supabase/migrations/ (follow existing naming)
- Components: [আপনার ফোল্ডার স্ট্রাকচার লিখুন]
- Currency display: ৳ with Bangla numerals helper (once built)
```

> ⚠️ CLAUDE.md ছোট রাখুন (২০০ লাইনের নিচে) — বেশি বড় হলে Claude অর্ধেক rule ignore করা শুরু করে।

### 0.3 — Git workflow ঠিক করুন

প্রতি sprint-এর জন্য আলাদা branch:

```bash
git checkout -b feature/university-locality-model
```

কাজ শেষে merge, তারপর পরের sprint-এর নতুন branch। এতে কিছু ভাঙলে সহজে revert করা যায়।

---

## 🔁 প্রতি Sprint-এর Golden Workflow (মুখস্থ করে ফেলুন)

প্রতিটা sprint-এ এই ৬টা ধাপ:

| ধাপ | কী করবেন |
|---|---|
| 1️⃣ Branch | `git checkout -b feature/xyz` |
| 2️⃣ Plan | **Shift+Tab দুইবার** চেপে Plan Mode-এ যান → নিচের sprint prompt paste করুন |
| 3️⃣ Review | Plan **পড়ুন** (rubber-stamp করবেন না!) — ভুল assumption থাকলে এখনই ঠিক করুন, কারণ plan-এ bug ঠিক করা কোডে ঠিক করার চেয়ে ১০ গুণ সস্তা |
| 4️⃣ Execute | Plan approve করুন → Claude implement করবে |
| 5️⃣ Verify | `Run the build, lint, and test the feature manually. Show me the evidence.` |
| 6️⃣ Commit + Clear | Commit করুন → **`/clear`** চালিয়ে context খালি করুন পরের কাজের আগে |

> 💡 একটা plan-এ ~৩০ মিনিটের implement-যোগ্য কাজের বেশি রাখবেন না। বড় sprint হলে ভেতরে ২–৩টা plan cycle চালান।
> 💡 জটিল architectural সিদ্ধান্তে (যেমন Sprint 8-এর refactor) Plan Mode-এ extended thinking on করুন (Alt+T / Option+T)।

---

## 📋 Sprint-by-Sprint Commands

নিচের প্রতিটা prompt **Plan Mode-এ** paste করবেন। Prompt গুলো ইচ্ছাকৃতভাবে বলছে "read docs/feature-breakdown.md" — যাতে Claude পুরো spec নিজে পড়ে নেয়।

---

### 🟦 SPRINT 1 — University & Locality Data Model (৩–৫ দিন)

**Branch:** `feature/university-locality-model`

**Session 1.A — Schema:**
```
Read docs/feature-breakdown.md section 1 (University & Locality Data Model).
Then explore my existing Supabase migrations and profile/rooms schema.

Plan a new migration that adds:
1. universities table (with name_bn, slug, type, aliases jsonb, lat/lng)
2. localities table
3. locality_university junction table with distance
4. university_id FK on profiles, locality_id + nearest university refs on rooms

Include RLS policies following my existing patterns, and indexes for the
slug and geo columns. Also plan a seed file with 10 Dhaka-north
universities (AIUB, NSU, MIU, BRAC, IUB, UIU, AUST, DIU, Southeast, Uttara
University) and 10 popular student localities near them.
Do NOT plan any UI yet.
```

**Session 1.B — Signup + Profile integration** (`/clear` দিয়ে শুরু):
```
The universities and localities tables now exist. Explore my signup flow
and profile edit page.

Plan: replace the free-text university field with a searchable dropdown
backed by the universities table (search must match name, name_bn, and
aliases). Add a data migration strategy for existing users' text
university values — map the obvious ones (AIUB variants) and leave the
rest null with a "complete your profile" prompt.
```

**Session 1.C — Proximity engine:**
```
Explore how rooms store lat/lng and how the room card component works.

Plan: a utility that computes distance from a room to its nearest
universities (use PostGIS if available in my Supabase setup, otherwise
Haversine in a Postgres function), stores nearest_university_ids on the
room (updated on insert/update via trigger), and shows a "X km from
[University]" badge on room cards and the detail page.
```

**✅ Sprint শেষে verify:** signup-এ dropdown কাজ করে, নতুন রুম পোস্ট করলে university badge দেখায়, পুরনো ডেটা অক্ষত।

---

### 🟦 SPRINT 2 — Bangla i18n (৩–৪ দিন)

**Branch:** `feature/bangla-i18n`

**Session 2.A:**
```
Read docs/feature-breakdown.md section 3 (Bangla Language).
Explore my Next.js app structure (App Router setup, layout files).

Plan the setup of next-intl with bn and en locales: routing strategy,
language toggle in the header, locale persistence (localStorage +
profile), and a translation file structure. Only plan the infrastructure
plus translating ONE page (the homepage) as proof — not the whole app.
```

**Session 2.B (এবং C, D...):**
```
i18n infrastructure is in place. Translate these pages to use translation
keys with full Bangla translations: search/listing page, room detail
page, signup + login pages. Follow the exact pattern used on the
homepage. Also create the Bangla numeral/currency formatting utility
(৳৫,০০০ style) and use it everywhere prices display.
```

> 💡 বাকি পেজগুলো (booking, dashboard, admin) পরের session-এ একইভাবে — প্রতিবার ৩–৪টা পেজ।

**✅ Verify:** টগল চাপলে পুরো পেজ বাংলা হয়, দাম ৳ ও বাংলা সংখ্যায় দেখায়, en-ও ঠিক আছে।

---

### 🟦 SPRINT 3 — Locality Search + Landing Pages (৪–৬ দিন)

**Branch:** `feature/locality-search-seo`

**Session 3.A — Search upgrade:**
```
Read docs/feature-breakdown.md section 2. Explore my current hero search,
filter bar, and search suggestion implementation.

Plan: upgrade search autocomplete to return three result types
(universities, localities, room titles) with icons, matching Bangla and
English input against aliases. Add a university multi-select filter and
a "near my campus" default that uses the logged-in user's university_id.
```

**Session 3.B — Landing pages:**
```
Plan SEO-optimized landing pages: /universities/[slug] and
/areas/[slug] using Next.js ISR. Each university page shows: university
info, nearby localities, listings near it, and average rent (computed
from my listings data). Each area page shows: rent range, nearby
campuses, and listings. Include metadata, JSON-LD structured data, and
sitemap entries. Reuse my existing listing grid component.
```

**✅ Verify:** `/universities/nsu` খুললে সঠিক listing দেখায়, view-source-এ meta tags আছে, sitemap-এ পেজগুলো আছে।

---

### 🟦 SPRINT 4 — Roommate Matching (৪–৫ দিন)

**Branch:** `feature/roommate-matching`

**Session 4.A — Schema + profile wizard:**
```
Read docs/feature-breakdown.md section 4 (Roommate Matching). Explore my
profiles schema, verification status logic, and how multi-step forms are
built in this codebase (check the room posting flow).

Plan: roommate_profiles table (with RLS — only approved users can create,
everyone approved can read active ones) and a 3-step profile creation
wizard (basics → preferences → habits).
```

**Session 4.B — Board + matching:**
```
Plan the /roommates board page: card grid with filters (locality,
university, budget, gender), reusing my listing grid patterns. Implement
the match % score as specified in the breakdown doc (locality 30%,
budget 25%, habits 25%, university 20%) — compute it client-side or in a
Postgres function, your call, but explain the tradeoff in the plan.
"Message" button must open a conversation in my existing inbox. Add the
existing report flow to roommate profiles.
```

**✅ Verify:** প্রোফাইল বানানো → বোর্ডে দেখা → match % ঠিক → মেসেজ পাঠালে inbox-এ conversation।

---

### 🟦 SPRINT 5 — Moderator Tools (৩–৪ দিন)

**Branch:** `feature/moderator-roles`

```
Read docs/feature-breakdown.md section 5. Explore my role-based
middleware, admin panel structure, and reports queue.

Plan in two phases (I will approve each separately):
Phase 1: moderator role + moderator_scopes table (scoped to a
university or locality), middleware updates, and RLS so moderators only
see content in their scope.
Phase 2: a moderator dashboard that is a scoped-down version of my admin
panel (pending listings, reports, verifications in their scope only),
plus a moderation_logs audit table, plus referral_codes for the
ambassador program.
```

**✅ Verify:** মডারেটর অ্যাকাউন্ট দিয়ে লগইন করলে শুধু নিজের ক্যাম্পাসের content দেখে; admin সব দেখে; প্রতিটা action log হয়।

---

### 🟦 SPRINT 6 — Housing Upgrades (৫–৭ দিন, ছোট ছোট টুকরায়)

**Branch:** প্রতি টুকরার জন্য আলাদা ছোট branch করলেও চলে

এই sprint-এ ৭টা স্বাধীন ফিচার — **প্রতিটার জন্য আলাদা ছোট session**, একসাথে না:

```
Session 6.A: Read docs/feature-breakdown.md section 6.1. Plan the new
listing filters: female-only/family-hostel toggle, amenities jsonb
column + filter UI (AC, generator, security, parking, lift, WiFi), and
stay_type enum (permanent/sublet/short_term) with available_until date.

Session 6.B: Plan the mess meal plan module per section 6.2 — meal_plans
jsonb on listings of type mess, a meal timing table on the detail page,
and a "meals included" filter.

Session 6.C: Plan the rent transparency card per section 6.3, using my
existing bills data: a total monthly cost breakdown component on the
detail page and a "Total ৳X/month" badge on cards.

Session 6.D: Plan the WhatsApp CTA per section 6.4 — optional WhatsApp
number on owner profiles, a wa.me button on room detail visible only to
approved logged-in users, with click tracking.

Session 6.E: Plan group booking per section 6.5. Explore my atomic seat
booking logic FIRST and explain in the plan exactly how you'll extend it
to reserve N seats atomically without breaking single-seat booking.

Session 6.F: Plan the parent shareable view per section 6.6 — a signed,
expiring read-only link (/share/rooms/[id]?token=) with no booking or
messaging, and a "Send to guardian" button.

Session 6.G: Plan the "direct owner" badge per section 6.7 — declaration
+ proof upload into my existing verification queue, badge on listings.
```

**✅ Verify (সবচেয়ে জরুরি 6.E):** দুইটা ব্রাউজারে একসাথে group booking চেষ্টা করে race condition test করুন।

---

### 🟦 SPRINT 7 — Trust at Scale (৫–৬ দিন)

**Branch:** `feature/tiered-verification`

**Session 7.A — Phone OTP:**
```
Read docs/feature-breakdown.md section 7.1. Explore my current
verification flow and Upstash rate limiting setup.

Plan phone OTP verification: otp_codes table, an SMS gateway adapter
with a provider interface (implement a console/log provider for dev and
a stub for SSLWireless — I'll add credentials later), rate limiting via
my existing Upstash setup, and verification level tracking on profiles
(email → student_id → phone → nid). Badges for each level on profiles.
```

**Session 7.B — Reputation:**
```
Plan the owner reputation score per section 7.2: a nightly cron job (use
my existing cron pattern) computing avg response time from messages,
booking completion rate, review average, and report count into an
owner_stats table. Display badges ("Fast responder", "95% completion")
on owner profiles and listing cards.
```

**Session 7.C — Disputes:**
```
Plan the dispute workflow per section 7.3: extend my reports table with
status transitions (open → under_review → resolved/action_taken), an
admin thread with both parties using my existing messaging, resolution
logs, and a repeat-offender flag.
```

---

### 🟥 SPRINT 8 — `rooms` → `listings` Refactor (৫–৭ দিন) ⚠️ সবচেয়ে সাবধানে

**Branch:** `refactor/generalized-listings`

এটাই সবচেয়ে ঝুঁকিপূর্ণ sprint। **অবশ্যই** Plan Mode + extended thinking, এবং plan খুব ভালো করে পড়ুন:

**Session 8.A — শুধু analysis (কোনো কোড না):**
```
Read docs/feature-breakdown.md section 12. Then do a full analysis (NO
code changes): map every table, component, API route, and RLS policy
that touches the rooms table. Produce a written migration strategy in
docs/refactor-plan.md covering: the new listings +
listing_housing_details schema, the data migration approach, a
backward-compatible view, how reviews/favorites/reports/images become
listing-scoped, RLS porting, and a rollback plan. List the riskiest
steps explicitly.
```

**Session 8.B, C, D — plan অনুযায়ী ধাপে ধাপে** (`/clear` করে, প্রতিবার docs/refactor-plan.md রেফার করে):
```
Read docs/refactor-plan.md. Execute ONLY step 1-2 (new tables + data
migration script with the compatibility view). Do not touch application
code yet. After migrating, run queries proving row counts match between
rooms and listings.
```
```
Read docs/refactor-plan.md. Now migrate the application code to read
from listings: [listing grid, detail page, posting flow] — one area at a
time. Run the build and existing tests after each area.
```

> 🔑 এই sprint-এ প্রতিটা ধাপের পর manually অ্যাপ চালিয়ে booking flow test করুন। কিছু গোলমাল লাগলেই বলুন: "Stop. Re-enter plan mode and explain what diverged from docs/refactor-plan.md."

---

### 🟦 SPRINT 9 — Used Books Marketplace (৪–৫ দিন)

**Branch:** `feature/books-marketplace`

```
Read docs/feature-breakdown.md section 8. The listings refactor is done,
so books are a new listing_type with a listing_book_details table
(course code, department, condition, negotiable).

Plan: book posting flow (reuse image upload/compression from room
posting), /books browse page with filters (university, department,
course code autocomplete, price), "my campus" default, buy-request via
existing messaging, "sold" status with auto-archive, and seller ratings
via the generalized review system.
```

---

### 🟦 SPRINT 10 — Services Directory + Analytics + SMS (৫–৬ দিন)

**Branch:** `feature/services-analytics`

```
Session 10.A: Read docs/feature-breakdown.md section 9. Plan
service_places (category, locality, hours, price notes), admin/moderator
CRUD, a /services directory with category tabs + my Leaflet map, and a
"nearby services" widget on room detail pages.

Session 10.B: Read section 10.1. FIRST plan the search_events logging
table (query, locality, university, timestamp — anonymized) because we
need data accumulating. THEN extend my Recharts owner dashboard with
area-level stats, and build the admin supply-gap heatmap as a Leaflet
layer.

Session 10.C: Read section 10.2. Wire SMS notifications for booking
confirm/reject through the SMS adapter from Sprint 7, with a per-user
channel preference (email/push/SMS) in settings.
```

---

### 🟦 SPRINT 11 — Jobs + Transport (৪–৫ দিন)

**Branch:** `feature/jobs-transport`

```
Session 11.A: Read docs/feature-breakdown.md section 11.1. Plan the jobs
vertical as listing_type=job with listing_job_details, an employer
account flag with light verification, moderator approval before publish,
filters (type, locality, "near X university"), and saved jobs via my
favorites system.

Session 11.B: Read section 11.2. Plan bus_routes (stops as ordered jsonb
of localities/landmarks) with a "from → to" route finder UI, a
community "suggest route info" flow into the moderation queue, and a
carpool board modeled on the roommate board.
```

---

### 🟦 SPRINT 12 — Monetization (৩–৪ দিন)

**Branch:** `feature/monetization-v1`

```
Read docs/feature-breakdown.md section 13. Plan featured listings first:
featured_until timestamp, search ranking boost, "Featured" badge, an
admin panel to manually mark listings as featured (manual payment
recording for v1 — no payment gateway yet), and a payments record table
designed so bKash checkout can plug in later without schema changes.
```

---

### 🟥 SPRINT 13 — bKash Escrow (সবার শেষে, আলাদা করে প্ল্যান করবো)

এটা আসলে একটা mini-project — merchant account, sandbox testing, আইনি দিক। এখানে পৌঁছালে আমাকে বলবেন, আলাদা playbook বানিয়ে দেবো। ততদিন Sprint 12-এর payments table-ই যথেষ্ট ভিত্তি।

---

## 🧠 যে ভুলগুলো করবেন না (Cheat Sheet)

1. **এক prompt-এ পুরো sprint দেওয়া** → context ভরে যায়, শেষের দিকের কোড খারাপ হয়। ছোট session, মাঝে `/clear`।
2. **Plan না পড়ে approve করা** → Plan Mode-এর পুরো লাভটাই plan পড়ায়; rubber-stamp করলে খরচ আছে, লাভ নেই।
3. **"কাজ করছে" কথায় বিশ্বাস করা** → সবসময় বলুন: `Show me the test/build output as evidence` — Claude মাঝে মাঝে verify না করেই success দাবি করে।
4. **RLS/migration auto-accept করা** → এগুলোতে সবসময় diff নিজে দেখুন (CLAUDE.md-র rule 1-2 এজন্যই)।
5. **Branch ছাড়া কাজ** → refactor sprint-এ (Sprint 8) এটা আত্মহত্যার শামিল।
6. **Claude ভুল assumption করলে শুধু ওই সেশনে ঠিক করা** → correction টা CLAUDE.md-তেও লিখুন, যাতে পরের session একই ভুল না করে।
7. **Sprint order ভাঙা** → বিশেষ করে Sprint 1 (data model) আর Sprint 8 (refactor) — এগুলোর আগে-পরে নির্ভরশীলতা আছে।

---

## 📊 Timeline Summary

| Sprint | সময় (একা, part-time) | Milestone |
|---|---|---|
| 0–3 | সপ্তাহ ১–৪ | Multi-university foundation + বাংলা + SEO |
| 4–5 | সপ্তাহ ৫–৬ | Roommate matching + moderators |
| 6–7 | সপ্তাহ ৭–৯ | Housing upgrades + trust system |
| 8 | সপ্তাহ ১০–১১ | ⚠️ Listings refactor |
| 9–10 | সপ্তাহ ১২–১৪ | Books + services + analytics |
| 11–12 | সপ্তাহ ১৫–১৬ | Jobs + transport + monetization |
| 13 | পরে | Escrow |

মোট: ~৪ মাস part-time, বা ~2–2.5 মাস full-time — যা স্ট্র্যাটেজি ডকুমেন্টের Phase 1–2 এর সাথে মিলে যায়।
