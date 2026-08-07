# Sprint 0 — Emergency Security Containment

**Date:** 2026-08-06
**Scope:** the eight P0 findings in `docs/audit-2026-08-06.md` §1, and nothing else.
**Status:** implemented, **not applied to production** — see §7.

> **Decision taken before starting (Option ক):** the `student-id-cards` bucket
> goes private *and* the admin signed-URL flow ships in the same sprint, so
> there is no window where admins cannot verify students.

---

## ১. কী কী ঠিক করা হয়েছে

| ID | Finding | এই sprint-এ | কোথায় |
|---|---|---|---|
| P0-1 | Self-signup দিয়ে admin হওয়া যায় | ✅ Fixed | `20260806120000` + register page |
| P0-2 | ২৫টি Student ID card public | ✅ Fixed | `20260806123000`, `20260806125000`, signed-URL route |
| P0-3 | Unauthenticated mass write to profiles | ✅ Fixed | `20260806121000` |
| P0-4 | সব logged-in user সবার PII পড়তে পারে | ✅ Fixed | `20260806122000` + 2টি page |
| P0-5 | যে কেউ অন্যের listing image মুছতে পারে | ✅ Fixed | `20260806124000` |
| P0-6 | Message forgery (`messages` UPDATE) | ⏸ Sprint 2 | কারণ §6-এ |
| P0-7 | Tenant `expires_at` বাড়াতে পারে | ⏸ Sprint 2 | কারণ §6-এ |
| P0-8 | Student ID → email oracle | ⏸ Sprint 3 | কারণ §6-এ |

Sprint 0-এর সীমা ছিল **"এখনই রক্তক্ষরণ বন্ধ করা"** — অর্থাৎ যেসব গর্ত দিয়ে
এই মুহূর্তে **unauthenticated** বা **যেকোনো signed-in user** সরাসরি data
বের করতে বা লিখতে পারে। P0-6/7/8 তিনটিই বাস্তব ও গুরুতর, কিন্তু তিনটিরই fix
হলো policy পুনর্লিখন — যেটা Sprint 2/3-এর মূল কাজ, এবং যেটা তাড়াহুড়ো করে
করলে নতুন গর্ত তৈরি হওয়ার ঝুঁকি বেশি। বিস্তারিত §6-এ।

---

## ২. Policy Diff — আগে ও পরে

### 2.1 `public.profiles` — grants ও trigger (P0-1, P0-4)

| | আগে | পরে |
|---|---|---|
| **Trigger (INSERT)** | *কিছুই নেই* | `guard_profiles_privileged_fields_insert` → `role='student'`, `verification_status='pending'`, `is_verified=false` force করে |
| **Trigger (UPDATE)** | `guard_profiles_privileged_fields` | **অপরিবর্তিত** |
| **INSERT grant** | `anon`, `authenticated` → সব ১৭ column (`role` সহ) | `anon` → **কিছুই না**; `authenticated` → ১৪ column (`role`/`is_verified`/`verification_status` বাদ) |
| **SELECT grant (`authenticated`)** | সব ১৭ column — `email`, `bkash_number`, `nagad_number`, `student_id`, `student_id_card_url` সহ | ১২ column (anon-এর allowlist-এর সমান) |
| **SELECT grant (`anon`)** | ১২ column | **অপরিবর্তিত** |
| **UPDATE grant** | সব ১৭ column | **অপরিবর্তিত** (কারণ §6.1) |
| **RLS policies** | ৭টি (৩ INSERT, ২ SELECT, ৩ UPDATE, ১ DELETE) | **একটিও পরিবর্তন করা হয়নি** |

> কোনো RLS policy-র text এই sprint-এ পরিবর্তন হয়নি — শুধু grant ও trigger।
> Policy consolidation Sprint 2-এ (Hard Rule 1 মেনে আলাদা approval-এ)।

**নতুন function:** `get_booking_payment_details(uuid)` — SECURITY DEFINER,
caller booking-টির tenant **এবং** status `confirmed`/`active` হলেই owner-এর
payout details ফেরত দেয়, নাহলে শূন্য row।

