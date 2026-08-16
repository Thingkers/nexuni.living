# nexUni.living — কোথায় আছি, কী বাকি

সর্বশেষ হালনাগাদ: 2026-08-16
এই ফাইলটা পড়লেই বোঝা যাবে প্রজেক্ট কোন অবস্থায় আছে। বাকি সব ডকুমেন্ট এর নিচে।

---

## ১. এক নজরে

| জিনিস | অবস্থা |
|---|---|
| Production database | ৩০টি migration applied, সব registered ✅ |
| `main` branch | Sprint 0 merged (PR #3) ✅ |
| Sprint 0 (P0 security containment) | **শেষ ও deployed** ✅ |
| Round 2 (৪টি নতুন P0 fix) | **লেখা ও review হয়ে গেছে, কোথাও push হয়নি** ⏳ |
| Build / lint | সবুজ — 0 errors, 19 pre-existing warnings ✅ |

**এখন করণীয়:** নিচের §4-এর ৬টা ফাইল repo-তে বসিয়ে commit করা, তারপর `supabase db push`।

---

## ২. ইতিমধ্যে যা শেষ

### Sprint 0 — Emergency Containment (merged, deployed)

`main`-এ আছে, production DB-তে applied। আটটা P0-র মধ্যে পাঁচটা বন্ধ:

- **P0-1** profiles INSERT — client আর `role`/`verification_status`/`is_verified` পাঠাতে পারে না; trigger জোর করে বসায়
- **P0-2** `student-id-cards` bucket private; admin শুধু ৩০০ সেকেন্ডের signed URL দিয়ে দেখে (`/api/admin/student-id-card`)
- **P0-3** `admin_backfill_university_suggestion` — anon-এর EXECUTE কাড়া, body-তে admin guard
- **P0-4** `email`, `student_id`, `bkash_number`, `nagad_number`, `student_id_card_url` — `authenticated`-এর SELECT থেকে বাদ। ভাড়া দেওয়ার জন্য দরকারি নম্বরগুলো এখন `get_booking_payment_details()` দিয়ে আসে, যা শুধু confirmed/active booking-এর ভাড়াটিয়াকে দেয়
- **P0-5** storage policy scoping — `with_check = TRUE` মুছে owner-ভিত্তিক করা, চারটে bucket-এ MIME + size limit

### অন্যান্য

- Migration drift মেরামত — ২৩টি পুরনো migration এখন repo আর DB দুই জায়গায় মেলে
- `student-id-cards` bucket ইচ্ছাকৃতভাবে খালি করা হয়েছে (২০২৬-০৮-০৭)। ছয়জন user-ই আগে থেকে `approved`, তাই কোনো verification হারায়নি — কিন্তু তাদের `student_id_card_url` এখনো পুরনো, অস্তিত্বহীন path দেখায়

---

## ৩. এখন যেখানে আটকে — Round 2

চারটে নতুন migration লেখা হয়েছে, নিজে থেকে adversarial review করা হয়েছে, review-এ পাওয়া ফাঁকটাও বন্ধ করা হয়েছে। **কিন্তু এগুলো `main`-এ নেই, production DB-তেও নেই।**

| # | Migration | কী ঠিক করে |
|---|---|---|
| ১ | `20260807100000_fix_listings_approval_bypass.sql` | যেকোনো student এক REST call-এ নিজের job listing publish করে ফেলতে পারত — approval workflow পুরো অকেজো ছিল |
| ২ | `20260807101000_fix_messages_update_scope.sql` | message-এর প্রাপক প্রেরকের লেখা বদলে দিতে পারত, কোনো চিহ্ন না রেখে |
| ৩ | `20260807102000_reconcile_sprint0_drift.sql` | Sprint 0-এর যে দুটো জিনিস DB-তে কখনো পৌঁছায়নি (`public_profiles` view, একটা revoke) |
| ৪ | `20260807103000_handle_new_user_profile_trigger.sql` | profile তৈরি browser session-নির্ভর ছিল — email verification চালু করার পথ আটকে ছিল এখানেই |

সাথে `src/app/auth/register/page.tsx` — signUp-এ metadata পাঠায়, `insert` → `upsert`, duplicate student ID-তে বোধগম্য বার্তা।

### Review-এর ফল

| Migration | রায় |
|---|---|
| listings approval | PASS (একটা ঐচ্ছিক hardening বাকি — নিচে §6) |
| messages | PASS (review-এ `id` column বাদ পড়েছিল, ঠিক করা হয়েছে) |
| drift reconcile | PASS |
| handle_new_user | PASS (তিনটে caveat, §5) |

যাচাই করা হয়েছে: SQL syntax, বিদ্যমান schema/policy/trigger-এর সাথে সঙ্গতি, purano migration-এর সাথে সংঘর্ষ, idempotency, feature ভাঙার ঝুঁকি, privilege-escalation পথ।

---

## ৪. পরের ধাপ (হাতেকলমে)

১. এই ৬টা ফাইল repo-তে বসান:

```
supabase/migrations/20260807100000_fix_listings_approval_bypass.sql      ← নতুন
supabase/migrations/20260807101000_fix_messages_update_scope.sql         ← নতুন
supabase/migrations/20260807102000_reconcile_sprint0_drift.sql           ← নতুন
supabase/migrations/20260807103000_handle_new_user_profile_trigger.sql   ← নতুন
docs/integration-audit-2026-08-07.md                                     ← নতুন
docs/STATUS.md                                                           ← নতুন (এই ফাইল)
src/app/auth/register/page.tsx                                           ← পুরোটা বদলে দিন
```

`register/page.tsx`-এর যে version দেওয়া হয়েছে সেটা হুবহু `main`-এর version + শুধু এই round-এর পরিবর্তন। নিশ্চিন্তে overwrite করুন।

২. `npm run build && npx eslint .` — সবুজ থাকার কথা

৩. commit + push

৪. `supabase db push`

৫. push-এর পরে যাচাই:

```sql
select to_regclass('public.public_profiles');           -- এখন আর NULL নয়
select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid
where c.relname in ('listings','messages') and not t.tgisinternal;   -- 2
select count(*) from pg_trigger where tgname='on_auth_user_created';  -- 1
```

---

## ৫. যা এখনো খোলা

### P0 / P1 — নিরাপত্তা

| # | সমস্যা | কেন এখনো খোলা |
|---|---|---|
| **P0-8** | `get_email_by_student_id` — anon যে কেউ student ID দিয়ে email বের করতে পারে। বাংলাদেশি student ID ধারাবাহিক, তাই পুরো user base-এর email harvest করা যায় | login page এটা ব্যবহার করে, তাই শুধু revoke করা যায় না। rate-limited server route দরকার |
| **P1** | `anon`-এর হাতে `profiles`-এর ১৭টা column-এ UPDATE grant | RLS এখন আটকাচ্ছে (`auth.uid()` NULL), তাই exploitable নয় — কিন্তু কেউ একটা permissive policy যোগ করলেই খুলে যাবে |
| **P1** | booking-এর `expires_at` ভাড়াটিয়া নিজে বাড়িয়ে নিতে পারে → seat আটকে রাখা | status trigger শুধু status পাহারা দেয় |
| **P1** | email verification বন্ধ | `handle_new_user` অর্ধেক কাজ করেছে; বাকি অর্ধেক — ID card upload-ও session চায়, ওটা post-confirmation ধাপে সরাতে হবে |
| **P1** | roommate profile publish-এ verification আবার যাচাই হয় না | approved অবস্থায় draft বানিয়ে পরে rejected হলেও publish করা যায় |

### Feature gaps

| # | কী নেই | প্রভাব |
|---|---|---|
| **সবচেয়ে সহজ, সবচেয়ে দরকারি** | `roommate_profile_reports`-এর admin review page | button/modal/RLS সব তৈরি — শুধু screen নেই। এখনই ১টা report পড়ে আছে যা কেউ দেখতে পারে না। **কোনো schema বা policy পরিবর্তন লাগবে না** |
| Phase 4 | `rooms`-এ locality picker নেই → ৮টি room-এর একটিতেও `locality_id` নেই → `/areas/*` পাতাগুলো চিরকাল খালি | `profiles`-এ `locality_id` column-ও নেই |
| Phase 5 | roommate profile-এর আলাদা edit page নেই (wizard দিয়েই হয়, কিন্তু "Create" লেখা দেখায়) | |
| §1.2 | ছয়জনের `student_id_card_url` অস্তিত্বহীন path দেখায় | admin panel-এ ছয়টা ভাঙা ছবি |
| §2.6 | ৩০+ redundant RLS policy (bookings-এ ৫টা SELECT, ৪টা INSERT…) | permissive policy OR হয়, তাই ঢিলেটা সবসময় জেতে — review-এর ফাঁদ |

### শুধু আপনিই পারবেন (Dashboard)

- **Leaked password protection চালু করা** (Authentication → Policies) — এখন বন্ধ
- **Email confirmation চালু করা** — কিন্তু ID card upload ঠিক করার **আগে নয়**, নইলে প্রতিটা নতুন student unverifiable হয়ে যাবে

---

## ৬. দুটো সিদ্ধান্ত ঝুলে আছে

**ক) `20260806125000_purge_orphaned_student_id_cards.sql`**
এই ফাইলে `delete from storage.objects` আছে, যা hosted Supabase প্রত্যাখ্যান করে। আপনার existing project-এ version আগেই recorded তাই আর চলবে না — কিন্তু **preview branch বা নতুন staging project** বানালে ওখানে আটকে যাবে। ঠিক করতে পুরনো migration file সম্পাদনা করতে হবে, যা AGENTS.md-এর Hard Rule 3 ভাঙে। তাই নিজে থেকে করা হয়নি।