### 2.2 `storage.objects` — `student-id-cards` (P0-2)

| Policy | আগে | পরে |
|---|---|---|
| `Allow authenticated users to upload id cards` | `INSERT` · with_check `(bucket_id = 'student-id-cards')` | **DROPPED** |
| `Allow users to read own id cards` | `SELECT` · using `(bucket_id = 'student-id-cards')` — নামে "own", কোনো owner check নেই | **DROPPED** |
| `student-id-cards insert: own folder only` | — | `INSERT` · `bucket_id='student-id-cards' AND (storage.foldername(name))[1] = (select auth.uid())::text` |
| `student-id-cards read: owner or admin` | — | `SELECT` · own folder **OR** `profiles.role = 'admin'` |
| UPDATE / DELETE | *কোনো policy নেই* | *ইচ্ছাকৃতভাবে এখনো নেই* — default deny |

**Bucket:**

| | আগে | পরে |
|---|---|---|
| `public` | `true` | **`false`** |
| `file_size_limit` | `NULL` | `5 MB` |
| `allowed_mime_types` | `NULL` | `webp, jpeg, png` |

`room-images`, `avatars`, `content-images` — `public` অপরিবর্তিত (listing photo
ও avatar প্রকাশ্যই থাকার কথা), শুধু একই size/MIME ceiling যোগ হয়েছে।

### 2.3 `storage.objects` — `room-images` ও cross-bucket (P0-5)

| Policy | আগে | পরে |
|---|---|---|
| `Allow authenticated uploads 1l4cebn_0` | `INSERT` · with_check **`TRUE`** — প্রতিটি bucket | **DROPPED** |
| `Authenticated users can upload room images` | `INSERT` · `(bucket_id='room-images')` | **DROPPED** |
| `Authenticated users can update room images` | `UPDATE` · `(bucket_id='room-images')` | **DROPPED** |
| `Authenticated users can delete room images` | `DELETE` · `(bucket_id='room-images')` | **DROPPED** |
| `Give users authenticated access to folder 1ied7ze_0` | `INSERT` · `(bucket_id='room-images' AND auth.role()='authenticated')` | **DROPPED** |
| `Public image read 1ied7ze_0` | `SELECT` · `(bucket_id='room-images')` | **DROPPED** (`Public can view room images`-এর হুবহু নকল) |
| `Public can view room images` | `SELECT` · `(bucket_id='room-images')` | **অপরিবর্তিত** — public listing photo |
| `room-images write: room owner or admin` | — | `ALL` · path-এর প্রথম segment = room id, এবং caller ওই room-এর owner বা admin |

### 2.4 `admin_backfill_university_suggestion` (P0-3)

| | আগে | পরে |
|---|---|---|
| Body | কোনো admin check নেই | `raise exception 'admin only'` guard (sibling function গুলোর হুবহু pattern) |
| `proacl` | `anon=X`, `service_role=X` | `authenticated=X`, `service_role=X` — **anon বাদ** |
| Tracked in git | ❌ শুধু live DB-তে ছিল | ✅ migration `20260806121000` |

---

## ৩. পরিবর্তিত File

### Migration (নতুন, কোনো পুরোনো migration ছোঁয়া হয়নি)

| File | উদ্দেশ্য |
|---|---|
| `20260806120000_guard_profile_privileged_fields_on_insert.sql` | INSERT trigger + column grant দিয়ে self-signup admin escalation বন্ধ (P0-1) |
| `20260806121000_restrict_admin_backfill_university_suggestion.sql` | Anon-callable write RPC-তে admin guard + anon grant revoke (P0-3) |
| `20260806122000_relock_authenticated_sensitive_columns.sql` | `authenticated`-কে public column allowlist-এ নামানো + scoped payment RPC (P0-4) |
| `20260806123000_private_student_id_cards_bucket.sql` | Bucket private, owner-scoped policy, চারটি bucket-এ size/MIME limit (P0-2) |
| `20260806124000_scope_room_images_storage_policies.sql` | Room-image write owner-scoped, cross-bucket blanket upload বন্ধ (P0-5) |
| `20260806125000_purge_orphaned_student_id_cards.sql` | ⚠️ Deleted account-এর ১৯টি ID card মোছা — **irreversible, আলাদা ফাইল যাতে skip করা যায়** |

### Application code

| File | উদ্দেশ্য |
|---|---|
| `src/app/api/admin/student-id-card/route.ts` | **নতুন** — admin-only, rate-limited, batched signed-URL issuer (৫ মিনিট TTL); legacy public URL ও নতুন storage path দুটোই normalize করে |
| `src/app/admin/users/page.tsx` | ID card এখন signed URL থেকে আসে; `unoptimized` দিয়ে Next image cache-এ ID document যাওয়া বন্ধ |
| `src/app/auth/register/page.tsx` | Public URL-এর বদলে storage path সংরক্ষণ, filename random, এবং `role`/`verification_status`/`is_verified` আর client থেকে পাঠায় না |
| `src/app/dashboard/my-bookings/page.tsx` | Owner-এর bKash/Nagad join থেকে সরিয়ে `get_booking_payment_details()` RPC-তে; শুধু confirmed/active booking-এ |
| `src/app/inbox/[userId]/page.tsx` | অপর user-এর `email` select বাদ (revoke-এর পরে পুরো query ব্যর্থ হতো); email notification gate অক্ষত |
| `src/app/api/admin/delete-user/route.ts` | Account delete-এ ID card ও avatar storage থেকেও মোছে — নতুন orphan তৈরি বন্ধ |

### Documentation

| File | উদ্দেশ্য |
|---|---|
| `docs/sprint-0-security-containment.md` | এই ফাইল |
| `docs/audit-2026-08-06.md` | অপরিবর্তিত — Phase 1-এর record হিসেবে যেমন ছিল |

---

## ৪. প্রমাণ (Evidence)

```
$ npx tsc --noEmit
TSC_EXIT=0                                    (কোনো output নেই = কোনো error নেই)

$ npx eslint
✖ 19 problems (0 errors, 19 warnings)         (Sprint 0-এর আগের সাথে অভিন্ন —
                                               কোনো নতুন warning যোগ হয়নি)

$ npm run build:no-data
✓ Compiled successfully in 75s
BUILD_EXIT=0
├ ƒ /api/admin/student-id-card                (নতুন route register হয়েছে)
```

১৯টি warning-ই আগে থেকে ছিল (১৬টি raw `<img>`, ৩টি unused variable) এবং
সবগুলোই Sprint 5/অন্য sprint-এর scope — এই sprint-এ ইচ্ছাকৃতভাবে ছোঁয়া হয়নি।

---

## ৫. Testing Checklist

Migration apply করার পরে এগুলো নিজে চালিয়ে দেখুন। প্রতিটি migration ফাইলের
শেষেও একই verification block কমেন্ট আকারে আছে।

**P0-1 — Privilege escalation**
- [ ] সাধারণ student হিসেবে `POST /rest/v1/profiles` এ `role: "admin"` → **permission denied for column role**
- [ ] স্বাভাবিক registration কাজ করে, নতুন row-তে `role='student'`, `verification_status='pending'`

**P0-2 — ID card**
- [ ] Logged out: `.../object/public/student-id-cards/<uuid>/id-card.webp` → **400/404**
- [ ] Student A, B-র card download → **403**; নিজের card → **200**
- [ ] Admin `/admin/users` → pending user-দের ID card thumbnail দেখা যায়, click করলে বড় হয়
- [ ] ৫ মিনিট পরে ওই signed URL সরাসরি খুললে → **400 expired**
- [ ] নতুন registration → card `<uuid>/<random>.webp` path-এ, `profiles.student_id_card_url`-এ path (URL নয়)
- [ ] পুরোনো row (absolute URL) admin screen-এ এখনো দেখা যায়