**খ) `20260807100000`-এর ঐচ্ছিক hardening**
UPDATE-এর সময় moderator check `new.listing_type` পড়ে, `old.listing_type` নয়। এখন RLS আগেই আটকায় বলে exploitable নয়, কিন্তু trigger আর RLS দুটো আলাদা row দেখছে — policy বদলালে ফাঁক হতে পারে।

---

## ৭. অমীমাংসিত branch

`origin/security/sprint-0-fixes`-এ `main`-এর চেয়ে **৩টি বাড়তি commit** আছে (migration idempotency মেরামত), যেগুলো merge হয়নি:

```
f9ac3d2  fix: make migrations idempotent and resolve supabase push issues
3d1bfb1  backup before migration repair
4363f49  fix: make university locality migration idempotent
```

Production DB-তে এই কাজের ফল আছে, কিন্তু `main`-এ নেই। ঠিক করে না নিলে পরের কেউ `main` থেকে fresh deploy করলে আবার সেই সমস্যায় পড়বে।

---

## ৮. কোন ডকুমেন্ট কী

| ফাইল | কী আছে |
|---|---|
| `docs/STATUS.md` | এই ফাইল — সবার আগে এটা |
| `docs/integration-audit-2026-08-07.md` | ৮ phase-এর পূর্ণ audit: schema, RLS, auth, storage, feature gap, প্রস্তাবিত migration-এর before/after |
| `docs/audit-2026-08-06.md` | প্রথম পূর্ণ audit — P0/P1/P2 তালিকা, ১১টি sprint-এর roadmap |
| `docs/sprint-0-security-containment.md` | Sprint 0-তে ঠিক কী বদলেছে, policy diff সহ |
| `docs/playbook.md`, `docs/expansion-strategy.md`, `docs/feature-breakdown.md` | আগের product ডকুমেন্ট |