**P0-3 — Backfill RPC**
- [ ] Anon key দিয়ে `rpc/admin_backfill_university_suggestion` → **permission denied**
- [ ] Student হিসেবে → **admin only**
- [ ] Admin হিসেবে → আগের মতো row count

**P0-4 — PII**
- [ ] Signed-in user: `?select=email,bkash_number` → **403**
- [ ] Signed-in user: `?select=id,full_name,avatar_url` → **200**
- [ ] `/profile` নিজের সব তথ্য দেখায় (`get_my_profile()`)
- [ ] `/admin/users` আগের মতো (`admin_list_profiles()`)
- [ ] Confirmed booking-এ `/dashboard/my-bookings` bKash/Nagad দেখায়
- [ ] **Pending** booking-এ payment block দেখায় **না**
- [ ] `/inbox/<id>` চ্যাট লোড হয়, message পাঠানো যায়, email notification আসে

**P0-5 — Room images**
- [ ] Owner নিজের room-এ ছবি upload/delete করতে পারে
- [ ] অন্য user ওই path-এ upload/delete → **403**
- [ ] Logged out visitor listing photo দেখতে পায়
- [ ] অন্য bucket-এ blanket upload → **403**

**Regression**
- [ ] Register → login → listing post → booking → chat — পুরো flow অক্ষত

---

## ৬. যা ইচ্ছাকৃতভাবে করা হয়নি, এবং কেন

### 6.1 `profiles` UPDATE column allowlist
`prevent_self_privilege_escalation()` trigger ইতিমধ্যেই UPDATE path-এ
`role`/`is_verified`/`verification_status` আটকায় এবং production-এ প্রমাণিত।
অর্থাৎ **এখানে খোলা কোনো গর্ত নেই**। Column allowlist-এ নামাতে গেলে
profile-edit-এর প্রতিটি field নির্ভুলভাবে গুনতে হবে — বাস্তব breakage ঝুঁকি,
কোনো security লাভ ছাড়াই। Sprint 2-এর RLS rewrite-এর সাথে করাই সঠিক জায়গা।

### 6.2 P0-6 (message forgery) ও P0-7 (booking hold)
দুটোরই fix `messages` ও `bookings`-এর UPDATE policy পুনর্লিখন — আর ওই দুই
table-এ যথাক্রমে ৩টি ও ৪টি duplicate permissive policy আছে (P1-2)। একটিকে
সংকীর্ণ করে বাকিগুলো রেখে দিলে **কিছুই বদলাবে না**, কারণ Postgres সব
permissive policy OR করে। অর্থাৎ সঠিক fix = ওই table-গুলোর policy একসাথে
consolidate করা = Sprint 2-এর সংজ্ঞা। আধা-fix করলে "ঠিক হয়ে গেছে" মনে হবে
অথচ হবে না — সেটাই বেশি বিপজ্জনক।

### 6.3 P0-8 (student ID → email oracle)
Fix-এর জন্য একটি নতুন rate-limited API route + login page পরিবর্তন দরকার,
এবং login error message একরকম করা দরকার (enumeration বন্ধ করতে)। এটি
authentication flow-এর পরিবর্তন — Sprint 3-এর মূল বিষয়, এবং auth flow
এক sprint-এ দুবার ছোঁয়া উচিত নয়।

### 6.4 নতুন finding — Sprint 3-এ যোগ করার জন্য
Sprint 0-এর কাজ করতে গিয়ে দুটো নতুন সমস্যা ধরা পড়েছে, দুটোই scope-এর বাইরে
বলে **ঠিক করা হয়নি**:

- **Duplicate student ID দিয়ে registration সম্ভব।**
  `register/page.tsx:118` `.select('id').eq('student_id', ...)` দিয়ে ডুপ্লিকেট
  চেক করে — কিন্তু `anon`-এর `student_id` column-এ SELECT grant নেই, আর
  Postgres WHERE-clause-এর column-এও privilege চায়। তাই চেকটি **সবসময়
  "পাওয়া যায়নি" বলে** এবং কখনোই কাজ করেনি। ফলে একজন অন্যের student ID দিয়ে
  registration করতে পারে। সঠিক fix: `profiles.student_id`-এ unique
  constraint + একটি rate-limited lookup RPC (P0-8-এর route-এর সাথেই)।
- **`my-bookings`-এর payment join সব status-এ owner-এর bKash number দিত** —
  এটি Sprint 0-এ ঠিক হয়ে গেছে (§2.1), কিন্তু audit-এ আলাদা finding হিসেবে
  ছিল না, তাই এখানে লিপিবদ্ধ করা হলো।

---

## ৭. Deployment ও Rollback

### এখনো apply করা হয়নি
এই sprint-এর কোনো migration **live database-এ চালানো হয়নি**। §2-এর "আগে"
কলামগুলো live DB query থেকে নেওয়া বাস্তব অবস্থা; "পরে" কলামগুলো migration
চালানোর পরে যা হবে। আপনি patch দেখে সন্তুষ্ট হলে:

```bash
git apply <patch>
supabase db push          # 20260806120000 … 20260806124000
# 20260806125000 (purge) আলাদা করে, §7-এর inventory query চালানোর পরে
npm run build && npm run lint
```

### Deployment ক্রম (গুরুত্বপূর্ণ)
Migration আর application code **একসাথে** যেতে হবে। আলাদা করলে:
- শুধু migration আগে গেলে → `/inbox`, `/dashboard/my-bookings`, registration ভাঙবে (revoke করা column এখনো select হচ্ছে)
- শুধু code আগে গেলে → ID card দেখা যাবে না (bucket তখনো public, কিন্তু page signed URL চাইছে)

তাই: **একই deploy-এ push করুন**, অথবা migration আগে চালিয়ে সাথে সাথেই deploy করুন।

### Rollback
`20260806125000` ছাড়া বাকি সবগুলো permission পরিবর্তন, তাই সম্পূর্ণ reversible:

```sql
-- P0-1
drop trigger if exists guard_profiles_privileged_fields_insert on public.profiles;
drop function if exists public.force_profile_defaults_on_insert();
grant insert on public.profiles to anon, authenticated;

-- P0-4
grant select on public.profiles to authenticated;
drop function if exists public.get_booking_payment_details(uuid);

-- P0-2  ⚠️ এটি bucket-কে আবার public করে — শুধু সত্যিকারের জরুরি অবস্থায়
update storage.buckets set public = true where id = 'student-id-cards';

-- P0-3
grant execute on function public.admin_backfill_university_suggestion(text, uuid) to anon;
```
`20260806125000`-এর **কোনো rollback নেই** — তাই আলাদা ফাইলে, এবং চালানোর
আগে inventory query নিয়ে রাখতে বলা হয়েছে।

### Dashboard-এ আপনার নিজের কাজ
1. **Authentication → Password Protection → leaked password protection চালু করুন** (Supabase advisor)। এটি Sprint 3-এর সাথে যুক্ত, কিন্তু এক ক্লিক।
2. `20260806125000` চালানোর পরে **Storage → student-id-cards** থেকে অবশিষ্ট orphan folder গুলো মুছুন — migration `storage.objects` row মোছে (তাতেই object অগম্য হয়ে যায়), কিন্তু blob-এর বাইট reclaim করে না।

---

## ৮. পরবর্তী ধাপ

Sprint 0 এখানেই শেষ। **আমি থামছি এবং আপনার approval-এর জন্য অপেক্ষা করছি।**

Approve করলে **Sprint 1 — Schema Reconciliation**: `supabase db pull` দিয়ে
baseline migration, অনুপস্থিত ১৭টি migration reconcile, এবং CI-তে drift check
— অর্থাৎ P0-4-এর মতো ঘটনা (migration লেখা আছে কিন্তু apply হয়নি, কেউ জানে না)
যাতে আর কখনো না ঘটে।
